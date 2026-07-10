
CREATE OR REPLACE FUNCTION public.refresh_batch_aggregates()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
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
