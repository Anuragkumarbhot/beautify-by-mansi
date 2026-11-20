import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseNotConfigured, supabaseRest } from "@/lib/supabase-rest";

const uuidSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
});

type AvailabilitySlot = {
  starts_at: string;
  ends_at: string;
  available_resources: number;
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const date = params.get("date") ?? "";
  const locationType = params.get("location") ?? "";
  const serviceIds = (params.get("serviceIds") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const postalCode = params.get("postalCode")?.trim() ?? "";

  const parsedDate = dateSchema.safeParse(date);
  const parsedLocation = z.enum(["studio", "home"]).safeParse(locationType);
  const parsedServices = z.array(uuidSchema).min(1).max(8).safeParse(serviceIds);

  if (!parsedDate.success || !parsedLocation.success || !parsedServices.success) {
    return NextResponse.json(
      { error: "INVALID_AVAILABILITY_QUERY" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (new Set(serviceIds).size !== serviceIds.length) {
    return NextResponse.json(
      { error: "DUPLICATE_SERVICES" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (locationType === "home" && !/^\d{6}$/.test(postalCode)) {
    return NextResponse.json(
      { error: "VALID_PINCODE_REQUIRED" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (locationType === "studio" && postalCode) {
    return NextResponse.json(
      { error: "PINCODE_NOT_ALLOWED_FOR_STUDIO" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const slots = await supabaseRest<AvailabilitySlot[]>(
      "/rest/v1/rpc/get_appointment_availability",
      {
        method: "POST",
        body: JSON.stringify({
          p_date: date,
          p_location_type: locationType,
          p_service_ids: serviceIds,
          p_postal_code: locationType === "home" ? postalCode : null,
        }),
      }
    );

    return NextResponse.json(
      { slots: Array.isArray(slots) ? slots : [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const unavailable = isSupabaseNotConfigured(error);
    return NextResponse.json(
      {
        error: unavailable ? "BOOKING_NOT_CONFIGURED" : "AVAILABILITY_UNAVAILABLE",
        message: unavailable
          ? "Online booking is not configured yet."
          : "Live availability is temporarily unavailable. Please try again.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
