# V2 Staging Runbook

This runbook prepares an isolated staging environment for the V2 appointment workflow. It does not deploy the app, apply migrations, change the production database, or enable production booking.

## 1. Environment boundaries

Use a dedicated Supabase staging project and a dedicated Vercel Preview/staging deployment. Do not point V2 staging at the V1 production Supabase project or the production V1 domain. Do not copy live customer records into staging unless the copy is fully anonymized and approved.

Keep these boundaries:

- V1 production remains the live customer-facing site.
- All V2 code changes stay on branch \`v2.0.0-foundation\`.
- Staging secrets belong only in the staging deployment's server-side environment settings.
- \`SUPABASE_SERVICE_ROLE_KEY\` must never be prefixed with \`NEXT_PUBLIC_\`, placed in browser code, checked into Git, or pasted into issue comments/logs.
- \`public_booking_enabled\` must remain false in production. A temporary true value is permitted only in the isolated staging project during the controlled positive booking test described below; restore it to false when the test finishes.

## 2. Preflight the code branch

From a clean checkout:

\`\`\`bash
git fetch origin
git checkout v2.0.0-foundation
git pull --ff-only origin v2.0.0-foundation
node --version
npm ci
npm test
npm run typecheck:web
npm run lint:web
npm run build:web
\`\`\`

Use Node 20 or later. Confirm that the Vercel staging/Preview project is building this branch and not \`main\`. Do not promote the V2 deployment to production.

## 3. Prepare Supabase staging

1. Create or select a Supabase project dedicated to staging.
2. Confirm the project URL and project reference belong to that staging project.
3. Create a staff user through Supabase Authentication for the test owner.
4. If this is a fresh project, apply migrations 001–006 in numeric order to establish the existing application foundation. If using an existing V1 staging database, inspect migration history and apply only missing migrations; never blindly replay migrations.
5. Apply the V2 migrations in this exact order:

   1. \`007_v2_appointment_booking.sql\`
   2. \`008_v2_booking_api.sql\`
   3. \`009_v2_staff_appointment_operations.sql\`
   4. \`010_v2_staff_configuration_permissions.sql\`
   5. \`011_v2_public_api_security.sql\`
   6. \`012_v2_guest_booking_sessions.sql\`

Use the Supabase SQL Editor or the team's approved migration runner. Review each migration result before moving to the next. Take a staging backup/snapshot before applying schema changes.

Migration 008 briefly grants the availability/booking RPCs to browser roles as part of that intermediate migration state. Migration 011 deliberately revokes those grants and moves access behind the server-only service role. **The final expected state after migration 012 is service-role-only RPC execution.** Do not use the intermediate migration-008 verification paragraph as the final permission expectation.

## 4. Provision the staging owner and business configuration

Provision only the intended staging owner account after confirming its Auth user exists. Run this as a trusted database administrator, replacing the email with the staging account's actual email:

\`\`\`sql
insert into public.appointment_staff_members (user_id, role, is_active)
select id, 'owner', true
from auth.users
where email = 'STAGING-OWNER-EMAIL'
on conflict (user_id) do update
set role = excluded.role,
    is_active = true;
\`\`\`

In the V2 Studio Configuration Console, configure staging-only business data using approved values: active services, real test durations/prices, staff resources, service mappings, studio/home eligibility, weekly availability, blackout periods, booking notice/horizon, home-service pincodes and travel buffers. Do not invent production prices, hours, or service coverage for a test.

The migration intentionally does not seed the studio's service catalogue or working hours. The booking switch should remain false while configuration and permission checks are being completed.

## 5. Configure staging server environment

Add these variables to the V2 staging deployment only:

| Variable | Purpose |
|---|---|
| \`NEXT_PUBLIC_SUPABASE_URL\` | Staging Supabase project URL |
| \`NEXT_PUBLIC_SUPABASE_ANON_KEY\` | Staging public/anon key |
| \`SUPABASE_SERVICE_ROLE_KEY\` | Staging service-role secret; server-only |

Do not place the service-role secret in a \`NEXT_PUBLIC_*\` variable. Do not reuse V1 production keys. Redeploy the staging Preview after setting its environment variables. The key is not required in local shell history: use your deployment provider's secret manager.

## 6. Run database security verification

Open \`supabase/verification/v2_staging_smoke_tests.sql\` in the staging SQL Editor and run it after migrations 007–012. It contains diagnostic SELECT statements only; it does not mutate data.

Expected results:

- Required V2 tables and functions exist.
- RLS is enabled on the listed appointment tables and the rate-limit/session tables.
- The active-reservation exclusion constraint exists.
- The singleton booking setting exists and \`public_booking_enabled\` is false.
- \`anon\` and \`authenticated\` cannot execute the booking, availability, rate-limit or guest-session management RPCs.
- \`service_role\` can execute the required server-only RPCs.
- Browser roles have no direct SELECT privilege on guest-session or rate-limit storage.

Resolve every failed expectation before continuing.

## 7. Run the opt-in Supabase HTTP smoke check

The script \`scripts/v2-staging-check.mjs\` uses Node's built-in fetch API and no additional package. It makes read-only checks plus deliberately invalid anonymous RPC probes; it does not create, update, cancel, or delete bookings.

Set the following variables in the shell used to run the script. Do not commit them:

\`\`\`bash
export STAGING_SUPABASE_URL="https://YOUR-STAGING-PROJECT.supabase.co"
export STAGING_SUPABASE_ANON_KEY="YOUR-STAGING-ANON-KEY"
export STAGING_SUPABASE_SERVICE_ROLE_KEY="YOUR-STAGING-SERVICE-ROLE-KEY"
export STAGING_SUPABASE_CONFIRM_NON_PRODUCTION="YES"
npm run test:staging
\`\`\`

The explicit confirmation is a safety interlock. Only run this against an isolated non-production project. The script checks that the booking switch is false, browser-role calls are denied, the guest-session table is not directly readable by anon, and the service role can query availability while the public switch is off. It never prints key values.

A successful script run proves only the tested HTTP permissions and disabled-switch behavior. It does not prove live booking creation, staff workflows, concurrency, cancellation, hosting proxy behavior, or production readiness.

## 8. Controlled end-to-end staging test

Proceed only after Sections 1–7 pass and the business owner approves the test configuration.

1. Confirm the V2 Preview host and staging Supabase project again. Confirm no real customers or production credentials are in use.
2. Temporarily set \`public_booking_enabled = true\` in the staging project's singleton \`appointment_booking_settings\` row only. Do not change production.
3. Verify the public service catalogue and studio availability. Verify home availability only for test pincodes deliberately configured in staging.
4. Complete one test booking using synthetic customer details. Confirm the displayed service, amount, duration, time, location and booking reference match the database snapshots.
5. Retry the exact request with the same idempotency key. Confirm it returns the existing booking rather than creating a duplicate.
6. Submit two overlapping requests for the same staff resource. Confirm at most one succeeds and the other receives a slot-unavailable response.
7. Open the guest management page in the same browser. Verify the HttpOnly, SameSite=Strict cookie is scoped to \`/api/guest-booking\`; verify details load only with that cookie. Test cross-origin cancellation rejection, successful cancellation, repeated cancellation, and the release of the staff resource reservation.
8. Sign in as the staging owner. Verify the calendar and appointment operations. Verify an ordinary staff account cannot change owner/manager configuration and a non-staff account is denied staff routes.
9. Exercise configured rate policies and request-size limits with test traffic only. Confirm the hosting proxy sanitizes inbound forwarding headers before relying on IP-based limits. Do not run load tests against production.
10. Confirm appointment payment status remains \`not_required\`; retail checkout/payment is not part of this appointment flow.
11. Cancel or otherwise clean up test appointments using the supported staff/customer flows. Restore \`public_booking_enabled = false\` in staging and verify it.
12. Record the test date, branch SHA, deployment URL, migration versions, pass/fail results and any defects. Do not include secrets or customer data in the report.

## 9. Launch gate

Do not promote V2 or change DNS/production settings until all of the following are independently approved:

- Staging migration and permission checks pass.
- Positive and negative booking flows pass against the real staging database.
- Idempotency and overlapping-slot concurrency tests pass.
- Guest session read/cancel and cookie controls pass.
- Staff role boundaries and calendar operations pass.
- Rate limiting, trusted client-IP handling, monitoring and edge/WAF/bot protection are reviewed.
- CSP/XSS and staff-session hardening gaps are resolved or explicitly accepted by the security owner.
- A production backup, rollback plan, deployment owner and cutover window are documented.

Staging success is not production approval. The current V2 implementation still requires a separate review of trusted proxy headers, edge/WAF and bot protection, CSP/XSS controls, and hardened staff authentication. Keep V1 live until a separately authorized cutover.
