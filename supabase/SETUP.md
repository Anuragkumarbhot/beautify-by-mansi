# Supabase setup — Beautify by Mansi

This project has two separate Supabase data areas:
- `bookings`: existing appointment requests and studio booking administration.
- `business_profiles`: hosted digital business cards for the hybrid Business Studio.

## 1. Project configuration
A public browser configuration file already exists at `assets/js/supabase-config.js`. It contains the Supabase project URL and publishable key. A publishable/anon key is designed to be visible in browser code; Row Level Security (RLS) is the security boundary.

Never place a `service_role` key, database password, JWT signing secret, Razorpay secret or webhook secret in HTML, JavaScript, GitHub, or any public deployment setting.

## 2. Apply the business-profile migration
1. Open the Supabase dashboard for the project configured in `assets/js/supabase-config.js`.
2. Open **SQL Editor**.
3. Run the complete file `supabase/migrations/001_business_profiles.sql`.
4. Confirm that `public.business_profiles` exists and RLS is enabled.
5. Confirm RLS is enabled and owner-only write policies exist. After migration 005, anonymous visitors retrieve profile data through the plan-aware RPC rather than direct table SELECT.

The migration is designed to be re-runnable. It creates a profile table with a unique URL slug, profile fields, publication state, timestamp trigger, and RLS policies.

## 3. Authentication
1. In Supabase **Authentication → Providers**, enable Email.
2. Configure the production site URL and redirect URLs under **Authentication → URL Configuration**.
3. Keep email confirmation enabled for production.
4. Create a test account from **Business Studio** using an email you control.
5. Confirm the email, then sign in.

The current Business Studio has email/password sign-up and sign-in controls. Each signed-in account can manage only its own rows. Public visitors can retrieve only published profiles with an active paid subscription, through the sanitized public-profile RPC added in migration 005.

## 4. Publish a business profile
1. Open `business-studio.html` on the deployed website.
2. Create an account or sign in.
3. Complete the business details and choose a URL slug.
4. Select **Save profile to cloud** to store a private draft.
5. Select **Publish public profile** to make the card publicly readable.
6. Open the generated public link and test it in a signed-out/private browser.
7. The QR code switches to the hosted profile URL after publishing.

Public profile format: `profile.html?slug=your-business-name`.

## 5. Existing booking system
The existing `supabase/schema.sql` file contains the appointment booking tables and admin policies. It is separate from the new business-profile migration. Follow the booking-specific bootstrap instructions at the bottom of that schema when configuring booking administration.

## 6. Security verification before launch
- Test with two different accounts: account A must not read or change account B's draft.
- Test signed out: an unpublished profile must not be readable; a published profile should be readable.
- Test malformed slugs and URL fields.
- Confirm no service-role or secret key exists in the frontend bundle or repository.
- Configure password recovery and email-confirmation redirects.
- Add rate limiting / CAPTCHA before opening sign-up broadly.
- Establish privacy, account deletion and data export procedures.
- Review Supabase backups, quotas and monitoring for the selected plan.

## Current implementation boundary
Cloud authentication, private draft saving, public profile rendering, Razorpay one-time checkout, webhook activation, paid-access expiry and plan-based feature enforcement are implemented in the repository, subject to applying migrations 001–005 and deploying the Edge Functions. This work has not been live-tested against the configured Supabase/Razorpay projects. QR scan analytics, custom domains, multi-profile accounts, team accounts and admin moderation remain future work.


## 7. Platform admin dashboard
The read-only SaaS operations dashboard is available at `admin.html`. It lists business profiles and draft/published totals. The dashboard does not provide customer-content editing, payment controls, or QR scan analytics.

1. Apply `supabase/migrations/002_platform_admin.sql` after migration 001.
2. Create the intended admin account through Supabase Authentication.
3. In the Supabase SQL Editor, provision that exact account by running the following after replacing the email:
   ```sql
   insert into public.platform_admins (user_id)
   select id from auth.users where email = 'YOUR-ADMIN-EMAIL'
   on conflict (user_id) do nothing;
   ```
4. Open `admin.html` and sign in with that account.

Admin membership cannot be created or changed from the browser. The migration adds a narrowly scoped RLS policy that lets platform admins read business profile rows; owners retain their existing ownership policies. Do not expose the Supabase service-role key. Remove an admin by deleting their row from `public.platform_admins` in the SQL Editor.

The dashboard currently fetches at most 500 profiles and reports only records returned by that query. It does not claim to report QR scans, revenue, or subscription status. Razorpay billing and event analytics require server-side functions and verified webhook processing, which are not included in this phase.


## 8. Razorpay plan checkout foundation
This phase adds server-side order creation and webhook-driven payment status updates. The included plans are fixed INR one-time payments with time-limited access; they are **not auto-renewing recurring subscriptions**.

### Database
1. Apply `supabase/migrations/003_billing_foundation.sql` after migrations 001 and 002.
2. Review the seeded prices in `subscription_plans` before enabling checkout. Amounts are stored in paise (₹199 = 19900 paise).
3. Browser users can read active plan names and their own subscription rows. All payment/subscription writes are intended to happen from trusted Edge Functions.

### Deploy Edge Functions
Deploy these functions using the Supabase CLI:
- `create-order` — requires a valid Supabase user JWT, verifies profile ownership, reads the plan price from the database, and creates a Razorpay order server-side.
- `razorpay-webhook` — verifies the raw request body against the Razorpay webhook HMAC signature and records supported payment events idempotently.

Set secrets in Supabase Edge Function secrets (never in GitHub or browser JavaScript):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

Configure the Razorpay webhook URL to the deployed `razorpay-webhook` function URL and subscribe to `payment.captured` and `payment.failed`. Copy the webhook secret into the function secret configuration. Use Razorpay test mode first.

### Important launch requirements
- The Business Studio checkout widget launches Razorpay Checkout. A browser checkout callback is not proof of payment; only the verified webhook activates a subscription. The interface remains pending until the verified server-side status is visible.
- The webhook implementation must be tested with Razorpay test-mode events, invalid signatures, duplicate deliveries, amount mismatches, and database failures before launch.
- The current plan table is seeded with illustrative prices. Confirm the commercial pricing and tax/invoice treatment before accepting real payments.
- This implementation does not yet handle recurring mandates, cancellations, refunds, chargebacks or GST invoices. Paid access and plan-based feature filtering are implemented in migrations 004–005, but must be tested in the configured environment. Do not market auto-renewing subscriptions; customers currently purchase renewals manually.
- Keep Edge Function JWT verification enabled for `create-order`. The Razorpay webhook is provider-authenticated by its HMAC signature, so configure that endpoint to accept provider requests without a Supabase user JWT while retaining signature verification in the function.


## 9. Paid access, renewals and expiry enforcement (migration 004)
1. Apply `supabase/migrations/004_subscription_entitlements.sql` after migration 003.
2. Redeploy the updated `razorpay-webhook` function:
   ```bash
   supabase functions deploy razorpay-webhook --no-verify-jwt
   ```
3. Public profile reads now require a published profile **and** a paid subscription whose `starts_at` is in the past and `ends_at` is in the future. Owners can still read their own profile rows after expiry so they can renew or edit them.
4. The webhook calls a restricted database function to activate a verified order. Renewal time is appended to the latest existing paid expiry for that profile, so buying early does not discard remaining paid days.
5. Failed orders do not grant access. Expired payments remain in payment history but no longer satisfy the public profile delivery function or the public-profile entitlement check.

### Entitlement checks
- Test a published profile with no paid subscription: signed-out public read must return no row.
- Test a paid profile: public profile should load until `ends_at`.
- Set a test subscription's `ends_at` to a past timestamp in SQL Editor: public read must stop while its owner can still read it.
- Test a second successful payment before the first period ends: its `starts_at` should equal the prior paid `ends_at`.
- Send duplicate captured webhook events and verify only one subscription activation occurs.
- Send an invalid signature and a mismatched amount; neither may activate access.

This enforces profile visibility at the database RLS layer, not merely in browser JavaScript. It does not yet gate individual Studio tools, staff seats, analytics quotas or custom domains. It also does not implement automatic recurring collection: customers must manually purchase a renewal.

## 10. Plan-based feature entitlements (migration 005)
Apply `supabase/migrations/005_plan_entitlements.sql` after migration 004.

The current plan map is:
- **Starter · 30 days:** Rose Gold base theme; no public Google-review link.
- **Pro · 30 days / Pro · 365 days:** all three card themes and public Google-review links.

The entitlement map is stored in `subscription_plan_entitlements`. Browser roles have no direct access to that table. The owner-facing `get_business_profile_entitlements(profile_id)` RPC returns only the signed-in owner's current effective feature flags.

### Enforcement model
- PostgreSQL rejects attempts to save Ivory/Plum themes or add Google-review links without an active Pro entitlement.
- PostgreSQL rejects a first publish unless the profile has an active paid subscription.
- Anonymous users no longer have direct SELECT permission on `business_profiles`. Public cards are returned through `get_public_business_profile(slug)`, which checks publication and active paid access, downgrades non-Pro themes to Rose Gold, and suppresses the Google-review link for Starter.
- The Studio editor disables unavailable controls based on the owner-facing entitlement RPC. The database remains authoritative if a browser request is modified.
- The editor maps its local `wine` theme value to the database's canonical `rose-gold` value.

### Verification checklist
1. Apply migrations 001–005 in order.
2. Confirm an anonymous REST SELECT on `business_profiles` is denied.
3. Confirm `get_public_business_profile(slug)` returns null for an unpublished, unpaid or expired profile.
4. With an active Starter plan, confirm the public card uses Rose Gold and does not show a Google-review link.
5. With an active Pro plan, confirm Ivory/Plum themes and the Google-review link are available.
6. Attempt to write a Pro-only theme or a new review URL directly through the authenticated REST API as Starter; PostgreSQL should reject the update.
7. Confirm an authenticated owner cannot call `get_business_profile_entitlements` for another owner's profile.

The feature map currently covers only features that exist in this MVP. Multiple profiles, staff seats, QR scan analytics, custom domains and automatic recurring payment collection are not included. The seeded prices remain illustrative and require commercial approval. No live Supabase or Razorpay test has been performed by this code change.


## 11. Multi-profile workspace (migration 006)
Apply `supabase/migrations/006_multi_profile_workspace.sql` after migration 005.

### Profile limits
- **Starter:** one business profile per authenticated account.
- **Pro monthly / Pro yearly:** up to five business profiles per account.
- Each profile has its own name, slug, contact details, theme, review URL, publication state and subscription history.
- Checkout is scoped to the currently selected profile. Each profile must have its own active paid subscription to remain publicly available.
- The database checks the profile count on insert and serializes concurrent creation attempts per account to prevent exceeding the limit through parallel requests.
- The workspace entitlement RPC exposes only the signed-in account's profile count, limit and plan tier.

### Test checklist
1. Apply migrations 001–006 in order.
2. Sign in with a Starter account and create one profile. Confirm a second insert is rejected by PostgreSQL.
3. Activate a Pro subscription on one owned profile; confirm the workspace limit becomes five.
4. Create additional profiles up to five; confirm the sixth is rejected.
5. Select a different profile in Business Studio and confirm save, publish and checkout target that selected profile.
6. Confirm each public slug resolves only to its own profile and requires that profile's active subscription.
7. Test concurrent create requests near the limit; the final profile count must never exceed the account's plan limit.

The current Studio supports profile switching and creation, but does not yet provide team member roles, staff seat management, bulk profile import, or shared subscription pooling. Profile access remains independently billed per profile. No live Supabase integration test has been performed.

## 11. V2 automatic appointment booking foundation (migration 007)

V2 appointment data is separate from the existing V1 public.bookings enquiry table. Keep the V1 booking page and table unchanged while the new booking flow is developed.

### Apply the migration

1. Back up the Supabase project before applying schema changes.
2. Confirm migrations 001–006 have been applied in sequence.
3. Open Supabase Dashboard → SQL Editor.
4. Run the complete file supabase/migrations/007_v2_appointment_booking.sql.
5. Confirm that the V2 tables exist and RLS is enabled.
6. Do not enable public booking yet. The seeded singleton row in appointment_booking_settings deliberately has public_booking_enabled = false.

The migration creates:
- Staff membership and a server-checkable is_appointment_staff() helper.
- A booking settings row using Asia/Kolkata, with booking disabled.
- Service catalogue, staff/studio resources and service-to-resource mappings.
- Studio/home weekly availability rules, blackout periods and home-service pincode coverage.
- Appointment headers, service snapshots, resource reservation intervals and audit events.
- A GiST exclusion constraint that prevents active reservations for the same resource from overlapping.
- A cancellation trigger that releases reserved resource intervals in the same database transaction.
- RLS policies. Anonymous visitors can read active service summaries and active service-area pincodes, but cannot read appointment records or write bookings.

### Provision the studio owner

Create the intended staff account using Supabase Authentication first. Then provision that exact account in SQL Editor:

```sql
insert into public.appointment_staff_members (user_id, role, is_active)
select id, 'owner', true
from auth.users
where email = 'YOUR-OWNER-EMAIL'
on conflict (user_id) do update
set role = excluded.role,
    is_active = true;
```

Do not create staff membership from the browser. Only a trusted database administrator should assign the initial owner or later staff roles.

### Configure before enabling bookings

No staff, services, durations, prices, weekly hours, blackout dates, pincode areas or travel buffers are seeded by the migration. Enter and verify those business values before enabling appointments. In particular:
- Each bookable service needs a real duration and before/after buffers.
- Each staff/resource record must be explicitly activated and mapped to the services and location types it can deliver.
- Weekly rules must reflect actual local working hours; use separate rows for separate windows.
- Home-service areas must use the correct six-digit pincode and a configured travel buffer.
- Configure minimum booking notice and booking horizon in appointment_booking_settings.

Keep public_booking_enabled = false until the availability API, transactional booking endpoint, customer flow, staff calendar and RLS/concurrency tests are complete. This migration alone does not create a working booking website or expose a public booking API.

### Basic schema verification

After applying the migration, run:

```sql
select
  to_regclass('public.appointment_services') as appointment_services,
  to_regclass('public.appointment_availability_rules') as availability_rules,
  to_regclass('public.appointment_bookings') as appointment_bookings,
  to_regclass('public.appointment_booking_resources') as appointment_booking_resources;

select
  relname,
  relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname like 'appointment_%'
order by relname;

select conname
from pg_constraint
where conrelid = 'public.appointment_booking_resources'::regclass
  and contype = 'x';
```

Expected: the listed tables exist, RLS is enabled on all appointment_* tables, and the resource reservation exclusion constraint is present.

### Operational and security boundaries

- The migration has been committed to GitHub but has not been applied to the connected Supabase project from this workflow.
- No direct anonymous table INSERT grant is added. Migration 008 exposes booking creation only through the validated security-definer transaction function and the Next.js API route.
- Customer-owned booking reads are available only for authenticated bookings where customer_user_id is set; guest confirmation access requires a separate secure token flow.
- Direct changes to an appointment's time, location or service address are rejected. Rescheduling must be implemented as one transactional operation that replaces resource reservations safely.
- Do not put a Supabase service-role key in browser code, public environment variables or GitHub.
## 12. V2 availability and booking API (migration 008)

Apply `supabase/migrations/008_v2_booking_api.sql` only after migration 007.

Migration 008:
- Adds `get_appointment_availability(date, location, service_ids, pincode)`, which returns safe start/end instants and an availability count without exposing staff identities or customer records.
- Adds `create_appointment_booking(...)`, which validates active services, location eligibility, home-service coverage, booking settings and exact slot availability.
- Rechecks service configuration, home-service coverage, staff mappings, resource schedules, blackouts and existing reservations immediately before reservation.
- Serializes retries using the client idempotency UUID.
- Relies on the GiST exclusion constraint from migration 007 to reject overlapping reservations even under concurrent requests.
- Maps a race-condition exclusion failure to a slot-unavailable error.
- Creates a confirmed appointment and service snapshots atomically; payment status remains `not_required`.
- Adds resource-configuration lock triggers so staff schedule/mapping/blackout edits serialize with booking reservation.
- Extends generated booking references to a longer random suffix.

### V2 API routes

The Next.js app exposes:
- `GET /api/booking/services` — active public service catalogue.
- `GET /api/booking/availability?date=YYYY-MM-DD&location=studio|home&serviceIds=UUID,UUID&postalCode=...` — available slots.
- `POST /api/bookings` — validated booking creation. Include a UUID `idempotencyKey`, selected service IDs, an ISO date-time with timezone offset, location type, customer details, event type, and home address fields when location is `home`.

The API uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to call the restricted PostgreSQL functions. It does not use or expose the service-role key. The database function is the authoritative validation and transaction boundary; browser values are not authoritative for price, duration or availability.

### Configure safely

1. Apply migrations 007 and 008 in order.
2. Configure a non-null `minimum_notice_minutes` and `booking_horizon_days` in `appointment_booking_settings`.
3. Configure at least one active bookable service with its real duration and location eligibility.
4. Configure an active staff resource, map it to the selected service/location, and add an accurate active weekly availability rule in Asia/Kolkata.
5. For home service, add an active six-digit pincode area and travel buffer.
6. Test the availability API. It should return an empty slot array until all required records and schedules exist.
7. Do not set `public_booking_enabled = true` until staff, schedules, areas, concurrency, abuse protection and customer confirmation handling have been reviewed.

### Example availability call

```text
GET /api/booking/availability?date=2026-12-10&location=studio&serviceIds=SERVICE_UUID
```

For home service, also pass a six-digit `postalCode`. Use the actual UUIDs from `appointment_services`, not the example placeholder.

### Booking response and limitations

A successful `POST /api/bookings` returns a booking reference, start/end times, location type, `confirmed` status and `paymentStatus: not_required`. The idempotency key returns the same booking reference if the same request is retried. A slot conflict returns HTTP 409.

The guest booking response is returned immediately to the submitting browser. A secure guest self-service retrieval/cancellation token is not included yet; do not expose a public booking lookup by reference alone. Authenticated booking reads remain limited to the owning account or authorized staff.

Phase B currently allocates one staff resource per appointment. The schema supports studio-room resources, but room selection/reservation is not yet implemented; do not configure studio-room capacity as a booking constraint until that is added.

### Production safeguards still required

- Add edge/WAF rate limiting and bot protection/CAPTCHA before enabling public anonymous booking. The Next.js API routes do not implement a distributed rate limiter.
- Add secure guest confirmation/retrieval and cancellation tokens before offering guest self-service.
- Test two simultaneous requests for the same resource and overlapping intervals against the actual Supabase project.
- Confirm that database migrations 007–008 are applied and functions are visible before testing the Next.js routes.
- Keep the public booking switch disabled until the business configuration and safeguards are complete.
### Verify migration 008 functions

After applying migration 008, run this query in SQL Editor:

```sql
select
  p.proname,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_appointment_availability', 'create_appointment_booking')
order by p.proname;
```

Expected: both functions appear, both are security-definer functions, and anonymous execution is granted so the public API can call them. The functions validate requests and do not expose staff identities or customer records. Keep the booking switch disabled until the application and operational checks are complete.