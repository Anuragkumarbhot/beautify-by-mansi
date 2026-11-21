import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { enforcePublicRateLimit } from "@/lib/public-api-security";
import { supabaseRestAsServiceRole } from "@/lib/supabase-rest";

const COOKIE_NAME = "bbm_guest_booking";

export async function GET(request: NextRequest) {
  const rateLimit = await enforcePublicRateLimit(request, "booking_guest_read", 30, 60);
  if (rateLimit) return rateLimit;

  const cookieStore = await cookies();
  const sessionSecret = cookieStore.get(COOKIE_NAME)?.value ?? "";
  if (sessionSecret.length !== 43 || !/^[A-Za-z0-9_-]+$/.test(sessionSecret)) {
    return NextResponse.json({ error: "GUEST_SESSION_NOT_FOUND" }, { status: 404 });
  }

  const sessionHash = createHash("sha256").update(sessionSecret).digest("hex");
  try {
    const booking = await supabaseRestAsServiceRole<Record<string, unknown> | null>(
      "/rest/v1/rpc/get_appointment_by_guest_session",
      {
        method: "POST",
        body: JSON.stringify({ p_session_hash: sessionHash }),
      }
    );

    if (!booking) {
      return NextResponse.json({ error: "GUEST_SESSION_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json(
      { booking },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "GUEST_BOOKING_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
