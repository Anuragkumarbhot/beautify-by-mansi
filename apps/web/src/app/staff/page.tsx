"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  getStaffAccessToken,
  staffSignIn,
  staffSignOut,
} from "@/lib/staff-auth";

type AppointmentItem = {
  service_name_snapshot: string;
  duration_snapshot_minutes: number;
  unit_price_snapshot_amount: number | null;
};

type Appointment = {
  id: string;
  reference: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  event_type: string;
  location_type: "studio" | "home";
  address_line1: string | null;
  address_line2: string | null;
  locality: string | null;
  postal_code: string | null;
  address_city: string | null;
  address_state: string | null;
  starts_at: string;
  ends_at: string;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
  payment_status: string;
  customer_notes: string;
  appointment_booking_items: AppointmentItem[];
};

const statuses = ["all", "confirmed", "cancelled", "completed", "no_show"] as const;

function indiaDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + "-" + values.month + "-" + values.day;
}

function formatIndiaDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function dayBounds(date: string) {
  const start = new Date(date + "T00:00:00+05:30");
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { from: start.toISOString(), to: end.toISOString() };
}

function localDateTimeValue(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + "-" + values.month + "-" + values.day + "T" + values.hour + ":" + values.minute;
}

export default function StaffAppointmentsPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [date, setDate] = useState(() => indiaDate(new Date()));
  const [status, setStatus] = useState<(typeof statuses)[number]>("all");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [rescheduleId, setRescheduleId] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  async function loadAppointments(token: string, selectedDate = date, selectedStatus = status) {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const bounds = dayBounds(selectedDate);
      const query = new URLSearchParams({ ...bounds, status: selectedStatus });
      const response = await fetch("/api/staff/appointments?" + query.toString(), {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error === "STAFF_ACCESS_REQUIRED"
          ? "This account is not an active appointment staff member."
          : payload.error || "Could not load appointments.");
      }
      setAppointments(Array.isArray(payload.appointments) ? payload.appointments as Appointment[] : []);
    } catch (loadError) {
      setAppointments([]);
      setError(loadError instanceof Error ? loadError.message : "Could not load appointments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getStaffAccessToken().then((token) => {
      if (!active || !token) return;
      setAccessToken(token);
      void loadAppointments(token, indiaDate(new Date()), "all");
    }).catch(() => {
      if (active) setError("Could not restore the staff session. Sign in again.");
    });
    return () => { active = false; };
    // Initial session restoration intentionally runs once on page entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginLoading(true);
    setError("");
    try {
      const token = await staffSignIn(email, password);
      setAccessToken(token);
      setPassword("");
      await loadAppointments(token);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Sign-in failed.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSignOut() {
    await staffSignOut();
    setAccessToken(null);
    setAppointments([]);
    setNotice("");
    setError("");
  }

  async function updateStatus(id: string, nextStatus: "cancelled" | "completed" | "no_show") {
    if (!accessToken) return;
    if (nextStatus === "cancelled" && !window.confirm("Cancel this appointment? Its staff reservation will be released.")) return;
    setSavingId(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/staff/appointments/" + id, {
        method: "PATCH",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Appointment update failed.");
      setNotice("Appointment " + nextStatus.replace("_", " ") + ".");
      await loadAppointments(accessToken);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Appointment update failed.");
    } finally {
      setSavingId("");
    }
  }

  async function submitReschedule(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (!accessToken || !rescheduleDate || !rescheduleTime) return;
    setSavingId(id);
    setError("");
    setNotice("");
    try {
      // Studio operations use Asia/Kolkata. PostgreSQL validates the actual slot.
      const startsAt = new Date(rescheduleDate + "T" + rescheduleTime + ":00+05:30").toISOString();
      const response = await fetch("/api/staff/appointments/" + id + "/reschedule", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ startsAt }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Rescheduling failed.");
      setRescheduleId("");
      setNotice("Appointment rescheduled. Availability was checked by the database.");
      await loadAppointments(accessToken);
    } catch (rescheduleError) {
      setError(rescheduleError instanceof Error ? rescheduleError.message : "Rescheduling failed.");
    } finally {
      setSavingId("");
    }
  }

  const activeCount = appointments.filter((item) => item.status === "confirmed").length;

  return (
    <main className="staff-shell">
      <header className="staff-header">
        <Link className="staff-wordmark" href="/">BEAUTIFY <span>BY MANSI</span></Link>
        <div className="staff-header-right">
          <span>STUDIO OPERATIONS</span>
          {accessToken ? <><Link className="staff-text-button" href="/staff/config">Configuration</Link><button type="button" className="staff-text-button" onClick={handleSignOut}>Sign out</button></> : null}
        </div>
      </header>

      {!accessToken ? (
        <section className="staff-login-panel">
          <p className="staff-eyebrow">PRIVATE STAFF AREA</p>
          <h1>Studio appointments</h1>
          <p className="staff-subtitle">Sign in with the Supabase account provisioned for appointment staff.</p>
          <form className="staff-login-form" onSubmit={handleLogin}>
            <label>Email address<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <button type="submit" disabled={loginLoading}>{loginLoading ? "Signing in…" : "Sign in securely"}</button>
          </form>
          {error ? <p className="staff-alert" role="alert">{error}</p> : null}
          <p className="staff-login-note">Staff access is checked against the appointment_staff_members table. Signing in alone does not grant access.</p>
        </section>
      ) : (
        <section className="staff-dashboard">
          <div className="staff-page-heading">
            <div>
              <p className="staff-eyebrow">APPOINTMENT MANAGEMENT</p>
              <h1>Studio calendar</h1>
              <p className="staff-subtitle">Customer details are visible only to authenticated, active staff.</p>
            </div>
            <div className="staff-summary">
              <strong>{activeCount}</strong>
              <span>confirmed in results</span>
            </div>
          </div>

          <div className="staff-toolbar">
            <label>Appointment date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <label>Status
              <select value={status} onChange={(event) => setStatus(event.target.value as (typeof statuses)[number])}>
                {statuses.map((value) => <option key={value} value={value}>{value === "all" ? "All statuses" : value.replace("_", " ")}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => void loadAppointments(accessToken)} disabled={loading}>
              {loading ? "Loading…" : "Refresh calendar"}
            </button>
          </div>

          {error ? <p className="staff-alert" role="alert">{error}</p> : null}
          {notice ? <p className="staff-notice" role="status">{notice}</p> : null}

          <div className="staff-list-heading">
            <h2>{new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full" }).format(new Date(date + "T00:00:00+05:30"))}</h2>
            <span>{appointments.length} appointment{appointments.length === 1 ? "" : "s"}</span>
          </div>

          {loading ? <div className="staff-empty">Loading appointments…</div> : null}
          {!loading && appointments.length === 0 ? (
            <div className="staff-empty">No appointments found for this date and filter.</div>
          ) : null}

          <div className="staff-appointments">
            {appointments.map((appointment) => (
              <article className="staff-appointment-card" key={appointment.id}>
                <div className="staff-appointment-time">
                  <strong>{formatIndiaDate(appointment.starts_at).split(", ").slice(-1)[0]}</strong>
                  <span>{formatIndiaDate(appointment.ends_at)}</span>
                </div>
                <div className="staff-appointment-main">
                  <div className="staff-card-title-row">
                    <h3>{appointment.customer_name}</h3>
                    <span className={"staff-status staff-status-" + appointment.status}>{appointment.status.replace("_", " ")}</span>
                  </div>
                  <p className="staff-reference">{appointment.reference} · {appointment.event_type} · {appointment.location_type === "home" ? "Home service" : "Studio"}</p>
                  <div className="staff-contact">
                    <a href={"tel:" + appointment.customer_phone}>{appointment.customer_phone}</a>
                    {appointment.customer_email ? <a href={"mailto:" + appointment.customer_email}>{appointment.customer_email}</a> : null}
                  </div>
                  {appointment.location_type === "home" ? (
                    <p className="staff-address">{[appointment.address_line1, appointment.address_line2, appointment.locality, appointment.postal_code, appointment.address_city, appointment.address_state].filter(Boolean).join(", ")}</p>
                  ) : null}
                  <div className="staff-service-list">
                    {(appointment.appointment_booking_items ?? []).map((item, index) => (
                      <span key={appointment.id + "-service-" + index}>{item.service_name_snapshot} · {item.duration_snapshot_minutes} min</span>
                    ))}
                  </div>
                  {appointment.customer_notes ? <p className="staff-customer-notes">Note: {appointment.customer_notes}</p> : null}
                  <div className="staff-actions">
                    {appointment.status === "confirmed" ? (
                      <>
                        <button type="button" className="staff-action-primary" disabled={savingId === appointment.id} onClick={() => void updateStatus(appointment.id, "completed")}>Complete</button>
                        <button type="button" disabled={savingId === appointment.id} onClick={() => void updateStatus(appointment.id, "no_show")}>No-show</button>
                        <button type="button" disabled={savingId === appointment.id} onClick={() => {
                          setRescheduleId(rescheduleId === appointment.id ? "" : appointment.id);
                          setRescheduleDate(indiaDate(new Date(appointment.starts_at)));
                          setRescheduleTime(localDateTimeValue(appointment.starts_at).slice(11, 16));
                        }}>Reschedule</button>
                        <button type="button" className="staff-action-danger" disabled={savingId === appointment.id} onClick={() => void updateStatus(appointment.id, "cancelled")}>Cancel</button>
                      </>
                    ) : <span className="staff-terminal-note">This appointment is closed.</span>}
                  </div>
                  {rescheduleId === appointment.id && appointment.status === "confirmed" ? (
                    <form className="staff-reschedule-form" onSubmit={(event) => void submitReschedule(event, appointment.id)}>
                      <label>New date<input type="date" required min={indiaDate(new Date())} value={rescheduleDate} onChange={(event) => setRescheduleDate(event.target.value)} /></label>
                      <label>New time<input type="time" required value={rescheduleTime} onChange={(event) => setRescheduleTime(event.target.value)} /></label>
                      <button type="submit" disabled={savingId === appointment.id}>{savingId === appointment.id ? "Saving…" : "Confirm reschedule"}</button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <footer className="staff-footer">Private studio workspace · Times shown in Asia/Kolkata (IST)</footer>
    </main>
  );
}
