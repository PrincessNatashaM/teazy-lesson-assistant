
CREATE TABLE IF NOT EXISTS public.saved_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  curriculum TEXT,
  subject TEXT,
  class_level TEXT,
  topic TEXT,
  language TEXT DEFAULT 'English',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_lessons TO authenticated;
GRANT ALL ON public.saved_lessons TO service_role;
ALTER TABLE public.saved_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved_lessons" ON public.saved_lessons
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_saved_lessons_updated BEFORE UPDATE ON public.saved_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_saved_lessons_user ON public.saved_lessons(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.saved_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  curriculum TEXT,
  subject TEXT,
  class_level TEXT,
  topic TEXT,
  language TEXT DEFAULT 'English',
  quiz JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_quizzes TO authenticated;
GRANT ALL ON public.saved_quizzes TO service_role;
ALTER TABLE public.saved_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved_quizzes" ON public.saved_quizzes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_saved_quizzes_updated BEFORE UPDATE ON public.saved_quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_saved_quizzes_user ON public.saved_quizzes(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.saved_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  curriculum TEXT,
  subject TEXT,
  class_level TEXT,
  assessment_type TEXT,
  student_name TEXT,
  awarded NUMERIC,
  max_score NUMERIC,
  percent NUMERIC,
  grade TEXT,
  result JSONB NOT NULL,
  script_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_assessments TO authenticated;
GRANT ALL ON public.saved_assessments TO service_role;
ALTER TABLE public.saved_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved_assessments" ON public.saved_assessments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_saved_assessments_updated BEFORE UPDATE ON public.saved_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_saved_assessments_user ON public.saved_assessments(user_id, created_at DESC);
