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
