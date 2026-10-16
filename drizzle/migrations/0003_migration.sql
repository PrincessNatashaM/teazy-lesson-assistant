CREATE TABLE public.video_jobs (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  storage_path text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.video_jobs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.video_jobs TO authenticated;
GRANT ALL ON public.video_jobs TO service_role;
CREATE POLICY "own video jobs" ON public.video_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "read own lesson videos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lesson-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.consume_rate_limit(_user_id uuid, _bucket text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_limit int; v_window int; v_count int;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'forbidden');
  END IF;
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  END IF;
  IF _bucket = 'ocr' THEN v_limit := 60; v_window := 3600;
  ELSIF _bucket = 'lesson_images' THEN v_limit := 20; v_window := 3600;
  ELSIF _bucket = 'resources' THEN v_limit := 30; v_window := 3600;
  ELSIF _bucket = 'video_scenes' THEN v_limit := 15; v_window := 86400;
  ELSE RETURN jsonb_build_object('allowed', false, 'reason', 'unknown_bucket');
  END IF;
  INSERT INTO public.edge_rate_limits(user_id, bucket, window_start, count)
    VALUES (_user_id, _bucket, now(), 0) ON CONFLICT (user_id, bucket) DO NOTHING;
  UPDATE public.edge_rate_limits
    SET count = CASE WHEN window_start <= now() - make_interval(secs => v_window) THEN 1 ELSE count + 1 END,
        window_start = CASE WHEN window_start <= now() - make_interval(secs => v_window) THEN now() ELSE window_start END,
        updated_at = now()
    WHERE user_id = _user_id AND bucket = _bucket
      AND (window_start <= now() - make_interval(secs => v_window) OR count < v_limit)
    RETURNING count INTO v_count;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'rate_limited', 'limit', v_limit, 'window_seconds', v_window);
  END IF;
  RETURN jsonb_build_object('allowed', true, 'used', v_count, 'limit', v_limit, 'window_seconds', v_window);
END; $$;
REVOKE ALL ON FUNCTION public.consume_rate_limit(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(uuid, text) TO service_role;