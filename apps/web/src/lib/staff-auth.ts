"use client";

const STORAGE_KEY = "bbm-v2-staff-auth";
const REFRESH_SKEW_SECONDS = 60;

type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type?: string;
  user?: { id: string; email?: string };
};

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_NOT_CONFIGURED");
  return { url, key };
}

function saveSession(session: Partial<AuthSession>) {
  if (!session.access_token || !session.refresh_token) {
    throw new Error("SUPABASE_SESSION_INVALID");
  }
  const normalized: AuthSession = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600),
    token_type: session.token_type,
    user: session.user,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function readSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (!session.access_token || !session.refresh_token || !Number.isFinite(session.expires_at)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

async function parseAuthResponse(response: Response): Promise<Partial<AuthSession>> {
  const payload = await response.json().catch(() => ({})) as {
    message?: string;
    msg?: string;
    error_description?: string;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error_description || payload.message || payload.msg || payload.error || "AUTH_REQUEST_FAILED");
  }
  return payload as Partial<AuthSession>;
}

export async function staffSignIn(email: string, password: string): Promise<string> {
  const { url, key } = config();
  const response = await fetch(url + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const session = saveSession(await parseAuthResponse(response));
  return session.access_token;
}

export async function getStaffAccessToken(): Promise<string | null> {
  const session = readSession();
  if (!session) return null;
  if (session.expires_at > Math.floor(Date.now() / 1000) + REFRESH_SKEW_SECONDS) {
    return session.access_token;
  }

  const { url, key } = config();
  const response = await fetch(url + "/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });

  try {
    const renewed = saveSession(await parseAuthResponse(response));
    return renewed.access_token;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export async function staffSignOut() {
  const session = readSession();
  if (!session) return;
  const { url, key } = config();
  try {
    await fetch(url + "/auth/v1/logout", {
      method: "POST",
      headers: { apikey: key, Authorization: "Bearer " + session.access_token },
    });
  } finally {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
