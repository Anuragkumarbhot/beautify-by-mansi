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
5. Confirm the policies exist for public published-profile reads and owner-only writes.

The migration is designed to be re-runnable. It creates a profile table with a unique URL slug, profile fields, publication state, timestamp trigger, and RLS policies.

## 3. Authentication
1. In Supabase **Authentication → Providers**, enable Email.
2. Configure the production site URL and redirect URLs under **Authentication → URL Configuration**.
3. Keep email confirmation enabled for production.
4. Create a test account from **Business Studio** using an email you control.
5. Confirm the email, then sign in.

The current Business Studio has email/password sign-up and sign-in controls. Each signed-in account can manage only its own rows. Public visitors can read only published profiles.

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
Cloud authentication, private draft saving, publication and public profile rendering are implemented in the frontend code, subject to applying the migration and configuring Supabase Auth. This work has been committed but not live-tested against the Supabase project. Razorpay subscriptions, QR scan analytics, custom domains, team accounts and admin moderation remain future work.


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
