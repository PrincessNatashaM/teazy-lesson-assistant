
CREATE OR REPLACE FUNCTION public.consume_feature_usage(_user_id uuid, _kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_plan text := 'free';
  v_active boolean := false;
  v_period date := date_trunc('month', now())::date;
  v_used int := 0;
  v_limit int;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  END IF;
  IF _kind NOT IN ('lesson','quiz','writing') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_kind');
  END IF;

  SELECT plan,
         (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
    INTO v_plan, v_active
    FROM public.subscriptions WHERE user_id = v_user;
  IF NOT COALESCE(v_active,false) THEN v_plan := 'free'; END IF;

  IF v_plan IN ('standard','pro','pro_monthly') AND _kind IN ('lesson','quiz') THEN
    RETURN jsonb_build_object('allowed', true, 'plan', v_plan, 'used', 0, 'limit', -1);
  END IF;

  v_limit := CASE _kind
    WHEN 'lesson'  THEN 10
    WHEN 'quiz'    THEN 10
    WHEN 'writing' THEN 2
  END;

  INSERT INTO public.monthly_feature_usage(user_id, kind, period_start, count)
    VALUES (v_user, _kind, v_period, 0)
    ON CONFLICT (user_id, kind, period_start) DO NOTHING;

  SELECT count INTO v_used FROM public.monthly_feature_usage
    WHERE user_id = v_user AND kind = _kind AND period_start = v_period;

  IF v_used >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false, 'plan', 'free',
      'used', v_used, 'limit', v_limit,
      'reason', 'monthly_limit_reached'
    );
  END IF;

  UPDATE public.monthly_feature_usage
    SET count = count + 1, updated_at = now()
    WHERE user_id = v_user AND kind = _kind AND period_start = v_period;

  RETURN jsonb_build_object(
    'allowed', true, 'plan', 'free',
    'used', v_used + 1, 'limit', v_limit
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_feature_usage(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_plan text := 'free';
  v_active boolean := false;
  v_period date := date_trunc('month', now())::date;
  v_lesson int := 0;
  v_quiz int := 0;
  v_writing int := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('plan','free');
  END IF;

  SELECT plan,
         (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
    INTO v_plan, v_active
    FROM public.subscriptions WHERE user_id = v_user;
  IF NOT COALESCE(v_active,false) THEN v_plan := 'free'; END IF;

  SELECT
    COALESCE(SUM(count) FILTER (WHERE kind='lesson'), 0),
    COALESCE(SUM(count) FILTER (WHERE kind='quiz'),   0),
    COALESCE(SUM(count) FILTER (WHERE kind='writing'),0)
  INTO v_lesson, v_quiz, v_writing
  FROM public.monthly_feature_usage
  WHERE user_id = v_user AND period_start = v_period;

  RETURN jsonb_build_object(
    'plan', v_plan,
    'period_start', v_period,
    'lesson',  jsonb_build_object('used', v_lesson,  'limit', CASE WHEN v_plan='free' THEN 10 ELSE -1 END),
    'quiz',    jsonb_build_object('used', v_quiz,    'limit', CASE WHEN v_plan='free' THEN 10 ELSE -1 END),
    'writing', jsonb_build_object(
      'used',  v_writing,
      'limit', CASE WHEN v_plan='free' THEN 2
                    WHEN v_plan='standard' THEN 40
                    ELSE 200 END
    )
  );
END;
$$;
