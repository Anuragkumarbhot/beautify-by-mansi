"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getStaffAccessToken } from "@/lib/staff-auth";

type Row = Record<string, unknown>;
type ConfigData = {
  services: Row[];
  resources: Row[];
  areas: Row[];
  mappings: Row[];
  availability: Row[];
  blackouts: Row[];
  settings: Row[];
};

const emptyConfig: ConfigData = {
  services: [], resources: [], areas: [], mappings: [], availability: [], blackouts: [], settings: [],
};

const weekdays = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

function value(row: Row, key: string) {
  return row[key] == null ? "" : String(row[key]);
}

function moneyFromRupees(valueText: string) {
  if (!valueText.trim()) return null;
  const amount = Number(valueText);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1000000) {
    throw new Error("Enter a valid price in rupees.");
  }
  return Math.round(amount * 100);
}

function istIso(valueText: string) {
  return new Date(valueText + (valueText.length === 16 ? ":00+05:30" : "+05:30")).toISOString();
}

export default function StaffConfigurationPage() {
  const [token, setToken] = useState<string | null>(null);
  const [config, setConfig] = useState<ConfigData>(emptyConfig);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function api(body?: Record<string, unknown>) {
    if (!token) throw new Error("Please sign in again.");
    const response = await fetch("/api/staff/config", {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: "Bearer " + token,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) {
      if (payload.error === "MANAGER_ACCESS_REQUIRED") {
        throw new Error("Configuration is restricted to owners and managers.");
      }
      throw new Error(payload.message || payload.error || "Configuration request failed.");
    }
    return payload;
  }

  async function reload(currentToken = token) {
    if (!currentToken) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/staff/config", {
        headers: { Authorization: "Bearer " + currentToken },
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error === "MANAGER_ACCESS_REQUIRED"
          ? "Configuration is restricted to owners and managers."
          : payload.error || "Could not load studio configuration.");
      }
      const received = payload.config as Partial<ConfigData>;
      setConfig({
        ...emptyConfig,
        ...received,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load configuration.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getStaffAccessToken().then((currentToken) => {
      if (!active) return;
      if (!currentToken) {
        setLoading(false);
        setError("Sign in through the staff calendar before opening configuration.");
        return;
      }
      setToken(currentToken);
      void reload(currentToken);
    }).catch(() => {
      if (active) {
        setLoading(false);
        setError("Could not restore the staff session. Sign in again.");
      }
    });
    return () => { active = false; };
    // Initial staff session restoration is intentionally run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(collection: keyof ConfigData, values: Row, action: "create" | "update" = "create", id?: string) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api({ collection, action, ...(id ? { id } : {}), values });
      setNotice(action === "create" ? "Configuration added." : "Configuration updated.");
      await reload();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save configuration.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(collection: keyof ConfigData, values: Row, id?: string) {
    if (!window.confirm("Delete this configuration entry? Existing appointments or foreign-key references may prevent deletion.")) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api({ collection, action: "delete", ...(id ? { id } : {}), values });
      setNotice("Configuration entry deleted.");
      await reload();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete entry.");
    } finally {
      setSaving(false);
    }
  }

  async function formSubmit(event: FormEvent<HTMLFormElement>, build: (form: FormData) => Promise<void>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await build(form);
      formElement.reset();
    } catch (formError) {
      setError(formError instanceof Error ? formError.message : "Invalid form details.");
    }
  }

  const currentSettings = config.settings[0] ?? {};
  const services = config.services;
  const staffResources = config.resources.filter((row) => row.resource_type === "staff");

  return (
    <main className="config-shell">
      <header className="config-header">
        <Link className="staff-wordmark" href="/">BEAUTIFY <span>BY MANSI</span></Link>
        <nav><Link href="/staff">Appointment calendar</Link><span>STUDIO CONFIGURATION</span></nav>
      </header>
      <section className="config-intro">
        <p className="staff-eyebrow">OWNER & MANAGER CONSOLE</p>
        <h1>Studio configuration</h1>
        <p>Set up bookable services, staff capabilities, weekly schedules, blackout periods and home-service coverage.</p>
        <div className="config-safety">Public online booking remains disabled. Saving configuration does not publish appointment slots.</div>
      </section>

      {error ? <p className="staff-alert" role="alert">{error}</p> : null}
      {notice ? <p className="staff-notice" role="status">{notice}</p> : null}
      {loading ? <div className="staff-empty">Loading configuration…</div> : null}

      {!loading && token ? (
        <div className="config-grid">
          <section className="config-card config-span-2">
            <div className="config-section-heading"><div><p className="staff-eyebrow">01 / CATALOGUE</p><h2>Services & pricing</h2></div><span>{services.length} configured</span></div>
            <form className="config-form config-service-form" onSubmit={(event) => void formSubmit(event, async (form) => {
              await save("services", {
                slug: String(form.get("slug")).trim().toLowerCase(),
                name: String(form.get("name")).trim(),
                category: String(form.get("category")).trim(),
                description: String(form.get("description") ?? ""),
                duration_minutes: Number(form.get("duration")),
                buffer_before_minutes: Number(form.get("bufferBefore")),
                buffer_after_minutes: Number(form.get("bufferAfter")),
                price_amount: moneyFromRupees(String(form.get("price") ?? "")),
                supports_studio: form.get("studio") === "on",
                supports_home: form.get("home") === "on",
                is_active: form.get("active") === "on",
              });
            })}>
              <label>Service name<input name="name" required maxLength={120} placeholder="Bridal makeup" /></label>
              <label>Slug<input name="slug" required pattern="[a-z0-9-]+" placeholder="bridal-makeup" /></label>
              <label>Category<input name="category" required maxLength={60} placeholder="Makeup" /></label>
              <label>Duration (minutes)<input name="duration" type="number" min="1" max="1440" defaultValue="90" required /></label>
              <label>Buffer before (min)<input name="bufferBefore" type="number" min="0" max="1440" defaultValue="0" /></label>
              <label>Buffer after (min)<input name="bufferAfter" type="number" min="0" max="1440" defaultValue="15" /></label>
              <label>Price (₹)<input name="price" type="number" min="0" step="0.01" placeholder="Leave empty if quote-based" /></label>
              <label className="config-full">Short description<textarea name="description" maxLength={1200} rows={2} /></label>
              <div className="config-checks"><label><input name="studio" type="checkbox" defaultChecked /> Studio</label><label><input name="home" type="checkbox" /> Home service</label><label><input name="active" type="checkbox" /> Active in booking catalogue</label></div>
              <button type="submit" disabled={saving}>Add service</button>
            </form>
            <div className="config-table-list">
              {services.map((service) => (
                <div className="config-row" key={value(service, "id")}>
                  <div><strong>{value(service, "name")}</strong><span>{value(service, "slug")} · {value(service, "duration_minutes")} min · {service.price_amount == null ? "Quote" : "₹" + (Number(service.price_amount) / 100).toFixed(2)}</span></div>
                  <div className="config-row-actions"><span className={service.is_active ? "config-live" : "config-inactive"}>{service.is_active ? "Active" : "Draft"}</span><button type="button" disabled={saving} onClick={() => void save("services", {
                    slug: value(service, "slug"), name: value(service, "name"), category: value(service, "category"),
                    description: value(service, "description"), duration_minutes: Number(service.duration_minutes),
                    buffer_before_minutes: Number(service.buffer_before_minutes), buffer_after_minutes: Number(service.buffer_after_minutes),
                    price_amount: service.price_amount == null ? null : Number(service.price_amount),
                    supports_studio: Boolean(service.supports_studio), supports_home: Boolean(service.supports_home),
                    is_active: !service.is_active,
                  }, "update", value(service, "id"))}>{service.is_active ? "Deactivate" : "Activate"}</button><button type="button" className="config-delete" disabled={saving} onClick={() => void remove("services", {}, value(service, "id"))}>Delete</button></div>
                </div>
              ))}
              {services.length === 0 ? <p className="config-hint">No services configured yet. Add your first service above.</p> : null}
            </div>
          </section>

          <section className="config-card">
            <div className="config-section-heading"><div><p className="staff-eyebrow">02 / TEAM</p><h2>Staff & resources</h2></div><span>{config.resources.length} resources</span></div>
            <form className="config-form" onSubmit={(event) => void formSubmit(event, async (form) => save("resources", {
              resource_type: String(form.get("type")),
              display_name: String(form.get("name")).trim(),
              is_active: form.get("active") === "on",
            }))}>
              <label>Resource type<select name="type"><option value="staff">Staff member</option><option value="studio_room">Studio room (future use)</option></select></label>
              <label>Display name<input name="name" required maxLength={120} placeholder="Mansi" /></label>
              <label className="config-inline-check"><input name="active" type="checkbox" /> Active</label>
              <button type="submit" disabled={saving}>Add resource</button>
            </form>
            <div className="config-table-list">
              {config.resources.map((resource) => (
                <div className="config-row" key={value(resource, "id")}>
                  <div><strong>{value(resource, "display_name")}</strong><span>{value(resource, "resource_type")}</span></div>
                  <div className="config-row-actions"><span className={resource.is_active ? "config-live" : "config-inactive"}>{resource.is_active ? "Active" : "Inactive"}</span><button type="button" disabled={saving} onClick={() => void save("resources", {
                    resource_type: String(resource.resource_type), display_name: value(resource, "display_name"),
                    is_active: !resource.is_active,
                  }, "update", value(resource, "id"))}>{resource.is_active ? "Deactivate" : "Activate"}</button></div>
                </div>
              ))}
            </div>
          </section>

          <section className="config-card">
            <div className="config-section-heading"><div><p className="staff-eyebrow">03 / ELIGIBILITY</p><h2>Staff service mapping</h2></div></div>
            <p className="config-hint">A staff member must be mapped to every service and location they can deliver. Room resources are not used by Phase B booking allocation.</p>
            <form className="config-form" onSubmit={(event) => void formSubmit(event, async (form) => save("mappings", {
              resource_id: String(form.get("resource")),
              service_id: String(form.get("service")),
              location_type: String(form.get("location")),
            }))}>
              <label>Staff resource<select name="resource" required defaultValue=""><option value="" disabled>Select staff</option>{staffResources.map((row) => <option key={value(row, "id")} value={value(row, "id")}>{value(row, "display_name")}</option>)}</select></label>
              <label>Service<select name="service" required defaultValue=""><option value="" disabled>Select service</option>{services.map((row) => <option key={value(row, "id")} value={value(row, "id")}>{value(row, "name")}</option>)}</select></label>
              <label>Location<select name="location"><option value="studio">Studio</option><option value="home">Home</option></select></label>
              <button type="submit" disabled={saving || !staffResources.length || !services.length}>Assign service</button>
            </form>
            <div className="config-table-list">
              {config.mappings.map((mapping) => {
                const resource = config.resources.find((r) => value(r, "id") === value(mapping, "resource_id"));
                const service = services.find((s) => value(s, "id") === value(mapping, "service_id"));
                return <div className="config-row" key={value(mapping, "resource_id") + value(mapping, "service_id") + value(mapping, "location_type")}>
                  <div><strong>{value(resource ?? {}, "display_name") || "Unknown resource"} → {value(service ?? {}, "name") || "Unknown service"}</strong><span>{value(mapping, "location_type")} service</span></div>
                  <div className="config-row-actions"><button className="config-delete" type="button" disabled={saving} onClick={() => void remove("mappings", mapping)}>Remove</button></div>
                </div>;
              })}
            </div>
          </section>

          <section className="config-card config-span-2">
            <div className="config-section-heading"><div><p className="staff-eyebrow">04 / AVAILABILITY</p><h2>Weekly working hours</h2></div><span>Asia/Kolkata</span></div>
            <form className="config-form config-schedule-form" onSubmit={(event) => void formSubmit(event, async (form) => save("availability", {
              resource_id: String(form.get("resource")),
              location_type: String(form.get("location")),
              weekday: Number(form.get("weekday")),
              opens_at: String(form.get("opens")),
              closes_at: String(form.get("closes")),
              slot_interval_minutes: Number(form.get("interval")),
              timezone_name: "Asia/Kolkata",
              effective_from: String(form.get("effectiveFrom") ?? "") || null,
              effective_until: String(form.get("effectiveUntil") ?? "") || null,
              is_active: form.get("active") === "on",
            }))}>
              <label>Staff resource<select name="resource" required defaultValue=""><option value="" disabled>Select staff</option>{staffResources.map((row) => <option key={value(row, "id")} value={value(row, "id")}>{value(row, "display_name")}</option>)}</select></label>
              <label>Location<select name="location"><option value="studio">Studio</option><option value="home">Home service</option></select></label>
              <label>Weekday<select name="weekday">{weekdays.map((day,index) => <option key={day} value={index}>{day}</option>)}</select></label>
              <label>Opens at<input name="opens" type="time" defaultValue="10:00" required /></label>
              <label>Closes at<input name="closes" type="time" defaultValue="18:00" required /></label>
              <label>Slot interval (min)<input name="interval" type="number" min="5" max="240" step="5" defaultValue="30" required /></label>
              <label>Effective from<input name="effectiveFrom" type="date" /></label>
              <label>Effective until<input name="effectiveUntil" type="date" /></label>
              <label className="config-inline-check"><input name="active" type="checkbox" /> Active schedule</label>
              <button type="submit" disabled={saving || !staffResources.length}>Add weekly rule</button>
            </form>
            <div className="config-table-list">
              {config.availability.map((rule) => {
                const resource = config.resources.find((r) => value(r, "id") === value(rule, "resource_id"));
                return <div className="config-row" key={value(rule, "id")}>
                  <div><strong>{value(resource ?? {}, "display_name")} · {weekdays[Number(rule.weekday)]}</strong><span>{value(rule, "location_type")} · {value(rule, "opens_at").slice(0,5)}–{value(rule, "closes_at").slice(0,5)} · every {value(rule, "slot_interval_minutes")} min</span></div>
                  <div className="config-row-actions"><span className={rule.is_active ? "config-live" : "config-inactive"}>{rule.is_active ? "Active" : "Inactive"}</span><button type="button" disabled={saving} onClick={() => void save("availability", {
                    resource_id: value(rule, "resource_id"), location_type: value(rule, "location_type"),
                    weekday: Number(rule.weekday), opens_at: value(rule, "opens_at"), closes_at: value(rule, "closes_at"),
                    slot_interval_minutes: Number(rule.slot_interval_minutes), timezone_name: "Asia/Kolkata",
                    effective_from: rule.effective_from == null ? null : value(rule, "effective_from"),
                    effective_until: rule.effective_until == null ? null : value(rule, "effective_until"),
                    is_active: !rule.is_active,
                  }, "update", value(rule, "id"))}>{rule.is_active ? "Deactivate" : "Activate"}</button><button type="button" className="config-delete" disabled={saving} onClick={() => void remove("availability", {}, value(rule, "id"))}>Delete</button></div>
                </div>;
              })}
            </div>
          </section>

          <section className="config-card">
            <div className="config-section-heading"><div><p className="staff-eyebrow">05 / HOME SERVICE</p><h2>Service areas</h2></div></div>
            <form className="config-form" onSubmit={(event) => void formSubmit(event, async (form) => save("areas", {
              name: String(form.get("name")).trim(),
              pincode: String(form.get("pincode")).trim(),
              city: String(form.get("city")).trim(),
              state: String(form.get("state")).trim(),
              travel_buffer_minutes: Number(form.get("travelBuffer")),
              is_active: form.get("active") === "on",
            }))}>
              <label>Area name<input name="name" required placeholder="Ludhiana central" /></label>
              <label>Six-digit pincode<input name="pincode" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder="141001" /></label>
              <label>City<input name="city" required defaultValue="Ludhiana" /></label>
              <label>State<input name="state" required defaultValue="Punjab" /></label>
              <label>Travel buffer (minutes)<input name="travelBuffer" type="number" min="0" max="1440" defaultValue="30" /></label>
              <label className="config-inline-check"><input name="active" type="checkbox" /> Active for home bookings</label>
              <button type="submit" disabled={saving}>Add service area</button>
            </form>
            <div className="config-table-list">
              {config.areas.map((area) => <div className="config-row" key={value(area, "id")}>
                <div><strong>{value(area, "name")} · {value(area, "pincode")}</strong><span>{value(area, "city")}, {value(area, "state")} · {value(area, "travel_buffer_minutes")} min travel buffer</span></div>
                <div className="config-row-actions"><span className={area.is_active ? "config-live" : "config-inactive"}>{area.is_active ? "Active" : "Inactive"}</span><button type="button" disabled={saving} onClick={() => void save("areas", {
                    name: value(area, "name"), pincode: value(area, "pincode"), city: value(area, "city"),
                    state: value(area, "state"), travel_buffer_minutes: Number(area.travel_buffer_minutes),
                    is_active: !area.is_active,
                  }, "update", value(area, "id"))}>{area.is_active ? "Deactivate" : "Activate"}</button><button type="button" className="config-delete" disabled={saving} onClick={() => void remove("areas", {}, value(area, "id"))}>Delete</button></div>
              </div>)}
            </div>
          </section>

          <section className="config-card">
            <div className="config-section-heading"><div><p className="staff-eyebrow">06 / EXCEPTIONS</p><h2>Blackout periods</h2></div></div>
            <form className="config-form" onSubmit={(event) => void formSubmit(event, async (form) => save("blackouts", {
              resource_id: String(form.get("resource")),
              starts_at: istIso(String(form.get("startsAt"))),
              ends_at: istIso(String(form.get("endsAt"))),
              reason: String(form.get("reason") ?? ""),
            }))}>
              <label>Staff resource<select name="resource" required defaultValue=""><option value="" disabled>Select staff</option>{staffResources.map((row) => <option key={value(row, "id")} value={value(row, "id")}>{value(row, "display_name")}</option>)}</select></label>
              <label>Starts (IST)<input name="startsAt" type="datetime-local" required /></label>
              <label>Ends (IST)<input name="endsAt" type="datetime-local" required /></label>
              <label>Reason<input name="reason" maxLength={240} placeholder="Leave / holiday / private event" /></label>
              <button type="submit" disabled={saving || !staffResources.length}>Add blackout</button>
            </form>
            <div className="config-table-list">
              {config.blackouts.map((blackout) => <div className="config-row" key={value(blackout, "id")}>
                <div><strong>{value(config.resources.find((r) => value(r, "id") === value(blackout, "resource_id")) ?? {}, "display_name")}</strong><span>{new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",dateStyle:"medium",timeStyle:"short"}).format(new Date(value(blackout,"starts_at")))} – {new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",dateStyle:"medium",timeStyle:"short"}).format(new Date(value(blackout,"ends_at")))} · {value(blackout,"reason")}</span></div>
                <div className="config-row-actions"><button type="button" className="config-delete" disabled={saving} onClick={() => void remove("blackouts", {}, value(blackout, "id"))}>Delete</button></div>
              </div>)}
            </div>
          </section>

          <section className="config-card">
            <div className="config-section-heading"><div><p className="staff-eyebrow">07 / BOOKING RULES</p><h2>Booking limits</h2></div></div>
            <form className="config-form" onSubmit={(event) => void formSubmit(event, async (form) => save("settings", {
              timezone_name: "Asia/Kolkata",
              minimum_notice_minutes: Number(form.get("notice")),
              booking_horizon_days: Number(form.get("horizon")),
            }, "update"))}>
              <label>Minimum notice (minutes)<input name="notice" type="number" min="0" max="525600" defaultValue={value(currentSettings, "minimum_notice_minutes") || "1440"} required /></label>
              <label>Booking horizon (days)<input name="horizon" type="number" min="1" max="365" defaultValue={value(currentSettings, "booking_horizon_days") || "60"} required /></label>
              <button type="submit" disabled={saving || !config.settings.length}>Save booking limits</button>
            </form>
            <div className="config-safety config-safety-small">Public booking switch: <strong>{currentSettings.public_booking_enabled ? "Enabled in database" : "Disabled"}</strong>. This console cannot enable it.</div>
          </section>
        </div>
      ) : null}
      <footer className="staff-footer">Only active owners and managers can save booking configuration · All times use Asia/Kolkata</footer>
    </main>
  );
}
