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

export type AppointmentManagerContext = AppointmentStaffContext & {
  role: "owner" | "manager";
};

export async function requireAppointmentStaff(
  request: NextRequest
): Promise<AppointmentStaffContext | NextResponse> {
  const authorization = request.headers.get("authorization") ?? "";
  const separator = authorization.indexOf(" ");
  const scheme = separator > 0 ? authorization.slice(0, separator).toLowerCase() : "";
  const accessToken = separator > 0 ? authorization.slice(separator + 1).trim() : "";
  if (scheme !== "bearer" || !accessToken || accessToken.includes(" ")) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
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

export async function requireAppointmentManager(
  request: NextRequest
): Promise<AppointmentManagerContext | NextResponse> {
  const staff = await requireAppointmentStaff(request);
  if (isStaffResponse(staff)) return staff;
  if (staff.role !== "owner" && staff.role !== "manager") {
    return NextResponse.json({ error: "MANAGER_ACCESS_REQUIRED" }, { status: 403 });
  }
  return { ...staff, role: staff.role };
}

export function isStaffResponse(
  value: AppointmentStaffContext | NextResponse
): value is NextResponse {
  return value instanceof NextResponse;
}

export function isManagerResponse(
  value: AppointmentManagerContext | NextResponse
): value is NextResponse {
  return value instanceof NextResponse;
}
