import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isStaffResponse, requireAppointmentStaff } from "@/lib/staff-api";
import { supabaseRestAsUser } from "@/lib/supabase-rest";

const idSchema = z.string().uuid();
const statusSchema = z.enum(["cancelled", "completed", "no_show"]);

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const staff = await requireAppointmentStaff(request);
  if (isStaffResponse(staff)) return staff;

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: "INVALID_APPOINTMENT_ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = z.object({ status: statusSchema }).strict().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_APPOINTMENT_STATUS" }, { status: 400 });
  }

  const filter = "/rest/v1/appointment_bookings?id=eq." + id;
  try {
    const existing = await supabaseRestAsUser<Array<{ status: string }>>(
      filter + "&select=status",
      staff.accessToken
    );
    if (!existing[0]) {
      return NextResponse.json({ error: "APPOINTMENT_NOT_FOUND" }, { status: 404 });
    }
    if (existing[0].status !== "confirmed") {
      return NextResponse.json(
        { error: "APPOINTMENT_STATUS_CONFLICT" },
        { status: 409 }
      );
    }

    const updated = await supabaseRestAsUser<Array<{ id: string; status: string; cancelled_at: string | null }>>(
      filter + "&status=eq.confirmed&select=id,status,cancelled_at",
      staff.accessToken,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ status: parsed.data.status }),
      }
    );

    if (!updated[0]) {
      return NextResponse.json({ error: "APPOINTMENT_STATUS_CONFLICT" }, { status: 409 });
    }

    return NextResponse.json({ appointment: updated[0] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "APPOINTMENT_UPDATE_FAILED" }, { status: 503 });
  }
}
