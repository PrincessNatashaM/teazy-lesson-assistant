CREATE TABLE public.video_credits (
  user_id uuid PRIMARY KEY,
  remaining int NOT NULL DEFAULT 0 CHECK (remaining >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.video_credits TO authenticated;
GRANT ALL ON public.video_credits TO service_role;
ALTER TABLE public.video_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own video credits" ON public.video_credits FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.grant_video_credits(_user_id uuid, _n int)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.video_credits(user_id, remaining) VALUES (_user_id, greatest(_n,0))
  ON CONFLICT (user_id) DO UPDATE SET remaining = public.video_credits.remaining + greatest(_n,0), updated_at = now();
$$;
REVOKE EXECUTE ON FUNCTION public.grant_video_credits(uuid,int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_video_credits(uuid,int) TO service_role;

CREATE OR REPLACE FUNCTION public.feature_limit(_plan text, _kind text)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _plan = 'free' THEN CASE _kind WHEN 'lesson' THEN 10 WHEN 'quiz' THEN 10
      WHEN 'worksheet' THEN 2 WHEN 'slides' THEN 2 WHEN 'video' THEN 1 ELSE 0 END
    ELSE CASE _kind WHEN 'video' THEN 20 ELSE -1 END
  END;
$$;

CREATE OR REPLACE FUNCTION public.consume_feature_usage(_user_id uuid, _kind text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_plan text := 'free';
  v_active boolean := false;
  v_period date := date_trunc('month', now())::date;
  v_used int := 0;
  v_limit int;
  v_assess jsonb;
BEGIN
  IF v_user IS NULL THEN
    IF coalesce(auth.role(),'') = 'service_role' AND _user_id IS NOT NULL THEN
      v_user := _user_id;
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
    END IF;
  END IF;

  IF _kind NOT IN ('lesson','quiz','writing','worksheet','slides','video') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_kind');
  END IF;

  IF _kind = 'writing' THEN
    v_assess := public.consume_assessment_upload(v_user);
    RETURN jsonb_build_object(
      'allowed', coalesce((v_assess->>'allowed')::boolean, false),
      'plan', coalesce(v_assess->>'plan', 'free'),
      'used', COALESCE((v_assess->>'monthly_used')::int, (v_assess->>'free_used')::int, 0),
      'limit', COALESCE((v_assess->>'monthly_limit')::int, (v_assess->>'free_limit')::int, 2),
      'reason', v_assess->>'reason'
    );
  END IF;

  SELECT plan, (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
    INTO v_plan, v_active FROM public.subscriptions WHERE user_id = v_user;
  IF NOT COALESCE(v_active,false) THEN v_plan := 'free'; END IF;
  IF v_plan NOT IN ('standard','pro','pro_monthly') THEN v_plan := 'free'; END IF;

  v_limit := public.feature_limit(v_plan, _kind);
  IF v_limit = -1 THEN
    RETURN jsonb_build_object('allowed', true, 'plan', v_plan, 'used', 0, 'limit', -1);
  END IF;

  INSERT INTO public.monthly_feature_usage(user_id, kind, period_start, count)
    VALUES (v_user, _kind, v_period, 0)
    ON CONFLICT (user_id, kind, period_start) DO NOTHING;

  UPDATE public.monthly_feature_usage
    SET count = count + 1, updated_at = now()
    WHERE user_id = v_user AND kind = _kind AND period_start = v_period AND count < v_limit
    RETURNING count INTO v_used;

  IF NOT FOUND THEN
    -- Paid video top-ups (purchased packs) are used once the monthly allowance is exhausted.
    IF _kind = 'video' AND v_plan <> 'free' THEN
      UPDATE public.video_credits SET remaining = remaining - 1, updated_at = now()
        WHERE user_id = v_user AND remaining > 0;
      IF FOUND THEN
        RETURN jsonb_build_object('allowed', true, 'plan', v_plan, 'used', v_limit, 'limit', v_limit, 'source', 'credit');
      END IF;
      RETURN jsonb_build_object('allowed', false, 'plan', v_plan, 'used', v_limit, 'limit', v_limit, 'reason', 'video_limit_reached');
    END IF;
    RETURN jsonb_build_object('allowed', false, 'plan', v_plan,
      'used', v_limit, 'limit', v_limit, 'reason', 'monthly_limit_reached');
  END IF;

  RETURN jsonb_build_object('allowed', true, 'plan', v_plan, 'used', v_used, 'limit', v_limit);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_feature_usage(_user_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid(); v_plan text := 'free'; v_active boolean := false;
  v_period date := date_trunc('month', now())::date;
  v_lesson int := 0; v_quiz int := 0; v_writing int := 0;
  v_ws int := 0; v_sl int := 0; v_vid int := 0; v_credits int := 0; p text;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('plan','free'); END IF;
  SELECT plan, (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
    INTO v_plan, v_active FROM public.subscriptions WHERE user_id = v_user;
  IF NOT COALESCE(v_active,false) THEN v_plan := 'free'; END IF;
  p := CASE WHEN v_plan IN ('standard','pro','pro_monthly') THEN v_plan ELSE 'free' END;
  SELECT COALESCE(SUM(count) FILTER (WHERE kind='lesson'), 0),
         COALESCE(SUM(count) FILTER (WHERE kind='quiz'), 0),
         COALESCE(SUM(count) FILTER (WHERE kind='writing'),0),
         COALESCE(SUM(count) FILTER (WHERE kind='worksheet'),0),
         COALESCE(SUM(count) FILTER (WHERE kind='slides'),0),
         COALESCE(SUM(count) FILTER (WHERE kind='video'),0)
  INTO v_lesson, v_quiz, v_writing, v_ws, v_sl, v_vid
  FROM public.monthly_feature_usage WHERE user_id = v_user AND period_start = v_period;
  SELECT COALESCE(remaining,0) INTO v_credits FROM public.video_credits WHERE user_id = v_user;
  IF p <> 'free' THEN
    SELECT COALESCE(uploads_used,0) INTO v_writing FROM public.monthly_assessment_usage
      WHERE user_id = v_user AND period_start = (SELECT x.period_start FROM public.assessment_period(v_user) x);
    v_writing := COALESCE(v_writing,0);
  END IF;
  RETURN jsonb_build_object('plan', v_plan, 'period_start', v_period,
    'lesson', jsonb_build_object('used', v_lesson, 'limit', public.feature_limit(p,'lesson')),
    'quiz', jsonb_build_object('used', v_quiz, 'limit', public.feature_limit(p,'quiz')),
    'worksheet', jsonb_build_object('used', v_ws, 'limit', public.feature_limit(p,'worksheet')),
    'slides', jsonb_build_object('used', v_sl, 'limit', public.feature_limit(p,'slides')),
    'video', jsonb_build_object('used', v_vid, 'limit', public.feature_limit(p,'video'), 'credits', COALESCE(v_credits,0)),
    'writing', jsonb_build_object('used', v_writing,
      'limit', CASE WHEN p='free' THEN 2 WHEN p='standard' THEN 40 ELSE 1000 END));
END;
$function$;