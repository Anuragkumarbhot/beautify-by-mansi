const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("V2 booking and availability RPCs cannot be called by browser roles", () => {
  const migration = read("supabase/migrations/011_v2_public_api_security.sql");
  assert.match(migration, /revoke all on function public\.get_appointment_availability[\s\S]*?from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.get_appointment_availability[\s\S]*?to service_role/i);
  assert.match(migration, /revoke all on function public\.create_appointment_booking[\s\S]*?from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.create_appointment_booking[\s\S]*?to service_role/i);
});

test("rate-limit storage is RLS protected and has no browser table grants", () => {
  const migration = read("supabase/migrations/011_v2_public_api_security.sql");
  assert.match(migration, /alter table public\.api_rate_limit_buckets enable row level security/i);
  assert.match(migration, /revoke all on public\.api_rate_limit_buckets from public, anon, authenticated/i);
  assert.match(migration, /create or replace function public\.consume_api_rate_limit/i);
  assert.match(migration, /grant execute on function public\.consume_api_rate_limit[\s\S]*?to service_role/i);
  assert.match(migration, /p_limit < 1 or p_limit > 120/i);
  assert.match(migration, /p_window_seconds < 1 or p_window_seconds > 3600/i);
});

test("public availability endpoint rate-limits before querying Supabase", () => {
  const route = read("apps/web/src/app/api/booking/availability/route.ts");
  assert.match(route, /enforcePublicRateLimit\(request, "booking_availability", 45, 60\)/);
  assert.ok(route.indexOf('const rateLimit = await enforcePublicRateLimit') < route.indexOf('const slots = await supabaseRestAsServiceRole'));
});

test("public booking endpoint rate-limits and bounds its request body", () => {
  const route = read("apps/web/src/app/api/bookings/route.ts");
  assert.match(route, /enforcePublicRateLimit\(request, "booking_create", 5, 600\)/);
  assert.match(route, /MAX_BOOKING_BODY_BYTES = 16 \* 1024/);
  assert.match(route, /supabaseRestAsServiceRole/);
});

test("service-role Supabase access is marked server-only and never uses a public key name", () => {
  const client = read("apps/web/src/lib/supabase-rest.ts");
  assert.match(client, /^import "server-only";/);
  assert.match(client, /getServerEnv\(\)/);
  assert.match(client, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(client, /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
});

test("staff configuration permissions remain owner and manager only", () => {
  const migration = read("supabase/migrations/010_v2_staff_configuration_permissions.sql");
  assert.match(migration, /m\.role in \('owner', 'manager'\)/);
  assert.match(migration, /Appointment managers manage services/);
  assert.match(migration, /Appointment managers manage availability rules/);
});

test("Next.js emits baseline security headers", () => {
  const config = read("apps/web/next.config.ts");
  for (const header of [
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Strict-Transport-Security",
  ]) {
    assert.ok(config.includes(header), "Missing header: " + header);
  }
});

test("patched dependency baselines stay above the current audited fixes", () => {
  const pkg = JSON.parse(read("apps/web/package.json"));
  const rootPackage = JSON.parse(read("package.json"));
  assert.equal(rootPackage.overrides.postcss, "8.5.23");
  assert.equal(pkg.dependencies.next, "15.5.29");
  assert.equal(pkg.devDependencies["eslint-config-next"], "15.5.29");
  assert.equal(pkg.dependencies.zod, "4.6.7");
  assert.equal(pkg.devDependencies.postcss, "8.5.23");
});

test("booking input regexes validate digits rather than literal backslashes", () => {
  const availability = read("apps/web/src/app/api/booking/availability/route.ts");
  const booking = read("apps/web/src/app/api/bookings/route.ts");
  assert.ok(availability.includes('.regex(/^\\d{4}-\\d{2}-\\d{2}$/)'));
  assert.ok(availability.includes('!/^\\d{6}$/.test(postalCode)'));
  assert.ok(booking.includes('value.replace(/\\D/g, ""'));
  assert.ok(booking.includes('postalCode: z.string().regex(/^\\d{6}$/)'));
});
