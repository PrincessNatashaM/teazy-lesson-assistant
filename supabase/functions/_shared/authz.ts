// Shared server-side authentication, quota and input-limit helpers for AI edge functions.
// Mirrors the pattern already used by assess-script / assess-batch.
import { createClient } from "npm:@supabase/supabase-js@2";

export const aiCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...aiCorsHeaders, "Content-Type": "application/json", ...extra },
  });
}

export interface AuthedUser {
  id: string;
  email?: string;
  // Supabase client bound to the caller's JWT (so auth.uid() resolves inside RPCs)
  client: ReturnType<typeof createClient>;
}

/**
 * Requires a valid Supabase bearer token. Returns the authenticated user or a 401 Response.
 * The user id is derived from the token only, never from the request body.
 */
export async function requireUser(req: Request): Promise<AuthedUser | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "Sign in required" }, 401);
  }
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) return jsonResponse({ error: "Sign in required" }, 401);
  return { id: data.user.id, email: data.user.email ?? undefined, client };
}

/**
 * Reads and parses the JSON body with a hard size cap.
 * Returns the parsed object or a 4xx Response.
 */
export async function readJsonBody(
  req: Request,
  maxBytes: number,
): Promise<Record<string, unknown> | Response> {
  const declared = req.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) {
    return jsonResponse({ error: "Request too large" }, 413);
  }
  let raw: string;
  try {
    const buf = new Uint8Array(await req.arrayBuffer());
    if (buf.byteLength > maxBytes) return jsonResponse({ error: "Request too large" }, 413);
    raw = new TextDecoder().decode(buf);
  } catch {
    return jsonResponse({ error: "Invalid request" }, 400);
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonResponse({ error: "Invalid request" }, 400);
    }
    return parsed as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Invalid request" }, 400);
  }
}

/** Validates that a field is a non-empty string within a length limit. */
export function str(
  value: unknown,
  maxLen: number,
): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t || t.length > maxLen) return null;
  return t;
}

/** Optional string field: must be a string within limits if present. */
export function optStr(value: unknown, maxLen: number): string | null | Response {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > maxLen) {
    return jsonResponse({ error: "Invalid request" }, 400);
  }
  return value;
}

export type FeatureKind = "lesson" | "quiz" | "writing";

/**
 * Server-authoritative quota consumption. Uses the caller's JWT so the RPC
 * derives identity from auth.uid() internally; the client cannot spoof a user id.
 * Returns null when allowed, or a 429/402-style Response when rejected.
 */
export async function consumeQuota(user: AuthedUser, kind: FeatureKind): Promise<Response | null> {
  const { data, error } = await user.client.rpc("consume_feature_usage", {
    _user_id: user.id,
    _kind: kind,
  });
  if (error) return jsonResponse({ error: "Could not verify your usage allowance." }, 500);
  const result = (data ?? {}) as Record<string, unknown>;
  if (!result.allowed) {
    if (result.reason === "not_authenticated") {
      return jsonResponse({ error: "Sign in required" }, 401);
    }
    return jsonResponse(
      {
        error: "Monthly limit reached. Upgrade your plan to continue.",
        reason: result.reason ?? "limit_reached",
        used: result.used,
        limit: result.limit,
        plan: result.plan,
      },
      403,
    );
  }
  return null;
}

/**
 * Technical abuse guard (not a commercial quota). Buckets and their limits are
 * defined server-side inside the consume_rate_limit DB function; the client
 * cannot influence them. Uses the service role so the RPC is unreachable from
 * the browser.
 */
export async function enforceRateLimit(userId: string, bucket: string): Promise<Response | null> {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await admin.rpc("consume_rate_limit", {
    _user_id: userId,
    _bucket: bucket,
  });
  if (error) return jsonResponse({ error: "Could not verify your usage allowance." }, 500);
  const result = (data ?? {}) as Record<string, unknown>;
  if (!result.allowed) {
    return jsonResponse(
      { error: "Too many requests. Please wait a moment and try again.", reason: result.reason ?? "rate_limited" },
      429,
    );
  }
  return null;
}
