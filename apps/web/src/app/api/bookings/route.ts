import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforcePublicRateLimit, readLimitedJsonBody } from "@/lib/public-api-security";
import { isSupabaseNotConfigured, supabaseRestAsServiceRole } from "@/lib/supabase-rest";

const MAX_BOOKING_BODY_BYTES = 16 * 1024;

const bookingSchema = z.object({
  idempotencyKey: z.string().uuid(),
  serviceIds: z.array(z.string().uuid()).min(1).max(8),
  startsAt: z.string().datetime({ offset: true }),
  locationType: z.enum(["studio", "home"]),
  customerName: z.string().trim().min(1).max(80),
  customerPhone: z.string().trim().min(10).max(20).refine((value) => {
    const digits = value.replace(/\D/g, "").length;
    return digits >= 10 && digits <= 15;
  }),
  customerEmail: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  eventType: z.string().trim().min(1).max(100),
  customerNotes: z.string().max(1000).optional(),
  addressLine1: z.string().trim().min(1).max(200).optional(),
  addressLine2: z.string().trim().max(200).optional(),
  locality: z.string().trim().max(120).optional(),
  postalCode: z.string().regex(/^\d{6}$/).optional(),
}).strict().superRefine((value, context) => {
  if (new Set(value.serviceIds).size !== value.serviceIds.length) {
    context.addIssue({
      code: "custom",
      path: ["serviceIds"],
      message: "Duplicate services are not allowed.",
    });
  }

  if (value.locationType === "home") {
    if (!value.addressLine1 || !value.postalCode) {
      context.addIssue({
        code: "custom",
        path: ["addressLine1"],
        message: "A complete home-service address and six-digit pincode are required.",
      });
    }
  } else if (
    value.addressLine1 ||
    value.addressLine2 ||
    value.locality ||
    value.postalCode
  ) {
    context.addIssue({
      code: "custom",
      path: ["addressLine1"],
      message: "Home address fields are only valid for home-service bookings.",
    });
  }
});

type CreatedBooking = {
  booking_id: string;
  reference: string;
  starts_at: string;
  ends_at: string;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
  was_existing_request: boolean;
};

function mapBookingError(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

  if (
    message.includes("SLOT_UNAVAILABLE") ||
    message.includes("SLOT_JUST_BECAME_UNAVAILABLE")
  ) {
    return {
      status: 409,
      error: "SLOT_UNAVAILABLE",
      message: "That time has just become unavailable. Refresh the slots and choose another time.",
    };
  }
  if (message.includes("HOME_SERVICE_AREA_UNAVAILABLE")) {
    return {
      status: 422,
      error: "HOME_SERVICE_AREA_UNAVAILABLE",
      message: "Home service is not available for this pincode.",
    };
  }
  if (
    message.includes("BOOKING_DISABLED") ||
    message.includes("BOOKING_SETTINGS_INCOMPLETE") ||
    message.includes("BOOKING_TIMEZONE_NOT_CONFIGURED") ||
    message.includes("SUPABASE_NOT_CONFIGURED") ||
    message.includes("SUPABASE_SERVICE_ROLE_KEY_NOT_CONFIGURED")
  ) {
    return {
      status: 503,
      error: "BOOKING_NOT_READY",
      message: "Automatic appointments are not open yet. Please contact the studio.",
    };
  }
  if (
    message.includes("SERVICE_NOT_BOOKABLE") ||
    message.includes("BOOKING_OUTSIDE_ALLOWED_WINDOW")
  ) {
    return {
      status: 422,
      error: "BOOKING_NOT_AVAILABLE",
      message: "The selected service or appointment time is not currently bookable.",
    };
  }

  return {
    status: 503,
    error: "BOOKING_TEMPORARILY_UNAVAILABLE",
    message: "The booking could not be completed. Please try again later.",
  };
}

export async function POST(request: NextRequest) {
  const rateLimit = await enforcePublicRateLimit(request, "booking_create", 5, 600);
  if (rateLimit) return rateLimit;

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "JSON_CONTENT_TYPE_REQUIRED" }, { status: 415 });
  }

  const limitedBody = await readLimitedJsonBody(request, MAX_BOOKING_BODY_BYTES);
  if (!limitedBody.ok) {
    return NextResponse.json({ error: limitedBody.error }, { status: limitedBody.status });
  }

  const parsed = bookingSchema.safeParse(limitedBody.value);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "INVALID_BOOKING_DETAILS",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const booking = parsed.data;

  try {
    const rows = await supabaseRestAsServiceRole<CreatedBooking[]>(
      "/rest/v1/rpc/create_appointment_booking",
      {
        method: "POST",
        body: JSON.stringify({
          p_idempotency_key: booking.idempotencyKey,
          p_service_ids: booking.serviceIds,
          p_starts_at: booking.startsAt,
          p_location_type: booking.locationType,
          p_customer_name: booking.customerName,
          p_customer_phone: booking.customerPhone,
          p_customer_email: booking.customerEmail ?? "",
          p_event_type: booking.eventType,
          p_customer_notes: booking.customerNotes ?? "",
          p_address_line1: booking.addressLine1 ?? null,
          p_address_line2: booking.addressLine2 ?? null,
          p_locality: booking.locality ?? null,
          p_postal_code: booking.postalCode ?? null,
        }),
      }
    );

    const created = Array.isArray(rows) ? rows[0] : undefined;
    if (!created) {
      return NextResponse.json(
        { error: "BOOKING_CONFIRMATION_MISSING" },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        booking: {
          reference: created.reference,
          startsAt: created.starts_at,
          endsAt: created.ends_at,
          locationType: booking.locationType,
          status: created.status,
        },
        repeatedRequest: created.was_existing_request,
        paymentStatus: "not_required",
      },
      {
        status: created.was_existing_request ? 200 : 201,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    const mapped = mapBookingError(error);
    const configured = !isSupabaseNotConfigured(error);

    return NextResponse.json(
      {
        error: mapped.error,
        message: mapped.message,
        ...(configured ? {} : { setupRequired: true }),
      },
      { status: mapped.status, headers: { "Cache-Control": "no-store" } }
    );
  }
}
