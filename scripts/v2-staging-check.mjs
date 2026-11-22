import { randomUUID } from "node:crypto";

const names = [
  "STAGING_SUPABASE_URL",
  "STAGING_SUPABASE_ANON_KEY",
  "STAGING_SUPABASE_SERVICE_ROLE_KEY",
  "STAGING_SUPABASE_CONFIRM_NON_PRODUCTION",
];

function loadConfig() {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error("Missing required environment variables: " + missing.join(", "));
  }
  if (process.env.STAGING_SUPABASE_CONFIRM_NON_PRODUCTION !== "YES") {
    throw new Error("Set STAGING_SUPABASE_CONFIRM_NON_PRODUCTION=YES only after confirming this is an isolated non-production project.");
  }

  const parsed = new URL(process.env.STAGING_SUPABASE_URL);
  const localHost = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && localHost)) {
    throw new Error("The staging Supabase URL must use HTTPS (HTTP is allowed only for localhost).");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.pathname !== "/" && parsed.pathname !== "")) {
    throw new Error("STAGING_SUPABASE_URL must be the project origin only, without credentials, path, query or fragment.");
  }

  return {
    restUrl: parsed.origin.replace(/\/+$/, "") + "/rest/v1",
    anonKey: process.env.STAGING_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function request(restUrl, key, path, method, payload) {
  const response = await fetch(restUrl + "/" + path, {
    method,
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const body = await response.text();
  return { status: response.status, body };
}

function parseJson(result, label) {
  try {
    return JSON.parse(result.body);
  } catch {
    throw new Error(label + " returned non-JSON content (HTTP " + result.status + ").");
  }
}

function isPermissionDenied(result) {
  return result.status === 401
    || result.status === 403
    || (result.status === 400 && /(42501|permission denied|not authorized)/i.test(result.body));
}

async function main() {
  const config = loadConfig();
  let passed = 0;
  let failed = 0;

  async function check(label, operation) {
    try {
      await operation();
      passed += 1;
      console.log("PASS " + label);
    } catch (error) {
      failed += 1;
      console.error("FAIL " + label + ": " + error.message);
    }
  }

  await check("staging booking switch is present and disabled", async () => {
    const result = await request(
      config.restUrl,
      config.serviceRoleKey,
      "appointment_booking_settings?select=public_booking_enabled&id=eq.1",
      "GET",
    );
    if (result.status !== 200) throw new Error("HTTP " + result.status);
    const rows = parseJson(result, "Booking settings");
    if (!Array.isArray(rows) || rows.length !== 1 || rows[0].public_booking_enabled !== false) {
      throw new Error("Expected exactly one settings row with public_booking_enabled=false.");
    }
  });

  const testServiceId = randomUUID();
  const availabilityArgs = {
    p_date: "2035-01-01",
    p_location_type: "studio",
    p_service_ids: [testServiceId],
    p_postal_code: null,
  };

  await check("anon cannot execute the availability RPC directly", async () => {
    const result = await request(
      config.restUrl,
      config.anonKey,
      "rpc/get_appointment_availability",
      "POST",
      availabilityArgs,
    );
    if (!isPermissionDenied(result)) throw new Error("Expected a permission-denied response; received HTTP " + result.status + ".");
  });

  await check("service role can call availability while booking is disabled", async () => {
    const result = await request(
      config.restUrl,
      config.serviceRoleKey,
      "rpc/get_appointment_availability",
      "POST",
      availabilityArgs,
    );
    if (result.status !== 200) throw new Error("HTTP " + result.status);
    const slots = parseJson(result, "Availability RPC");
    if (!Array.isArray(slots) || slots.length !== 0) {
      throw new Error("Expected no slots while public booking is disabled.");
    }
  });

  await check("anon cannot execute the booking-creation RPC directly", async () => {
    const invalidBookingArgs = {
      p_idempotency_key: null,
      p_service_ids: [],
      p_starts_at: null,
      p_location_type: "studio",
      p_customer_name: "",
      p_customer_phone: "",
      p_customer_email: "",
      p_event_type: "",
      p_customer_notes: "",
      p_address_line1: null,
      p_address_line2: null,
      p_locality: null,
      p_postal_code: null,
    };
    const result = await request(
      config.restUrl,
      config.anonKey,
      "rpc/create_appointment_booking",
      "POST",
      invalidBookingArgs,
    );
    if (!isPermissionDenied(result)) throw new Error("Expected a permission-denied response; received HTTP " + result.status + ".");
  });

  await check("anon cannot execute guest-session lookup directly", async () => {
    const invalidButWellFormedDigest = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
    const result = await request(
      config.restUrl,
      config.anonKey,
      "rpc/get_appointment_by_guest_session",
      "POST",
      { p_session_hash: invalidButWellFormedDigest },
    );
    if (!isPermissionDenied(result)) throw new Error("Expected a permission-denied response; received HTTP " + result.status + ".");
  });

  await check("anon cannot read guest-session storage directly", async () => {
    const result = await request(
      config.restUrl,
      config.anonKey,
      "appointment_guest_sessions?select=id&limit=1",
      "GET",
    );
    if (!isPermissionDenied(result)) throw new Error("Expected a permission-denied response; received HTTP " + result.status + ".");
  });

  console.log("");
  console.log("Staging smoke checks: " + passed + " passed, " + failed + " failed.");
  if (failed > 0) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  console.error("Staging smoke check aborted: " + error.message);
  process.exitCode = 1;
}
