const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("staging HTTP smoke check requires explicit non-production confirmation", () => {
  const script = read("scripts/v2-staging-check.mjs");
  assert.match(script, /STAGING_SUPABASE_CONFIRM_NON_PRODUCTION/);
  assert.match(script, /!== "YES"/);
  assert.match(script, /STAGING_SUPABASE_SERVICE_ROLE_KEY/);
});

test("staging HTTP smoke check does not create, cancel or delete bookings", () => {
  const script = read("scripts/v2-staging-check.mjs");
  assert.doesNotMatch(script, /rpc\/create_appointment_guest_session/);
  assert.doesNotMatch(script, /rpc\/cancel_appointment_by_guest_session/);
  assert.doesNotMatch(script, /method:\s*["']DELETE["']/i);
  assert.match(script, /rpc\/create_appointment_booking/);
  assert.match(script, /p_idempotency_key:\s*null/);
});

test("staging SQL verification is diagnostic-only and checks final role grants", () => {
  const sql = read("supabase/verification/v2_staging_smoke_tests.sql");
  assert.match(sql, /public_booking_enabled/);
  assert.match(sql, /has_function_privilege\('anon'/i);
  assert.match(sql, /has_function_privilege\('service_role'/i);
  assert.match(sql, /has_table_privilege\('anon'/i);
  assert.match(sql, /to_regclass/);
  assert.doesNotMatch(sql, /\b(insert|update|delete|drop|alter|create)\s+(into|table|policy|function|index)/i);
});

test("staging runbook keeps production isolated and requires a disabled-switch baseline", () => {
  const doc = read("docs/v2/STAGING_RUNBOOK.md");
  assert.match(doc, /Do not point V2 staging at the V1 production Supabase project/i);
  assert.match(doc, /public_booking_enabled/);
  assert.match(doc, /restore it to false/i);
  assert.match(doc, /007_v2_appointment_booking\.sql[\s\S]*012_v2_guest_booking_sessions\.sql/);
});

test("setup guide labels migration 008 grants as intermediate and points to final grants", () => {
  const setup = read("supabase/SETUP.md");
  assert.match(setup, /intermediate point \(after migration 008 and before migration 011\)/i);
  assert.match(setup, /Migration 011 revokes execution from `anon` and `authenticated`/);
  assert.match(setup, /v2_staging_smoke_tests\.sql/);
  assert.doesNotMatch(setup, /Expected: both functions appear[\s\S]{0,220}anonymous execution is granted/i);
});
