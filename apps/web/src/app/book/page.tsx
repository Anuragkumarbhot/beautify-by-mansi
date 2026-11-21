"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { StoreHeader } from "@/components/store-header";

type AppointmentService = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  duration_minutes: number;
  currency: "INR";
  supports_studio: boolean;
  supports_home: boolean;
};

type Slot = {
  starts_at: string;
  ends_at: string;
  available_resources: number;
};

type BookingConfirmation = {
  reference: string;
  startsAt: string;
  endsAt: string;
  locationType: "studio" | "home";
  status: string;
};

function todayInIndia() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + "-" + values.month + "-" + values.day;
}

function formatIndiaDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatIndiaTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

export default function BookPage() {
  const [services, setServices] = useState<AppointmentService[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [locationType, setLocationType] = useState<"studio" | "home">("studio");
  const [date, setDate] = useState(todayInIndia);
  const [postalCode, setPostalCode] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [eventType, setEventType] = useState("Makeup / Beauty appointment");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [locality, setLocality] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [catalogueMessage, setCatalogueMessage] = useState("");
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadServices() {
      try {
        const response = await fetch("/api/booking/services", {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || "The service catalogue is not available.");
        }
        setServices(Array.isArray(payload.services) ? payload.services : []);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setCatalogueMessage(
            loadError instanceof Error
              ? loadError.message
              : "The service catalogue is temporarily unavailable."
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoadingServices(false);
      }
    }
    void loadServices();
    return () => controller.abort();
  }, []);

  const selectedServices = useMemo(
    () => services.filter((service) => selectedServiceIds.includes(service.id)),
    [services, selectedServiceIds]
  );

  const totalDuration = selectedServices.reduce(
    (total, service) => total + service.duration_minutes,
    0
  );

  const locationEligible = selectedServices.every((service) =>
    locationType === "studio" ? service.supports_studio : service.supports_home
  );

  function toggleService(serviceId: string) {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    );
    setSlots([]);
    setSelectedSlot("");
    setError("");
    idempotencyKey.current = null;
  }

  function changeLocation(value: "studio" | "home") {
    setLocationType(value);
    setSlots([]);
    setSelectedSlot("");
    setError("");
    idempotencyKey.current = null;
  }

  async function findSlots() {
    if (selectedServiceIds.length === 0) {
      setError("Choose at least one service first.");
      return;
    }
    if (!locationEligible) {
      setError("One or more selected services are not available at this location.");
      return;
    }
    if (locationType === "home" && !/^\d{6}$/.test(postalCode)) {
      setError("Enter a valid six-digit home-service pincode.");
      return;
    }

    setLoadingSlots(true);
    setError("");
    setSlots([]);
    setSelectedSlot("");

    const query = new URLSearchParams({
      date,
      location: locationType,
      serviceIds: selectedServiceIds.join(","),
    });
    if (locationType === "home") query.set("postalCode", postalCode);

    try {
      const response = await fetch("/api/booking/availability?" + query.toString(), {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Availability could not be checked.");
      }
      setSlots(Array.isArray(payload.slots) ? payload.slots : []);
      if (!Array.isArray(payload.slots) || payload.slots.length === 0) {
        setError("No available slots were returned for this date. Try another date or location.");
      }
    } catch (slotError) {
      setError(
        slotError instanceof Error
          ? slotError.message
          : "Live availability is temporarily unavailable."
      );
    } finally {
      setLoadingSlots(false);
    }
  }

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlot) {
      setError("Select an available appointment time.");
      return;
    }
    if (locationType === "home" && (!addressLine1.trim() || !/^\d{6}$/.test(postalCode))) {
      setError("Enter your home address and valid six-digit pincode.");
      return;
    }

    setSubmitting(true);
    setError("");
    if (!idempotencyKey.current) {
      idempotencyKey.current = crypto.randomUUID();
    }

    const requestBody = {
      idempotencyKey: idempotencyKey.current,
      serviceIds: selectedServiceIds,
      startsAt: selectedSlot,
      locationType,
      customerName,
      customerPhone,
      customerEmail,
      eventType,
      customerNotes,
      ...(locationType === "home"
        ? { addressLine1, addressLine2, locality, postalCode }
        : {}),
    };

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const payload = await response.json();
      if (!response.ok || !payload.booking) {
        if (response.status === 409) {
          setSlots([]);
          setSelectedSlot("");
        }
        throw new Error(payload.message || "The appointment could not be confirmed.");
      }
      setConfirmation(payload.booking as BookingConfirmation);
      idempotencyKey.current = null;
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The appointment could not be confirmed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <>
        <StoreHeader />
        <main className="booking-page">
          <section className="booking-confirmation">
            <p className="eyebrow">APPOINTMENT CONFIRMED</p>
            <h1>Your beauty moment<br /><em>is reserved.</em></h1>
            <p className="booking-reference-label">Booking reference</p>
            <p className="booking-reference">{confirmation.reference}</p>
            <div className="booking-summary">
              <p><strong>Date</strong><span>{formatIndiaDate(confirmation.startsAt)}</span></p>
              <p><strong>Time</strong><span>{formatIndiaTime(confirmation.startsAt)}</span></p>
              <p><strong>Location</strong><span>{confirmation.locationType === "studio" ? "Studio appointment" : "Home service"}</span></p>
              <p><strong>Status</strong><span>{confirmation.status}</span></p>
            </div>
            <p className="booking-disclaimer">Payment is not collected through this booking flow. A secure management session has been saved in this browser.</p>
            <Link className="button button-primary" href="/booking/manage">View or cancel this appointment</Link>
            <Link className="booking-home-link" href="/">Return to home</Link>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <StoreHeader />
      <main className="booking-page">
        <section className="booking-intro">
          <p className="eyebrow">BEAUTIFY BY MANSI · APPOINTMENTS</p>
          <h1>Make time for<br /><em>yourself.</em></h1>
          <p>Choose your service, select studio or home, and check the appointment times configured by the studio.</p>
        </section>

        <form className="booking-layout" onSubmit={submitBooking}>
          <div className="booking-main">
            <section className="booking-panel">
              <p className="booking-step">01 · YOUR SERVICE</p>
              <h2>What would you like to book?</h2>
              {loadingServices ? (
                <p className="booking-muted">Loading available services…</p>
              ) : catalogueMessage ? (
                <p className="booking-alert" role="alert">{catalogueMessage}</p>
              ) : services.length === 0 ? (
                <p className="booking-muted">The studio has not published bookable services yet. Please contact the studio while the appointment catalogue is being configured.</p>
              ) : (
                <div className="booking-service-list">
                  {services.map((service) => (
                    <label className="booking-service-option" key={service.id}>
                      <input
                        type="checkbox"
                        checked={selectedServiceIds.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                      />
                      <span className="booking-service-copy">
                        <strong>{service.name}</strong>
                        <small>{service.category} · {service.duration_minutes} min · {[
                          service.supports_studio ? "Studio" : "",
                          service.supports_home ? "Home" : "",
                        ].filter(Boolean).join(" / ")}</small>
                        {service.description ? <small>{service.description}</small> : null}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            <section className="booking-panel">
              <p className="booking-step">02 · APPOINTMENT LOCATION</p>
              <h2>Where should we meet?</h2>
              <div className="booking-location-options">
                <label className={locationType === "studio" ? "booking-location-option selected" : "booking-location-option"}>
                  <input type="radio" name="location" value="studio" checked={locationType === "studio"} onChange={() => changeLocation("studio")} />
                  <span><strong>At the studio</strong><small>Visit the Beautify by Mansi studio.</small></span>
                </label>
                <label className={locationType === "home" ? "booking-location-option selected" : "booking-location-option"}>
                  <input type="radio" name="location" value="home" checked={locationType === "home"} onChange={() => changeLocation("home")} />
                  <span><strong>At my location</strong><small>Subject to active home-service pincode coverage.</small></span>
                </label>
              </div>
              {locationType === "home" ? (
                <div className="booking-fields">
                  <label>Address line 1<input required maxLength={200} value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} autoComplete="address-line1" /></label>
                  <label>Address line 2 <span>(optional)</span><input maxLength={200} value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} autoComplete="address-line2" /></label>
                  <label>Area / locality <span>(optional)</span><input maxLength={120} value={locality} onChange={(e) => setLocality(e.target.value)} autoComplete="address-level3" /></label>
                  <label>Six-digit pincode<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={postalCode} onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="postal-code" /></label>
                </div>
              ) : null}
            </section>

            <section className="booking-panel">
              <p className="booking-step">03 · DATE & TIME</p>
              <h2>Find your appointment.</h2>
              <div className="booking-slot-search">
                <label>Preferred date<input type="date" required min={todayInIndia()} value={date} onChange={(e) => { setDate(e.target.value); setSlots([]); setSelectedSlot(""); }} /></label>
                <button className="button button-primary" type="button" onClick={() => void findSlots()} disabled={loadingSlots || selectedServiceIds.length === 0 || !locationEligible}>
                  {loadingSlots ? "Checking…" : "Check available times"}
                </button>
              </div>
              {slots.length > 0 ? (
                <div className="booking-slot-list" role="group" aria-label="Available appointment times">
                  {slots.map((slot) => (
                    <button
                      className={selectedSlot === slot.starts_at ? "booking-slot selected" : "booking-slot"}
                      type="button"
                      key={slot.starts_at}
                      onClick={() => { setSelectedSlot(slot.starts_at); idempotencyKey.current = null; }}
                    >
                      {formatIndiaTime(slot.starts_at)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="booking-muted">Available times appear here after you check a date.</p>
              )}
            </section>

            <section className="booking-panel">
              <p className="booking-step">04 · YOUR DETAILS</p>
              <h2>Who are we preparing for?</h2>
              <div className="booking-fields">
                <label>Full name<input required minLength={1} maxLength={80} value={customerName} onChange={(e) => setCustomerName(e.target.value)} autoComplete="name" /></label>
                <label>Mobile number<input required minLength={10} maxLength={20} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} inputMode="tel" autoComplete="tel" /></label>
                <label>Email <span>(optional)</span><input type="email" maxLength={254} value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} autoComplete="email" /></label>
                <label>Occasion / event<input required maxLength={100} value={eventType} onChange={(e) => setEventType(e.target.value)} /></label>
                <label className="booking-field-wide">Notes <span>(optional)</span><textarea maxLength={1000} rows={3} value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} /></label>
              </div>
            </section>
          </div>

          <aside className="booking-sidebar">
            <p className="booking-step">YOUR APPOINTMENT</p>
            <h2>Review your details.</h2>
            {selectedServices.length ? (
              <ul className="booking-review-services">
                {selectedServices.map((service) => <li key={service.id}><span>{service.name}</span><small>{service.duration_minutes} min</small></li>)}
              </ul>
            ) : <p className="booking-muted">Your selected services will appear here.</p>}
            <div className="booking-review-row"><span>Estimated duration</span><strong>{totalDuration ? totalDuration + " min" : "—"}</strong></div>
            <div className="booking-review-row"><span>Location</span><strong>{locationType === "studio" ? "Studio" : "Home service"}</strong></div>
            <div className="booking-review-row"><span>Date</span><strong>{date || "—"}</strong></div>
            <div className="booking-review-row"><span>Time</span><strong>{selectedSlot ? formatIndiaTime(selectedSlot) : "Not selected"}</strong></div>
            {error ? <p className="booking-alert" role="alert">{error}</p> : null}
            <button className="button button-primary booking-submit" type="submit" disabled={submitting || !selectedSlot || selectedServices.length === 0}>
              {submitting ? "Confirming…" : "Confirm appointment"}
            </button>
            <p className="booking-disclaimer">Your slot is confirmed only after the booking system accepts the reservation. No payment is taken here.</p>
          </aside>
        </form>
      </main>
    </>
  );
}
