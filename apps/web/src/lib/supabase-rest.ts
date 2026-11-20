import { getPublicEnv } from "@/lib/env";

type SupabaseError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

function getSupabaseConfig() {
  const env = getPublicEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  return { url: url.replace(/\/+$/, ""), key };
}

export async function supabaseRest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const { url, key } = getSupabaseConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Authorization", "Bearer " + key);
  headers.set("Content-Type", "application/json");

  const response = await fetch(url + path, {
    ...init,
    headers,
    cache: "no-store",
  });

  const raw = await response.text();
  let payload: unknown = null;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error("SUPABASE_INVALID_RESPONSE");
    }
  }

  if (!response.ok) {
    const error = (payload && typeof payload === "object" ? payload : {}) as SupabaseError;
    const message = typeof error.message === "string" ? error.message : "SUPABASE_REQUEST_FAILED";
    const code = typeof error.code === "string" ? error.code : "UNKNOWN";
    throw new Error(code + ":" + message);
  }

  return payload as T;
}

export function isSupabaseNotConfigured(error: unknown) {
  return error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED";
}
