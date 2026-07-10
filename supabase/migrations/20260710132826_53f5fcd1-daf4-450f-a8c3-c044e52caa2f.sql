
-- Assessment Pro milestone: batches, items, feature flags

CREATE TABLE IF NOT EXISTS public.assessment_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  curriculum TEXT NOT NULL,
  subject TEXT NOT NULL,
  subject_profile TEXT,
  class_level TEXT NOT NULL,
  assessment_type TEXT,
  marking_style TEXT DEFAULT 'standard',
  language TEXT DEFAULT 'English',
  question_paper TEXT,
  marking_scheme TEXT,
  script_count INT NOT NULL DEFAULT 0,
  completed_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  avg_percent NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_batches TO authenticated;
GRANT ALL ON public.assessment_batches TO service_role;
ALTER TABLE public.assessment_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own batches" ON public.assessment_batches
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_assessment_batches_updated_at BEFORE UPDATE ON public.assessment_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.assessment_batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.assessment_batches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  source_file TEXT,
  ocr_text TEXT,
  result_json JSONB,
  awarded NUMERIC,
  max_score NUMERIC,
  percent NUMERIC,
  grade TEXT,
  confidence NUMERIC,
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_batch_items TO authenticated;
GRANT ALL ON public.assessment_batch_items TO service_role;
ALTER TABLE public.assessment_batch_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own batch items" ON public.assessment_batch_items
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_assessment_batch_items_updated_at BEFORE UPDATE ON public.assessment_batch_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_batch_items_batch ON public.assessment_batch_items(batch_id);
CREATE INDEX idx_batch_items_student ON public.assessment_batch_items(user_id, student_name);

-- Realtime for progress updates
ALTER TABLE public.assessment_batch_items REPLICA IDENTITY FULL;
ALTER TABLE public.assessment_batches REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assessment_batch_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assessment_batches;

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  flag TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, flag)
);
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own flags" ON public.feature_flags
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Batch aggregate updater: recomputes counts/avg on item change
CREATE OR REPLACE FUNCTION public.refresh_batch_aggregates()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_batch UUID;
BEGIN
  v_batch := COALESCE(NEW.batch_id, OLD.batch_id);
  UPDATE public.assessment_batches b SET
    completed_count = (SELECT COUNT(*) FROM public.assessment_batch_items WHERE batch_id = v_batch AND status = 'done'),
    failed_count = (SELECT COUNT(*) FROM public.assessment_batch_items WHERE batch_id = v_batch AND status = 'failed'),
    avg_percent = (SELECT AVG(percent) FROM public.assessment_batch_items WHERE batch_id = v_batch AND status = 'done'),
    status = CASE
      WHEN (SELECT COUNT(*) FROM public.assessment_batch_items WHERE batch_id = v_batch AND status IN ('queued','processing')) > 0 THEN 'processing'
      WHEN (SELECT COUNT(*) FROM public.assessment_batch_items WHERE batch_id = v_batch AND status = 'failed') > 0
       AND (SELECT COUNT(*) FROM public.assessment_batch_items WHERE batch_id = v_batch AND status = 'done') = 0 THEN 'failed'
      ELSE 'completed'
    END
    WHERE b.id = v_batch;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_refresh_batch_aggregates
AFTER INSERT OR UPDATE OR DELETE ON public.assessment_batch_items
FOR EACH ROW EXECUTE FUNCTION public.refresh_batch_aggregates();
