"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StoreHeader } from "@/components/store-header";

type GuestService = {
  name: string;
  durationMinutes: number;
  priceAmount: number | null;
  currency: string;
};

type GuestBooking = {
  reference: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  eventType: string;
  locationType: "studio" | "home";
  addressLine1: string | null;
  addressLine2: string | null;
  locality: string | null;
  postalCode: string | null;
  addressCity: string | null;
  addressState: string | null;
  startsAt: string;
  endsAt: string;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
  paymentStatus: string;
  customerNotes: string;
  cancelledAt: string | null;
  services: GuestService[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ManageBookingPage() {
  const [booking, setBooking] = useState<GuestBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadBooking = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/guest-booking", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.booking) {
        throw new Error(payload.error === "GUEST_SESSION_NOT_FOUND"
          ? "This browser does not have a valid appointment management session. Open the confirmation on the same browser used to make the booking."
          : payload.error || "Appointment details could not be loaded.");
      }
      setBooking(payload.booking as GuestBooking);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Appointment details could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  async function cancelBooking() {
    if (!window.confirm("Cancel this appointment? The reserved time will be released.")) return;
    setCancelling(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/guest-booking/cancel", { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload.result) {
        throw new Error(payload.error || "Appointment could not be cancelled.");
      }
      setNotice(payload.result.cancelled
        ? "Your appointment has been cancelled."
        : "This appointment is already " + payload.result.status + ".");
      await loadBooking();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Appointment could not be cancelled.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <StoreHeader />
      <main className="booking-page">
        <section className="booking-confirmation booking-management">
          <p className="eyebrow">PRIVATE APPOINTMENT ACCESS</p>
          <h1>Manage your<br /><em>appointment.</em></h1>
          {loading ? <p className="booking-muted">Loading your secure appointment details…</p> : null}
          {error ? <p className="booking-alert" role="alert">{error}</p> : null}
          {notice ? <p className="booking-notice" role="status">{notice}</p> : null}
          {booking ? (
            <>
              <p className="booking-reference-label">Booking reference</p>
              <p className="booking-reference">{booking.reference}</p>
              <div className="booking-summary">
                <p><strong>Name</strong><span>{booking.customerName}</span></p>
                <p><strong>Mobile</strong><span>{booking.customerPhone}</span></p>
                <p><strong>Event</strong><span>{booking.eventType}</span></p>
                <p><strong>Date</strong><span>{formatDate(booking.startsAt)}</span></p>
                <p><strong>Time</strong><span>{formatTime(booking.startsAt)} – {formatTime(booking.endsAt)}</span></p>
                <p><strong>Location</strong><span>{booking.locationType === "studio" ? "Studio appointment" : "Home service"}</span></p>
                {booking.locationType === "home" ? <p><strong>Address</strong><span>{[booking.addressLine1, booking.addressLine2, booking.locality, booking.postalCode, booking.addressCity, booking.addressState].filter(Boolean).join(", ")}</span></p> : null}
                <p><strong>Status</strong><span>{booking.status.replace("_", " ")}</span></p>
              </div>
              {booking.services?.length ? (
                <div className="booking-management-services">
                  <h2>Booked services</h2>
                  {booking.services.map((service, index) => (
                    <p key={service.name + index}><strong>{service.name}</strong><span>{service.durationMinutes} min</span></p>
                  ))}
                </div>
              ) : null}
              {booking.customerNotes ? <p className="booking-disclaimer">Your note: {booking.customerNotes}</p> : null}
              {booking.status === "confirmed" ? (
                <button className="button button-primary booking-submit" type="button" disabled={cancelling} onClick={() => void cancelBooking()}>
                  {cancelling ? "Cancelling…" : "Cancel appointment"}
                </button>
              ) : null}
              <p className="booking-disclaimer">This browser-specific management session is stored in an HttpOnly cookie. Keep using the same browser/device to manage this booking.</p>
            </>
          ) : null}
          <Link className="button button-primary" href="/">Return to home</Link>
        </section>
      </main>
    </>
  );
}
