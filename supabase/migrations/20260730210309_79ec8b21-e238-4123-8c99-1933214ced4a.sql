-- 1. Promo codes must not be enumerable by users
DROP POLICY IF EXISTS "Authenticated read active promo codes" ON public.promo_codes;
REVOKE SELECT ON public.promo_codes FROM authenticated;
REVOKE SELECT ON public.promo_codes FROM anon;
GRANT ALL ON public.promo_codes TO service_role;

-- 2. Deduplicate then enforce one redemption per (promo, user)
DELETE FROM public.promo_redemptions a
USING public.promo_redemptions b
WHERE a.ctid < b.ctid
  AND a.promo_code_id = b.promo_code_id
  AND a.user_id = b.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS promo_redemptions_code_user_uniq
  ON public.promo_redemptions (promo_code_id, user_id);

-- 3. Quota RPCs: derive identity from auth.uid(); service_role may act for a user
CREATE OR REPLACE FUNCTION public.consume_assessment_upload(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  ELSIF v_role <> 'service_role' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  ELSIF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  END IF;

  SELECT plan, (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
    INTO v_plan, v_sub_active
    FROM public.subscriptions WHERE user_id = _user_id;
  IF NOT v_sub_active THEN v_plan := 'free'; END IF;

  IF v_plan = 'pro' OR v_plan = 'pro_monthly' THEN
    INSERT INTO public.monthly_assessment_usage(user_id, period_start, uploads_used)
      VALUES (_user_id, v_period, 0)
      ON CONFLICT (user_id, period_start) DO NOTHING;
    SELECT uploads_used INTO v_used FROM public.monthly_assessment_usage
      WHERE user_id = _user_id AND period_start = v_period FOR UPDATE;
    SELECT COALESCE(remaining, 0) INTO v_pack FROM public.assessment_credits WHERE user_id = _user_id;

    IF v_used < 200 THEN
      UPDATE public.monthly_assessment_usage SET uploads_used = uploads_used + 1
        WHERE user_id = _user_id AND period_start = v_period;
      RETURN jsonb_build_object('allowed', true, 'plan', 'pro',
        'monthly_used', v_used + 1, 'monthly_limit', 200, 'pack_remaining', v_pack);
    ELSIF v_pack > 0 THEN
      UPDATE public.assessment_credits SET remaining = remaining - 1 WHERE user_id = _user_id AND remaining > 0;
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
      WHERE user_id = _user_id AND period_start = v_period FOR UPDATE;
    SELECT COALESCE(remaining, 0) INTO v_pack FROM public.assessment_credits WHERE user_id = _user_id;

    IF v_used < v_limit THEN
      UPDATE public.monthly_assessment_usage SET uploads_used = uploads_used + 1
        WHERE user_id = _user_id AND period_start = v_period;
      RETURN jsonb_build_object('allowed', true, 'plan', 'standard',
        'monthly_used', v_used + 1, 'monthly_limit', v_limit, 'pack_remaining', v_pack);
    ELSIF v_pack > 0 THEN
      UPDATE public.assessment_credits SET remaining = remaining - 1 WHERE user_id = _user_id AND remaining > 0;
      RETURN jsonb_build_object('allowed', true, 'plan', 'standard',
        'monthly_used', v_used, 'monthly_limit', v_limit, 'pack_remaining', v_pack - 1);
    ELSE
      RETURN jsonb_build_object('allowed', false, 'plan', 'standard',
        'monthly_used', v_used, 'monthly_limit', v_limit, 'pack_remaining', 0,
        'reason', 'monthly_limit_reached');
    END IF;
  END IF;

  INSERT INTO public.monthly_feature_usage(user_id, kind, period_start, count)
    VALUES (_user_id, 'writing', v_period, 0)
    ON CONFLICT (user_id, kind, period_start) DO NOTHING;
  SELECT count INTO v_free_used FROM public.monthly_feature_usage
    WHERE user_id = _user_id AND kind = 'writing' AND period_start = v_period FOR UPDATE;

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
$function$;

CREATE OR REPLACE FUNCTION public.get_assessment_status(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_role text := coalesce(auth.role(), '');
  v_plan text := 'free';
  v_sub_active boolean := false;
  v_period date := date_trunc('month', now())::date;
  v_used int := 0;
  v_pack int := 0;
  v_free_used int := 0;
BEGIN
  IF v_caller IS NOT NULL THEN
    _user_id := v_caller;
  ELSIF v_role <> 'service_role' OR _user_id IS NULL THEN
    RETURN jsonb_build_object('plan', 'free', 'reason', 'not_authenticated');
  END IF;

  SELECT plan, (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
    INTO v_plan, v_sub_active FROM public.subscriptions WHERE user_id = _user_id;
  IF NOT v_sub_active THEN v_plan := 'free'; END IF;

  SELECT COALESCE(remaining,0) INTO v_pack FROM public.assessment_credits WHERE user_id = _user_id;

  IF v_plan = 'pro' OR v_plan = 'pro_monthly' THEN
    SELECT COALESCE(uploads_used,0) INTO v_used FROM public.monthly_assessment_usage
      WHERE user_id = _user_id AND period_start = v_period;
    RETURN jsonb_build_object('plan','pro','monthly_used',COALESCE(v_used,0),
      'monthly_limit',200,'pack_remaining',v_pack);
  END IF;

  IF v_plan = 'standard' THEN
    SELECT COALESCE(uploads_used,0) INTO v_used FROM public.monthly_assessment_usage
      WHERE user_id = _user_id AND period_start = v_period;
    RETURN jsonb_build_object('plan','standard','monthly_used',COALESCE(v_used,0),
      'monthly_limit',40,'pack_remaining',v_pack);
  END IF;

  SELECT COALESCE(count,0) INTO v_free_used FROM public.monthly_feature_usage
    WHERE user_id = _user_id AND kind = 'writing' AND period_start = v_period;
  RETURN jsonb_build_object('plan','free','free_used',COALESCE(v_free_used,0),
    'free_limit',2,'pack_remaining',v_pack);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.consume_assessment_upload(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_assessment_status(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_feature_usage(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_feature_usage(uuid) FROM anon;

-- 4. Atomic, audited free promo redemption (service_role only)
CREATE OR REPLACE FUNCTION public.redeem_free_promo(_user_id uuid, _code text, _purpose text, _lesson_hash text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_promo public.promo_codes%ROWTYPE;
  v_days int := 30;
  v_plan text;
  v_add int := 0;
  v_ref text;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'forbidden');
  END IF;
  IF _user_id IS NULL OR _code IS NULL OR _purpose IS NULL THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'invalid_request');
  END IF;

  SELECT * INTO v_promo FROM public.promo_codes
    WHERE code = upper(_code) FOR UPDATE;

  IF NOT FOUND OR NOT v_promo.active THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'invalid_code');
  END IF;
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'expired');
  END IF;
  IF v_promo.max_uses IS NOT NULL AND v_promo.used_count >= v_promo.max_uses THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'fully_redeemed');
  END IF;
  IF NOT (_purpose = ANY (v_promo.applies_to)) THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'not_applicable');
  END IF;
  IF EXISTS (SELECT 1 FROM public.promo_redemptions
             WHERE promo_code_id = v_promo.id AND user_id = _user_id) THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'already_redeemed');
  END IF;

  INSERT INTO public.promo_redemptions(promo_code_id, user_id, purpose, feature_unlocked)
    VALUES (v_promo.id, _user_id, _purpose::public.payment_purpose, _purpose);

  UPDATE public.promo_codes SET used_count = used_count + 1, updated_at = now()
    WHERE id = v_promo.id;

  v_ref := 'promo_' || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.payments(user_id, paystack_reference, amount_minor, currency,
                              purpose, lesson_hash, promo_code_id, status, metadata)
    VALUES (_user_id, v_ref, 0, 'NGN', _purpose::public.payment_purpose, _lesson_hash,
            v_promo.id, 'success'::public.payment_status,
            jsonb_build_object('free_promo', true, 'promo_kind', v_promo.kind));

  IF _purpose IN ('sub_standard','sub_pro','subscription') THEN
    IF v_promo.kind = 'pro_days' THEN v_days := GREATEST(1, v_promo.value::int); END IF;
    v_plan := CASE WHEN _purpose = 'sub_standard' THEN 'standard' ELSE 'pro' END;
    INSERT INTO public.subscriptions(user_id, status, plan, current_period_end)
      VALUES (_user_id, 'active'::public.subscription_status, v_plan, now() + (v_days || ' days')::interval)
      ON CONFLICT (user_id) DO UPDATE
        SET status = 'active'::public.subscription_status,
            plan = EXCLUDED.plan,
            current_period_end = GREATEST(coalesce(public.subscriptions.current_period_end, now()), now()) + (v_days || ' days')::interval,
            updated_at = now();
  ELSE
    v_add := CASE _purpose
      WHEN 'assessment_pack_5' THEN 5
      WHEN 'assessment_pack_10' THEN 10
      WHEN 'assessment_pack_30' THEN 30
      WHEN 'assessment_pack_500' THEN 500
      WHEN 'assessment_pack_6' THEN 6
      WHEN 'assessment_pack_11' THEN 11
      ELSE 0 END;
    IF v_add > 0 THEN
      INSERT INTO public.assessment_credits(user_id, remaining) VALUES (_user_id, v_add)
        ON CONFLICT (user_id) DO UPDATE SET remaining = public.assessment_credits.remaining + v_add, updated_at = now();
    ELSIF _lesson_hash IS NOT NULL THEN
      INSERT INTO public.entitlements(user_id, lesson_hash, kind)
        VALUES (_user_id, _lesson_hash, _purpose)
        ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF v_promo.kind = 'bonus_assessments' THEN
    INSERT INTO public.assessment_credits(user_id, remaining) VALUES (_user_id, v_promo.value::int)
      ON CONFLICT (user_id) DO UPDATE SET remaining = public.assessment_credits.remaining + v_promo.value::int, updated_at = now();
  END IF;

  RETURN jsonb_build_object('granted', true, 'promo_id', v_promo.id, 'reference', v_ref);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('granted', false, 'reason', 'already_redeemed');
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.redeem_free_promo(uuid, text, text, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.redeem_free_promo(uuid, text, text, text) TO service_role;