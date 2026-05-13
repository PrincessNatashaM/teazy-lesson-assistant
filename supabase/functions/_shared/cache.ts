// Lightweight cache helpers backed by Supabase (service-role).
// Used by edge functions to avoid re-calling AI for repeated educational requests.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const baseHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

export interface CachedLessonKey {
  curriculum: string;
  subject: string;
  class_level: string;
  topic_normalized: string;
  language: string;
}

export async function getCachedLesson(key: CachedLessonKey): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      select: "content,id",
      curriculum: `eq.${key.curriculum}`,
      subject: `eq.${key.subject}`,
      class_level: `eq.${key.class_level}`,
      topic_normalized: `eq.${key.topic_normalized}`,
      language: `eq.${key.language}`,
      limit: "1",
    });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/cached_lessons?${params}`, {
      headers: baseHeaders,
    });
    if (!r.ok) return null;
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    // bump hit_count async
    fetch(`${SUPABASE_URL}/rest/v1/cached_lessons?id=eq.${rows[0].id}`, {
      method: "PATCH",
      headers: baseHeaders,
      body: JSON.stringify({ hit_count: (rows[0].hit_count ?? 0) + 1, updated_at: new Date().toISOString() }),
    }).catch(() => {});
    return rows[0].content as string;
  } catch (e) {
    console.error("getCachedLesson error", e);
    return null;
  }
}

export async function saveCachedLesson(key: CachedLessonKey, content: string): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/cached_lessons?on_conflict=curriculum,subject,class_level,topic_normalized,language`, {
      method: "POST",
      headers: { ...baseHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ ...key, content }),
    });
  } catch (e) {
    console.error("saveCachedLesson error", e);
  }
}

// Simple deterministic hash for caching quizzes by lesson content
export async function hashString(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getCachedQuiz(lessonHash: string, language: string): Promise<unknown | null> {
  try {
    const params = new URLSearchParams({
      select: "quiz,id,hit_count",
      lesson_hash: `eq.${lessonHash}`,
      language: `eq.${language}`,
      limit: "1",
    });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/cached_quizzes?${params}`, {
      headers: baseHeaders,
    });
    if (!r.ok) return null;
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    fetch(`${SUPABASE_URL}/rest/v1/cached_quizzes?id=eq.${rows[0].id}`, {
      method: "PATCH",
      headers: baseHeaders,
      body: JSON.stringify({ hit_count: (rows[0].hit_count ?? 0) + 1 }),
    }).catch(() => {});
    return rows[0].quiz;
  } catch (e) {
    console.error("getCachedQuiz error", e);
    return null;
  }
}

export async function saveCachedQuiz(lessonHash: string, language: string, quiz: unknown): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/cached_quizzes?on_conflict=lesson_hash`, {
      method: "POST",
      headers: { ...baseHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ lesson_hash: lessonHash, language, quiz }),
    });
  } catch (e) {
    console.error("saveCachedQuiz error", e);
  }
}
