import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import { supabaseRestAsServiceRole } from "@/lib/supabase-rest";

type RateLimitRow = {
  allowed: boolean;
  retry_after_seconds: number;
  remaining: number;
};

export type PublicRateLimitScope = "booking_availability" | "booking_create";

/**
 * Uses the first forwarded client address. Before production, verify the hosting
 * proxy overwrites inbound X-Forwarded-For; otherwise an untrusted client could
 * spoof the rate-limit key. Missing/invalid addresses share a fail-closed bucket.
 */
export function getRequestClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const realIp = request.headers.get("x-real-ip") ?? "";
  const candidates = [forwarded.split(",")[0]?.trim() ?? "", realIp.trim()];

  for (const candidate of candidates) {
    if (candidate && isIP(candidate) !== 0) return candidate;
  }

  return "0.0.0.0";
}

export async function enforcePublicRateLimit(
  request: NextRequest,
  scope: PublicRateLimitScope,
  limit: number,
  windowSeconds: number
): Promise<NextResponse | null> {
  try {
    const clientIp = getRequestClientIp(request);
    const rows = await supabaseRestAsServiceRole<RateLimitRow[]>(
      "/rest/v1/rpc/consume_api_rate_limit",
      {
        method: "POST",
        body: JSON.stringify({
          p_client_ip: clientIp,
          p_scope: scope,
          p_limit: limit,
          p_window_seconds: windowSeconds,
        }),
      }
    );

    const result = Array.isArray(rows) ? rows[0] : undefined;
    if (!result || typeof result.allowed !== "boolean") {
      throw new Error("RATE_LIMIT_RESPONSE_INVALID");
    }

    if (!result.allowed) {
      return NextResponse.json(
        { error: "RATE_LIMITED", message: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(Math.max(1, result.retry_after_seconds || 1)),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    return null;
  } catch {
    // Do not permit public booking operations if the limiter or server secret
    // is unavailable. This is intentionally fail-closed.
    return NextResponse.json(
      {
        error: "PUBLIC_API_NOT_READY",
        message: "This booking service is temporarily unavailable. Please contact the studio.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
