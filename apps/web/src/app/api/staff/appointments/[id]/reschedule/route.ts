import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isStaffResponse, requireAppointmentStaff } from "@/lib/staff-api";
import { supabaseRestAsUser } from "@/lib/supabase-rest";

const idSchema = z.string().uuid();
const rescheduleSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
}).strict();

export async function POST(
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

  const parsed = rescheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_RESCHEDULE_REQUEST" }, { status: 400 });
  }

  try {
    const result = await supabaseRestAsUser<Array<{
      reference: string;
      starts_at: string;
      ends_at: string;
    }>>(
      "/rest/v1/rpc/reschedule_appointment_booking",
      staff.accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          p_booking_id: id,
          p_new_starts_at: parsed.data.startsAt,
        }),
      }
    );

    if (!result[0]) {
      return NextResponse.json({ error: "RESCHEDULE_CONFIRMATION_MISSING" }, { status: 502 });
    }

    return NextResponse.json(
      { appointment: result[0] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("SLOT_JUST_BECAME_UNAVAILABLE") || message.includes("SLOT_UNAVAILABLE")) {
      return NextResponse.json({ error: "SLOT_UNAVAILABLE" }, { status: 409 });
    }
    if (message.includes("APPOINTMENT_NOT_RESCHEDULABLE") || message.includes("APPOINTMENT_NOT_FOUND")) {
      return NextResponse.json({ error: "APPOINTMENT_NOT_RESCHEDULABLE" }, { status: 409 });
    }
    if (message.includes("RESCHEDULE_OUTSIDE_ALLOWED_WINDOW")) {
      return NextResponse.json({ error: "RESCHEDULE_OUTSIDE_ALLOWED_WINDOW" }, { status: 422 });
    }
    return NextResponse.json({ error: "RESCHEDULE_FAILED" }, { status: 503 });
  }
}
