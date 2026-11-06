# Supabase setup — Beautify by Mansi

## 1. Create the project
1. Create a project at https://supabase.com/dashboard.
2. In Project Settings → API, copy the Project URL and the publishable/anon key.
3. Replace the two placeholders in `assets/js/supabase-config.js`.
4. Never use the `service_role` or any secret key in browser code or GitHub.

## 2. Create tables and security policies
1. Open Supabase → SQL Editor.
2. Paste and run the complete `supabase/schema.sql` file.
3. Confirm the `bookings` table has Row Level Security enabled.

The policies allow the public website to INSERT a new booking request only. Only a user explicitly listed in `booking_admins` can read, update, or delete booking records.

## 3. Create Mansi's admin account
1. In Authentication → Users, create an account for the studio administrator with an email and a strong unique password.
2. Copy the user's UUID.
3. In SQL Editor, run the bootstrap INSERT at the bottom of `schema.sql`, replacing the placeholder UUID with the real UUID.
4. Keep public sign-ups disabled unless there is a deliberate need for them. Do not add customers to `booking_admins`.

## 4. Deploy and verify
1. Commit the Supabase URL and publishable/anon key in `supabase-config.js` (these are public client values; RLS is the security boundary).
2. Push to `main`; the GitHub Pages workflow will publish the static site.
3. Submit a test booking and confirm it appears in the Supabase `bookings` table.
4. Sign in to Booking Manager and confirm the admin can view and update it.
5. Test as a signed-out visitor: booking INSERT should work, but SELECT/UPDATE/DELETE must be denied.

## Data and privacy notes
- Customer details are personal data. Restrict admin access, use a strong unique password, and follow applicable privacy requirements.
- Supabase free/paid quotas and project pausing policies can change; review your dashboard's current plan before relying on it for business-critical operations.
- Public booking INSERT is intentionally enabled. Consider adding CAPTCHA/edge-function rate limiting before promoting the site widely to reduce spam.
- WhatsApp is still a separate handoff: the website creates the cloud record, then opens WhatsApp for the customer to send the message. WhatsApp replies are not automatically imported.
