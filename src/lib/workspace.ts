import { supabase } from "@/integrations/supabase/client";

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-scene`;

async function callVideo(body: object) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch(FN, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  return { ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) };
}

export type WorkspaceVideo = {
  id: string;
  title: string | null;
  sceneIndex: number | null;
  saved: boolean;
  createdAt: string;
  url: string;
};

export async function listWorkspaceVideos(): Promise<WorkspaceVideo[]> {
  const r = await callVideo({ action: "list" });
  if (!r.ok) return [];
  return r.json.videos || [];
}

export async function markVideosSaved(ids: string[]) {
  return callVideo({ action: "save", ids });
}

export async function deleteWorkspaceVideo(id: string) {
  return callVideo({ action: "delete", id });
}

export type SavedResource = {
  id: string;
  kind: string;
  title: string;
  storage_path: string | null;
  content: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function listSavedResources(): Promise<SavedResource[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data } = await supabase
    .from("saved_resources")
    .select("*")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false });
  return (data as unknown as SavedResource[]) || [];
}

export async function saveTextResource(kind: string, title: string, content: string, metadata?: Record<string, unknown>) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in required.");
  const { error } = await supabase.from("saved_resources").insert({
    user_id: u.user.id, kind, title: title.slice(0, 200), content, metadata: metadata ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function saveFileResource(kind: string, title: string, blob: Blob, ext: string, metadata?: Record<string, unknown>) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in required.");
  const path = `${u.user.id}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from("workspace-files").upload(path, blob, { contentType: blob.type });
  if (up.error) throw new Error(up.error.message);
  const { error } = await supabase.from("saved_resources").insert({
    user_id: u.user.id, kind, title: title.slice(0, 200), storage_path: path, metadata: metadata ?? null,
  });
  if (error) {
    await supabase.storage.from("workspace-files").remove([path]);
    throw new Error(error.message);
  }
}

export async function downloadSavedFile(r: SavedResource) {
  if (!r.storage_path) return;
  const { data, error } = await supabase.storage.from("workspace-files").createSignedUrl(r.storage_path, 300);
  if (error || !data?.signedUrl) throw new Error("Could not open this file.");
  const res = await fetch(data.signedUrl);
  const blob = await res.blob();
  const ext = r.storage_path.split(".").pop() || "bin";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${r.title.slice(0, 60)}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export async function deleteSavedResource(r: SavedResource) {
  if (r.storage_path) await supabase.storage.from("workspace-files").remove([r.storage_path]);
  await supabase.from("saved_resources").delete().eq("id", r.id);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
