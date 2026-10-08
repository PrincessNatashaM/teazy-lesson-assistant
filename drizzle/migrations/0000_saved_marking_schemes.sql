CREATE TABLE public.saved_marking_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  subject text,
  question_paper text CHECK (question_paper IS NULL OR char_length(question_paper) <= 50000),
  marking_scheme text NOT NULL CHECK (char_length(marking_scheme) BETWEEN 1 AND 50000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_marking_schemes TO authenticated;
GRANT ALL ON public.saved_marking_schemes TO service_role;
ALTER TABLE public.saved_marking_schemes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own marking schemes" ON public.saved_marking_schemes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_saved_marking_schemes_updated BEFORE UPDATE ON public.saved_marking_schemes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();