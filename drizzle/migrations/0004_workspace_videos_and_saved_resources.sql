ALTER TABLE public.video_jobs ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.video_jobs ADD COLUMN IF NOT EXISTS scene_index integer;
ALTER TABLE public.video_jobs ADD COLUMN IF NOT EXISTS saved boolean NOT NULL DEFAULT false;
ALTER TABLE public.video_jobs ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE public.saved_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  storage_path text,
  content text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_resources TO authenticated;
GRANT ALL ON public.saved_resources TO service_role;
ALTER TABLE public.saved_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own saved resources"
  ON public.saved_resources FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_saved_resources_updated BEFORE UPDATE ON public.saved_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_video_jobs_updated BEFORE UPDATE ON public.video_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();