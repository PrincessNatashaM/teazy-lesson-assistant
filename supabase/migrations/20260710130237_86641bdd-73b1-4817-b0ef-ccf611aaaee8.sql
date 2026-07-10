
-- Add new payment purpose values for tiered subscriptions and new upload packs
ALTER TYPE public.payment_purpose ADD VALUE IF NOT EXISTS 'sub_standard';
ALTER TYPE public.payment_purpose ADD VALUE IF NOT EXISTS 'sub_pro';
ALTER TYPE public.payment_purpose ADD VALUE IF NOT EXISTS 'assessment_pack_5';
ALTER TYPE public.payment_purpose ADD VALUE IF NOT EXISTS 'assessment_pack_10';
ALTER TYPE public.payment_purpose ADD VALUE IF NOT EXISTS 'assessment_pack_30';

-- Track monthly Writing Assessment quota consumption (Standard plan)
CREATE TABLE IF NOT EXISTS public.monthly_assessment_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  uploads_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_start)
);

GRANT SELECT, INSERT, UPDATE ON public.monthly_assessment_usage TO authenticated;
GRANT ALL ON public.monthly_assessment_usage TO service_role;

ALTER TABLE public.monthly_assessment_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own monthly usage"
  ON public.monthly_assessment_usage FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role writes monthly usage"
  ON public.monthly_assessment_usage FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_monthly_assessment_usage_updated_at
  BEFORE UPDATE ON public.monthly_assessment_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomically consume one Writing Assessment upload:
--   Pro       -> always allowed, no counter change
--   Standard  -> consume from 40/month first, then from assessment_credits.remaining
--   Free      -> consume from usage_counters ('free_assessment') up to 2 lifetime
-- Returns json { allowed, plan, monthly_used, monthly_limit, pack_remaining, free_used, free_limit, reason }
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

  IF v_plan = 'pro' THEN
    RETURN jsonb_build_object('allowed', true, 'plan', 'pro',
      'monthly_used', 0, 'monthly_limit', -1, 'pack_remaining', 0);
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

  -- Free plan: 2 lifetime uploads via usage_counters
  INSERT INTO public.usage_counters(user_id, kind, count)
    VALUES (_user_id, 'free_assessment', 0)
    ON CONFLICT DO NOTHING;
  SELECT count INTO v_free_used FROM public.usage_counters
    WHERE user_id = _user_id AND kind = 'free_assessment';
  IF v_free_used IS NULL THEN v_free_used := 0; END IF;

  IF v_free_used < v_free_limit THEN
    UPDATE public.usage_counters SET count = count + 1
      WHERE user_id = _user_id AND kind = 'free_assessment';
    RETURN jsonb_build_object('allowed', true, 'plan', 'free',
      'free_used', v_free_used + 1, 'free_limit', v_free_limit);
  END IF;

  RETURN jsonb_build_object('allowed', false, 'plan', 'free',
    'free_used', v_free_used, 'free_limit', v_free_limit,
    'reason', 'free_limit_reached');
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_assessment_upload(uuid) TO authenticated, service_role;

-- Read-only status probe used by the UI to render the meter without consuming.
CREATE OR REPLACE FUNCTION public.get_assessment_status(_user_id uuid)
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
  v_pack int := 0;
  v_free_used int := 0;
BEGIN
  SELECT plan, (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
    INTO v_plan, v_sub_active FROM public.subscriptions WHERE user_id = _user_id;
  IF NOT v_sub_active THEN v_plan := 'free'; END IF;

  IF v_plan = 'pro' THEN
    RETURN jsonb_build_object('plan','pro','monthly_used',0,'monthly_limit',-1,'pack_remaining',0);
  END IF;

  SELECT COALESCE(remaining,0) INTO v_pack FROM public.assessment_credits WHERE user_id = _user_id;

  IF v_plan = 'standard' THEN
    SELECT COALESCE(uploads_used,0) INTO v_used FROM public.monthly_assessment_usage
      WHERE user_id = _user_id AND period_start = v_period;
    RETURN jsonb_build_object('plan','standard','monthly_used',COALESCE(v_used,0),
      'monthly_limit',40,'pack_remaining',v_pack);
  END IF;

  SELECT COALESCE(count,0) INTO v_free_used FROM public.usage_counters
    WHERE user_id = _user_id AND kind = 'free_assessment';
  RETURN jsonb_build_object('plan','free','free_used',COALESCE(v_free_used,0),
    'free_limit',2,'pack_remaining',v_pack);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_assessment_status(uuid) TO authenticated, service_role;
