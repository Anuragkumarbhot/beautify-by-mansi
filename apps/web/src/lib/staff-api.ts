import { NextRequest, NextResponse } from "next/server";
import { supabaseAuthUser, supabaseRestAsUser } from "@/lib/supabase-rest";

type StaffMembership = {
  role: "owner" | "manager" | "staff";
  is_active: boolean;
};

export type AppointmentStaffContext = {
  accessToken: string;
  userId: string;
  role: StaffMembership["role"];
};

export async function requireAppointmentStaff(
  request: NextRequest
): Promise<AppointmentStaffContext | NextResponse> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\\s+([A-Za-z0-9._~-]+)$/.exec(authorization);
  if (!match) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const accessToken = match[1];
  try {
    const user = await supabaseAuthUser(accessToken);
    const rows = await supabaseRestAsUser<StaffMembership[]>(
      "/rest/v1/appointment_staff_members?select=role,is_active&user_id=eq." + encodeURIComponent(user.id),
      accessToken
    );
    const membership = rows[0];
    if (!membership || !membership.is_active) {
      return NextResponse.json({ error: "STAFF_ACCESS_REQUIRED" }, { status: 403 });
    }

    return { accessToken, userId: user.id, role: membership.role };
  } catch {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
}

export function isStaffResponse(
  value: AppointmentStaffContext | NextResponse
): value is NextResponse {
  return value instanceof NextResponse;
}
