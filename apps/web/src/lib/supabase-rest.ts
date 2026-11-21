import "server-only";

import { getPublicEnv, getServerEnv } from "@/lib/env";

type SupabaseError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

export type SupabaseAuthUser = {
  id: string;
  email?: string;
};

function getPublicSupabaseConfig() {
  const env = getPublicEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  let normalizedUrl = url;
  while (normalizedUrl.endsWith("/")) normalizedUrl = normalizedUrl.slice(0, -1);
  return { url: normalizedUrl, key };
}

async function requestRest<T>(
  path: string,
  init: RequestInit,
  bearer: string,
  apiKey: string
): Promise<T> {
  const { url } = getPublicSupabaseConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", apiKey);
  headers.set("Authorization", "Bearer " + bearer);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

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

export async function supabaseRest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const { key } = getPublicSupabaseConfig();
  return requestRest<T>(path, init, key, key);
}

/** Runs a PostgREST request in the caller's authenticated JWT/RLS context. */
export async function supabaseRestAsUser<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> {
  const { key } = getPublicSupabaseConfig();
  return requestRest<T>(path, init, accessToken, key);
}

/**
 * Privileged request for server-only API routes. The service-role credential is
 * used as both bearer and apikey header, and is never returned to callers.
 */
export async function supabaseRestAsServiceRole<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  if (!path.startsWith("/rest/v1/")) {
    throw new Error("SERVICE_ROLE_PATH_NOT_ALLOWED");
  }

  const env = getServerEnv();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY_NOT_CONFIGURED");
  }

  return requestRest<T>(path, init, serviceRoleKey, serviceRoleKey);
}

/** Validates a user access token with Supabase Auth; never trusts decoded client claims. */
export async function supabaseAuthUser(accessToken: string): Promise<SupabaseAuthUser> {
  const { url, key } = getPublicSupabaseConfig();
  const response = await fetch(url + "/auth/v1/user", {
    headers: {
      apikey: key,
      Authorization: "Bearer " + accessToken,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("SUPABASE_AUTH_INVALID");
  }

  const user = (await response.json()) as SupabaseAuthUser;
  if (!user || typeof user.id !== "string") {
    throw new Error("SUPABASE_AUTH_INVALID");
  }

  return user;
}

export function isSupabaseNotConfigured(error: unknown) {
  return error instanceof Error && (
    error.message === "SUPABASE_NOT_CONFIGURED" ||
    error.message === "SUPABASE_SERVICE_ROLE_KEY_NOT_CONFIGURED"
  );
}
