
-- 1) Monthly usage table
CREATE TABLE IF NOT EXISTS public.monthly_feature_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('lesson','quiz','writing')),
  period_start date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, period_start)
);

GRANT SELECT ON public.monthly_feature_usage TO authenticated;
GRANT ALL    ON public.monthly_feature_usage TO service_role;

ALTER TABLE public.monthly_feature_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own monthly usage" ON public.monthly_feature_usage;
CREATE POLICY "read own monthly usage"
  ON public.monthly_feature_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_monthly_feature_usage_updated_at ON public.monthly_feature_usage;
CREATE TRIGGER trg_monthly_feature_usage_updated_at
  BEFORE UPDATE ON public.monthly_feature_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Consume + enforce
CREATE OR REPLACE FUNCTION public.consume_feature_usage(_user_id uuid, _kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text := 'free';
  v_active boolean := false;
  v_period date := date_trunc('month', now())::date;
  v_used int := 0;
  v_limit int;
BEGIN
  IF _kind NOT IN ('lesson','quiz','writing') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_kind');
  END IF;

  SELECT plan,
         (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
    INTO v_plan, v_active
    FROM public.subscriptions WHERE user_id = _user_id;
  IF NOT COALESCE(v_active,false) THEN v_plan := 'free'; END IF;

  -- Paid plans: lesson & quiz unlimited
  IF v_plan IN ('standard','pro','pro_monthly') AND _kind IN ('lesson','quiz') THEN
    RETURN jsonb_build_object('allowed', true, 'plan', v_plan, 'used', 0, 'limit', -1);
  END IF;

  -- Writing on paid plans is handled by consume_assessment_upload — this RPC
  -- is only invoked for writing when the caller wants the free-plan path.
  v_limit := CASE _kind
    WHEN 'lesson'  THEN 10
    WHEN 'quiz'    THEN 10
    WHEN 'writing' THEN 2
  END;

  INSERT INTO public.monthly_feature_usage(user_id, kind, period_start, count)
    VALUES (_user_id, _kind, v_period, 0)
    ON CONFLICT (user_id, kind, period_start) DO NOTHING;

  SELECT count INTO v_used FROM public.monthly_feature_usage
    WHERE user_id = _user_id AND kind = _kind AND period_start = v_period;

  IF v_used >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false, 'plan', 'free',
      'used', v_used, 'limit', v_limit,
      'reason', 'monthly_limit_reached'
    );
  END IF;

  UPDATE public.monthly_feature_usage
    SET count = count + 1, updated_at = now()
    WHERE user_id = _user_id AND kind = _kind AND period_start = v_period;

  RETURN jsonb_build_object(
    'allowed', true, 'plan', 'free',
    'used', v_used + 1, 'limit', v_limit
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_feature_usage(uuid, text)
  TO authenticated, service_role;

-- 3) Read-only summary for the usage tracker
CREATE OR REPLACE FUNCTION public.get_feature_usage(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text := 'free';
  v_active boolean := false;
  v_period date := date_trunc('month', now())::date;
  v_lesson int := 0;
  v_quiz int := 0;
  v_writing int := 0;
BEGIN
  SELECT plan,
         (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
    INTO v_plan, v_active
    FROM public.subscriptions WHERE user_id = _user_id;
  IF NOT COALESCE(v_active,false) THEN v_plan := 'free'; END IF;

  SELECT
    COALESCE(SUM(count) FILTER (WHERE kind='lesson'), 0),
    COALESCE(SUM(count) FILTER (WHERE kind='quiz'),   0),
    COALESCE(SUM(count) FILTER (WHERE kind='writing'),0)
  INTO v_lesson, v_quiz, v_writing
  FROM public.monthly_feature_usage
  WHERE user_id = _user_id AND period_start = v_period;

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

GRANT EXECUTE ON FUNCTION public.get_feature_usage(uuid)
  TO authenticated, service_role;

-- 4) Update writing free branch to monthly (was lifetime via usage_counters)
CREATE OR REPLACE FUNCTION public.consume_assessment_upload(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text := 'free';
  v_sub_active boolean := false;
  v_period date := date_trunc('month', now())::date;
  v_used int := 0;
  v_limit int := 40;
  v_pack int := 0;
  v_free_used int := 0;
  v_free_limit int := 2;
BEGIN
  SELECT plan, (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
    INTO v_plan, v_sub_active
    FROM public.subscriptions WHERE user_id = _user_id;
  IF NOT v_sub_active THEN v_plan := 'free'; END IF;

  IF v_plan = 'pro' OR v_plan = 'pro_monthly' THEN
    -- Assessment Pro: 200 uploads/month enforced here
    INSERT INTO public.monthly_assessment_usage(user_id, period_start, uploads_used)
      VALUES (_user_id, v_period, 0)
      ON CONFLICT (user_id, period_start) DO NOTHING;
    SELECT uploads_used INTO v_used FROM public.monthly_assessment_usage
      WHERE user_id = _user_id AND period_start = v_period;
    SELECT COALESCE(remaining, 0) INTO v_pack FROM public.assessment_credits WHERE user_id = _user_id;

    IF v_used < 200 THEN
      UPDATE public.monthly_assessment_usage SET uploads_used = uploads_used + 1
        WHERE user_id = _user_id AND period_start = v_period;
      RETURN jsonb_build_object('allowed', true, 'plan', 'pro',
        'monthly_used', v_used + 1, 'monthly_limit', 200, 'pack_remaining', v_pack);
    ELSIF v_pack > 0 THEN
      UPDATE public.assessment_credits SET remaining = remaining - 1 WHERE user_id = _user_id;
      RETURN jsonb_build_object('allowed', true, 'plan', 'pro',
        'monthly_used', v_used, 'monthly_limit', 200, 'pack_remaining', v_pack - 1);
    ELSE
      RETURN jsonb_build_object('allowed', false, 'plan', 'pro',
        'monthly_used', v_used, 'monthly_limit', 200, 'pack_remaining', 0,
        'reason', 'monthly_limit_reached');
    END IF;
  END IF;

  IF v_plan = 'standard' THEN
    INSERT INTO public.monthly_assessment_usage(user_id, period_start, uploads_used)
      VALUES (_user_id, v_period, 0)
      ON CONFLICT (user_id, period_start) DO NOTHING;
    SELECT uploads_used INTO v_used FROM public.monthly_assessment_usage
      WHERE user_id = _user_id AND period_start = v_period;
    SELECT COALESCE(remaining, 0) INTO v_pack FROM public.assessment_credits WHERE user_id = _user_id;

    IF v_used < v_limit THEN
      UPDATE public.monthly_assessment_usage SET uploads_used = uploads_used + 1
        WHERE user_id = _user_id AND period_start = v_period;
      RETURN jsonb_build_object('allowed', true, 'plan', 'standard',
        'monthly_used', v_used + 1, 'monthly_limit', v_limit, 'pack_remaining', v_pack);
    ELSIF v_pack > 0 THEN
      UPDATE public.assessment_credits SET remaining = remaining - 1 WHERE user_id = _user_id;
      RETURN jsonb_build_object('allowed', true, 'plan', 'standard',
        'monthly_used', v_used, 'monthly_limit', v_limit, 'pack_remaining', v_pack - 1);
    ELSE
      RETURN jsonb_build_object('allowed', false, 'plan', 'standard',
        'monthly_used', v_used, 'monthly_limit', v_limit, 'pack_remaining', 0,
        'reason', 'monthly_limit_reached');
    END IF;
  END IF;

  -- Free plan: 2 uploads/month via monthly_feature_usage (was lifetime)
  INSERT INTO public.monthly_feature_usage(user_id, kind, period_start, count)
    VALUES (_user_id, 'writing', v_period, 0)
    ON CONFLICT (user_id, kind, period_start) DO NOTHING;
  SELECT count INTO v_free_used FROM public.monthly_feature_usage
    WHERE user_id = _user_id AND kind = 'writing' AND period_start = v_period;

  IF v_free_used < v_free_limit THEN
    UPDATE public.monthly_feature_usage
      SET count = count + 1, updated_at = now()
      WHERE user_id = _user_id AND kind = 'writing' AND period_start = v_period;
    RETURN jsonb_build_object('allowed', true, 'plan', 'free',
      'free_used', v_free_used + 1, 'free_limit', v_free_limit);
  END IF;

  RETURN jsonb_build_object('allowed', false, 'plan', 'free',
    'free_used', v_free_used, 'free_limit', v_free_limit,
    'reason', 'free_limit_reached');
END;
$$;
