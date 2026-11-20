import { NextResponse } from "next/server";
import { isSupabaseNotConfigured, supabaseRest } from "@/lib/supabase-rest";

type AppointmentService = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  duration_minutes: number;
  price_amount: number | null;
  currency: "INR";
  supports_studio: boolean;
  supports_home: boolean;
};

export async function GET() {
  try {
    const services = await supabaseRest<AppointmentService[]>(
      "/rest/v1/appointment_services" +
        "?select=id,slug,name,category,description,duration_minutes,price_amount,currency,supports_studio,supports_home" +
        "&is_active=eq.true&order=category.asc,name.asc"
    );

    return NextResponse.json(
      { services },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const notConfigured = isSupabaseNotConfigured(error);

    return NextResponse.json(
      {
        error: notConfigured ? "BOOKING_NOT_CONFIGURED" : "BOOKING_DATA_UNAVAILABLE",
        message: notConfigured
          ? "The booking system is not connected yet."
          : "The appointment catalogue is not available yet. Please try again later.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
