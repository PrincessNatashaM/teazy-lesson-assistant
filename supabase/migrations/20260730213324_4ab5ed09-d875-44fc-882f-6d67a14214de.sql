-- 1. Abuse-protection rate limit store (technical guard, not a commercial quota)
CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  user_id uuid NOT NULL,
  bucket text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bucket)
);

GRANT ALL ON public.edge_rate_limits TO service_role;
ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages rate limits"
  ON public.edge_rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.consume_rate_limit(_user_id uuid, _bucket text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limit int;
  v_window int;
  v_count int;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'forbidden');
  END IF;
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  END IF;

  -- Server-defined technical abuse guards only.
  IF _bucket = 'ocr' THEN
    v_limit := 60; v_window := 3600;
  ELSIF _bucket = 'lesson_images' THEN
    v_limit := 20; v_window := 3600;
  ELSE
    RETURN jsonb_build_object('allowed', false, 'reason', 'unknown_bucket');
  END IF;

  INSERT INTO public.edge_rate_limits(user_id, bucket, window_start, count)
    VALUES (_user_id, _bucket, now(), 0)
    ON CONFLICT (user_id, bucket) DO NOTHING;

  UPDATE public.edge_rate_limits
    SET count = CASE WHEN window_start <= now() - make_interval(secs => v_window) THEN 1 ELSE count + 1 END,
        window_start = CASE WHEN window_start <= now() - make_interval(secs => v_window) THEN now() ELSE window_start END,
        updated_at = now()
    WHERE user_id = _user_id AND bucket = _bucket
      AND (window_start <= now() - make_interval(secs => v_window) OR count < v_limit)
    RETURNING count INTO v_count;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'rate_limited',
      'limit', v_limit, 'window_seconds', v_window);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'used', v_count,
    'limit', v_limit, 'window_seconds', v_window);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(uuid, text) TO service_role;

-- 2. Atomic, plan-aware feature usage consumption
CREATE OR REPLACE FUNCTION public.consume_feature_usage(_user_id uuid, _kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  IF _kind NOT IN ('lesson','quiz','writing') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_kind');
  END IF;

  -- Writing assessments (typed submissions and uploaded scripts) share one
  -- plan-aware allowance: free 2, standard 40, pro 200 (+ purchased packs).
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

  SELECT plan,
         (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
    INTO v_plan, v_active
    FROM public.subscriptions WHERE user_id = v_user;
  IF NOT COALESCE(v_active,false) THEN v_plan := 'free'; END IF;

  IF v_plan IN ('standard','pro','pro_monthly') THEN
    RETURN jsonb_build_object('allowed', true, 'plan', v_plan, 'used', 0, 'limit', -1);
  END IF;

  v_limit := 10;

  INSERT INTO public.monthly_feature_usage(user_id, kind, period_start, count)
    VALUES (v_user, _kind, v_period, 0)
    ON CONFLICT (user_id, kind, period_start) DO NOTHING;

  -- Atomic conditional increment: concurrent callers cannot exceed the limit.
  UPDATE public.monthly_feature_usage
    SET count = count + 1, updated_at = now()
    WHERE user_id = v_user AND kind = _kind AND period_start = v_period
      AND count < v_limit
    RETURNING count INTO v_used;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'plan', 'free',
      'used', v_limit, 'limit', v_limit, 'reason', 'monthly_limit_reached');
  END IF;

  RETURN jsonb_build_object('allowed', true, 'plan', 'free',
    'used', v_used, 'limit', v_limit);
END;
$$;