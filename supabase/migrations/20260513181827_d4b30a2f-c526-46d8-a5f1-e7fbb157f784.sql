
CREATE TABLE IF NOT EXISTS public.cached_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum text NOT NULL,
  subject text NOT NULL,
  class_level text NOT NULL,
  topic_normalized text NOT NULL,
  language text NOT NULL DEFAULT 'English',
  content text NOT NULL,
  hit_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cached_lessons_key
  ON public.cached_lessons (curriculum, subject, class_level, topic_normalized, language);

ALTER TABLE public.cached_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cached_lessons readable by all"
  ON public.cached_lessons FOR SELECT
  USING (true);

CREATE TABLE IF NOT EXISTS public.cached_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_hash text NOT NULL UNIQUE,
  language text NOT NULL DEFAULT 'English',
  quiz jsonb NOT NULL,
  hit_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cached_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cached_quizzes readable by all"
  ON public.cached_quizzes FOR SELECT
  USING (true);
