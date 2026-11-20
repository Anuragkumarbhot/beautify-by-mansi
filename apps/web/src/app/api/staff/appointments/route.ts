import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isStaffResponse, requireAppointmentStaff } from "@/lib/staff-api";
import { supabaseRestAsUser } from "@/lib/supabase-rest";

const instantSchema = z.string().datetime({ offset: true });

export async function GET(request: NextRequest) {
  const staff = await requireAppointmentStaff(request);
  if (isStaffResponse(staff)) return staff;

  const params = request.nextUrl.searchParams;
  const from = instantSchema.safeParse(params.get("from") ?? "");
  const to = instantSchema.safeParse(params.get("to") ?? "");
  const status = z.enum(["all", "confirmed", "cancelled", "completed", "no_show"])
    .safeParse(params.get("status") ?? "all");

  if (!from.success || !to.success || !status.success) {
    return NextResponse.json({ error: "INVALID_CALENDAR_RANGE" }, { status: 400 });
  }

  const fromDate = new Date(from.data);
  const toDate = new Date(to.data);
  const duration = toDate.getTime() - fromDate.getTime();
  if (!Number.isFinite(duration) || duration <= 0 || duration > 31 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "CALENDAR_RANGE_LIMIT_EXCEEDED" }, { status: 400 });
  }

  const query = new URLSearchParams({
    select: "id,reference,customer_name,customer_phone,customer_email,event_type,location_type,address_line1,address_line2,locality,postal_code,address_city,address_state,starts_at,ends_at,status,payment_status,customer_notes,appointment_booking_items(service_name_snapshot,duration_snapshot_minutes,unit_price_snapshot_amount)",
    starts_at: "gte." + from.data,
    order: "starts_at.asc",
    limit: "250",
  });
  query.set("starts_at", "gte." + from.data);
  query.set("ends_at", "gt." + from.data);
  // A starts_at upper bound is applied separately to keep the range index useful.
  query.set("and", "(starts_at.lt." + to.data + ",starts_at.gte." + from.data + ")");
  if (status.data !== "all") query.set("status", "eq." + status.data);

  try {
    const appointments = await supabaseRestAsUser<unknown[]>(
      "/rest/v1/appointment_bookings?" + query.toString(),
      staff.accessToken
    );
    return NextResponse.json(
      { appointments },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "APPOINTMENTS_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
