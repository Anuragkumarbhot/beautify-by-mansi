import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { enforcePublicRateLimit } from "@/lib/public-api-security";
import { supabaseRestAsServiceRole } from "@/lib/supabase-rest";

const COOKIE_NAME = "bbm_guest_booking";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  let sameOrigin = false;
  try {
    sameOrigin = Boolean(origin) && new URL(origin!).origin === request.nextUrl.origin;
  } catch {
    sameOrigin = false;
  }
  if (!sameOrigin) {
    return NextResponse.json({ error: "INVALID_REQUEST_ORIGIN" }, { status: 403 });
  }

  const rateLimit = await enforcePublicRateLimit(request, "booking_guest_cancel", 5, 600);
  if (rateLimit) return rateLimit;

  const cookieStore = await cookies();
  const sessionSecret = cookieStore.get(COOKIE_NAME)?.value ?? "";
  if (sessionSecret.length !== 43 || !/^[A-Za-z0-9_-]+$/.test(sessionSecret)) {
    return NextResponse.json({ error: "GUEST_SESSION_NOT_FOUND" }, { status: 404 });
  }

  const sessionHash = createHash("sha256").update(sessionSecret).digest("hex");
  try {
    const result = await supabaseRestAsServiceRole<{
      reference: string;
      status: string;
      cancelled: boolean;
      cancelledAt: string | null;
    }>(
      "/rest/v1/rpc/cancel_appointment_by_guest_session",
      {
        method: "POST",
        body: JSON.stringify({ p_session_hash: sessionHash }),
      }
    );

    return NextResponse.json(
      { result },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("GUEST_SESSION_NOT_FOUND")) {
      return NextResponse.json({ error: "GUEST_SESSION_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "GUEST_CANCELLATION_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
