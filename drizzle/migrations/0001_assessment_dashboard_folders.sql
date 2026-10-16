CREATE TABLE public.assessment_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX assessment_folders_user_name_uq ON public.assessment_folders(user_id, lower(name));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_folders TO authenticated;
GRANT ALL ON public.assessment_folders TO service_role;
ALTER TABLE public.assessment_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own folders" ON public.assessment_folders
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_assessment_folders_updated BEFORE UPDATE ON public.assessment_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.assessment_batches
  ADD COLUMN folder_id uuid REFERENCES public.assessment_folders(id) ON DELETE SET NULL,
  ADD COLUMN total_marks numeric,
  ADD COLUMN scheme_name text,
  ADD COLUMN instructions text,
  ADD COLUMN last_opened_at timestamptz;
CREATE INDEX assessment_batches_folder_idx ON public.assessment_batches(folder_id);

-- Billing-period aware assessment window. Pro: anchored to subscription period end (30-day cycles).
CREATE OR REPLACE FUNCTION public.assessment_period(_user_id uuid)
RETURNS TABLE(period_start date, resets_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_end timestamptz; v_plan text; v_active boolean;
BEGIN
  SELECT s.current_period_end, s.plan, (s.status='active' AND (s.current_period_end IS NULL OR s.current_period_end > now()))
    INTO v_end, v_plan, v_active FROM public.subscriptions s WHERE s.user_id = _user_id;
  IF coalesce(v_active,false) AND v_plan IN ('pro','pro_monthly') AND v_end IS NOT NULL THEN
    period_start := (v_end - interval '30 days')::date;
    resets_at := v_end;
  ELSE
    period_start := date_trunc('month', now())::date;
    resets_at := (date_trunc('month', now()) + interval '1 month');
  END IF;
  RETURN NEXT;
END; $$;
REVOKE EXECUTE ON FUNCTION public.assessment_period(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_assessment_upload(_user_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_role text := coalesce(auth.role(), '');
  v_plan text := 'free';
  v_sub_active boolean := false;
  v_period date := date_trunc('month', now())::date;
  v_used int := 0;
  v_limit int := 40;
  v_pack int := 0;
  v_free_used int := 0;
  v_free_limit int := 2;
BEGIN
  IF v_caller IS NOT NULL THEN
    _user_id := v_caller;
  ELSIF v_role <> 'service_role' OR _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  END IF;

  SELECT plan, (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
    INTO v_plan, v_sub_active FROM public.subscriptions WHERE user_id = _user_id;
  IF NOT coalesce(v_sub_active,false) THEN v_plan := 'free'; END IF;

  IF v_plan IN ('pro','pro_monthly','standard') THEN
    IF v_plan <> 'standard' THEN
      v_limit := 1000;
      SELECT p.period_start INTO v_period FROM public.assessment_period(_user_id) p;
    END IF;
    INSERT INTO public.monthly_assessment_usage(user_id, period_start, uploads_used)
      VALUES (_user_id, v_period, 0) ON CONFLICT (user_id, period_start) DO NOTHING;
    SELECT uploads_used INTO v_used FROM public.monthly_assessment_usage
      WHERE user_id = _user_id AND period_start = v_period FOR UPDATE;
    SELECT COALESCE(remaining, 0) INTO v_pack FROM public.assessment_credits WHERE user_id = _user_id;
    v_pack := coalesce(v_pack,0);
    IF v_used < v_limit THEN
      UPDATE public.monthly_assessment_usage SET uploads_used = uploads_used + 1
        WHERE user_id = _user_id AND period_start = v_period;
      RETURN jsonb_build_object('allowed', true, 'plan', CASE WHEN v_plan='standard' THEN 'standard' ELSE 'pro' END,
        'monthly_used', v_used + 1, 'monthly_limit', v_limit, 'pack_remaining', v_pack);
    ELSIF v_pack > 0 THEN
      UPDATE public.assessment_credits SET remaining = remaining - 1 WHERE user_id = _user_id AND remaining > 0;
      RETURN jsonb_build_object('allowed', true, 'plan', CASE WHEN v_plan='standard' THEN 'standard' ELSE 'pro' END,
        'monthly_used', v_used, 'monthly_limit', v_limit, 'pack_remaining', v_pack - 1);
    ELSE
      RETURN jsonb_build_object('allowed', false, 'plan', CASE WHEN v_plan='standard' THEN 'standard' ELSE 'pro' END,
        'monthly_used', v_used, 'monthly_limit', v_limit, 'pack_remaining', 0, 'reason', 'monthly_limit_reached');
    END IF;
  END IF;

  INSERT INTO public.monthly_feature_usage(user_id, kind, period_start, count)
    VALUES (_user_id, 'writing', v_period, 0) ON CONFLICT (user_id, kind, period_start) DO NOTHING;
  SELECT count INTO v_free_used FROM public.monthly_feature_usage
    WHERE user_id = _user_id AND kind = 'writing' AND period_start = v_period FOR UPDATE;
  IF v_free_used < v_free_limit THEN
    UPDATE public.monthly_feature_usage SET count = count + 1, updated_at = now()
      WHERE user_id = _user_id AND kind = 'writing' AND period_start = v_period;
    RETURN jsonb_build_object('allowed', true, 'plan', 'free', 'free_used', v_free_used + 1, 'free_limit', v_free_limit);
  END IF;
  RETURN jsonb_build_object('allowed', false, 'plan', 'free', 'free_used', v_free_used,
    'free_limit', v_free_limit, 'reason', 'free_limit_reached');
END;
$function$;

-- Atomically reserve N uploads for a Pro batch (service role only).
CREATE OR REPLACE FUNCTION public.consume_batch_uploads(_user_id uuid, _n int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_period date; v_resets timestamptz; v_used int; v_limit int := 1000;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'forbidden');
  END IF;
  IF _user_id IS NULL OR _n IS NULL OR _n < 1 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_request');
  END IF;
  SELECT p.period_start, p.resets_at INTO v_period, v_resets FROM public.assessment_period(_user_id) p;
  INSERT INTO public.monthly_assessment_usage(user_id, period_start, uploads_used)
    VALUES (_user_id, v_period, 0) ON CONFLICT (user_id, period_start) DO NOTHING;
  UPDATE public.monthly_assessment_usage SET uploads_used = uploads_used + _n
    WHERE user_id = _user_id AND period_start = v_period AND uploads_used + _n <= v_limit
    RETURNING uploads_used INTO v_used;
  IF NOT FOUND THEN
    SELECT uploads_used INTO v_used FROM public.monthly_assessment_usage WHERE user_id = _user_id AND period_start = v_period;
    RETURN jsonb_build_object('allowed', false, 'reason', 'monthly_limit_reached',
      'used', v_used, 'limit', v_limit, 'remaining', greatest(v_limit - v_used, 0), 'resets_at', v_resets);
  END IF;
  RETURN jsonb_build_object('allowed', true, 'used', v_used, 'limit', v_limit,
    'remaining', v_limit - v_used, 'resets_at', v_resets);
END; $$;
REVOKE EXECUTE ON FUNCTION public.consume_batch_uploads(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_batch_uploads(uuid, int) TO service_role;

-- Caller's own quota for the dashboard counter.
CREATE OR REPLACE FUNCTION public.get_my_assessment_quota()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user uuid := auth.uid(); v_plan text := 'free'; v_active boolean := false;
  v_period date; v_resets timestamptz; v_used int := 0; v_limit int; v_pack int := 0;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('plan','free','reason','not_authenticated'); END IF;
  SELECT plan, (status='active' AND (current_period_end IS NULL OR current_period_end > now()))
    INTO v_plan, v_active FROM public.subscriptions WHERE user_id = v_user;
  IF NOT coalesce(v_active,false) THEN v_plan := 'free'; END IF;
  IF v_plan = 'pro_monthly' THEN v_plan := 'pro'; END IF;
  SELECT p.period_start, p.resets_at INTO v_period, v_resets FROM public.assessment_period(v_user) p;
  SELECT coalesce(remaining,0) INTO v_pack FROM public.assessment_credits WHERE user_id = v_user;
  IF v_plan IN ('pro','standard') THEN
    v_limit := CASE WHEN v_plan='pro' THEN 1000 ELSE 40 END;
    SELECT coalesce(uploads_used,0) INTO v_used FROM public.monthly_assessment_usage
      WHERE user_id = v_user AND period_start = v_period;
  ELSE
    v_limit := 2;
    SELECT coalesce(count,0) INTO v_used FROM public.monthly_feature_usage
      WHERE user_id = v_user AND kind='writing' AND period_start = v_period;
  END IF;
  v_used := coalesce(v_used,0);
  RETURN jsonb_build_object('plan', v_plan, 'used', v_used, 'limit', v_limit,
    'remaining', greatest(v_limit - v_used, 0), 'pack_remaining', coalesce(v_pack,0), 'resets_at', v_resets);
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_my_assessment_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_assessment_quota() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_feature_usage(_user_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid(); v_plan text := 'free'; v_active boolean := false;
  v_period date := date_trunc('month', now())::date;
  v_lesson int := 0; v_quiz int := 0; v_writing int := 0;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('plan','free'); END IF;
  SELECT plan, (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
    INTO v_plan, v_active FROM public.subscriptions WHERE user_id = v_user;
  IF NOT COALESCE(v_active,false) THEN v_plan := 'free'; END IF;
  SELECT COALESCE(SUM(count) FILTER (WHERE kind='lesson'), 0),
         COALESCE(SUM(count) FILTER (WHERE kind='quiz'), 0),
         COALESCE(SUM(count) FILTER (WHERE kind='writing'),0)
  INTO v_lesson, v_quiz, v_writing
  FROM public.monthly_feature_usage WHERE user_id = v_user AND period_start = v_period;
  IF v_plan IN ('standard','pro','pro_monthly') THEN
    SELECT COALESCE(uploads_used,0) INTO v_writing FROM public.monthly_assessment_usage
      WHERE user_id = v_user AND period_start = (SELECT p.period_start FROM public.assessment_period(v_user) p);
    v_writing := COALESCE(v_writing,0);
  END IF;
  RETURN jsonb_build_object('plan', v_plan, 'period_start', v_period,
    'lesson', jsonb_build_object('used', v_lesson, 'limit', CASE WHEN v_plan='free' THEN 10 ELSE -1 END),
    'quiz', jsonb_build_object('used', v_quiz, 'limit', CASE WHEN v_plan='free' THEN 10 ELSE -1 END),
    'writing', jsonb_build_object('used', v_writing,
      'limit', CASE WHEN v_plan='free' THEN 2 WHEN v_plan='standard' THEN 40 ELSE 1000 END));
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_batch_aggregates()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE v_batch UUID;
BEGIN
  v_batch := COALESCE(NEW.batch_id, OLD.batch_id);
  UPDATE public.assessment_batches b SET
    completed_count = (SELECT COUNT(*) FROM public.assessment_batch_items WHERE batch_id = v_batch AND status IN ('done','needs_review')),
    failed_count = (SELECT COUNT(*) FROM public.assessment_batch_items WHERE batch_id = v_batch AND status = 'failed'),
    avg_percent = (SELECT AVG(percent) FROM public.assessment_batch_items WHERE batch_id = v_batch AND status IN ('done','needs_review') AND percent IS NOT NULL),
    status = CASE
      WHEN (SELECT COUNT(*) FROM public.assessment_batch_items WHERE batch_id = v_batch AND status IN ('queued','processing')) > 0 THEN 'processing'
      WHEN (SELECT COUNT(*) FROM public.assessment_batch_items WHERE batch_id = v_batch AND status = 'failed') > 0
       AND (SELECT COUNT(*) FROM public.assessment_batch_items WHERE batch_id = v_batch AND status IN ('done','needs_review')) = 0 THEN 'failed'
      ELSE 'completed'
    END
    WHERE b.id = v_batch;
  RETURN NULL;
END; $function$;