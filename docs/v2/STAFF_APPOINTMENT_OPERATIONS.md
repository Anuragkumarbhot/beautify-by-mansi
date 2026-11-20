# V2 staff appointment operations

This phase adds a private, authenticated staff calendar and lifecycle operations. It remains separate from the V1 enquiry booking flow. The V2 public booking switch is not enabled by this change.

## Routes

- `/staff` — staff sign-in and daily calendar.
- `GET /api/staff/appointments?from=<ISO>&to=<ISO>&status=all|confirmed|cancelled|completed|no_show` — staff calendar range, capped at 31 days and 250 rows.
- `PATCH /api/staff/appointments/<uuid>` — transition a confirmed appointment to cancelled, completed or no_show.
- `POST /api/staff/appointments/<uuid>/reschedule` — transactionally move a confirmed appointment to a new start instant.

All operational routes require a Supabase Auth access token. The server validates the token with Supabase Auth, checks the caller's own `appointment_staff_members` membership through PostgREST, and forwards the same JWT to PostgREST. Database RLS and `is_appointment_staff()` remain authoritative. The app does not use a service-role key for staff requests.

The browser stores the Supabase session in local storage so the session can be refreshed across reloads. This is a bearer-token session and therefore depends on normal browser XSS protections; use a strict Content Security Policy and keep dependencies controlled. Passwords are not stored.

## Provision staff

1. Apply migrations 007, 008 and 009 in order.
2. Create the intended staff user in Supabase Authentication.
3. Add that exact user in SQL Editor (repeat for each authorized person):

   ```sql
   insert into public.appointment_staff_members (user_id, role, is_active)
   select id, 'owner', true
   from auth.users
   where email = 'OWNER-OR-STAFF-EMAIL'
   on conflict (user_id) do update
   set role = excluded.role,
       is_active = true;
   ```

4. Visit `/staff` and sign in. An authenticated account without an active membership receives HTTP 403.

Use `owner`, `manager` or `staff` as the role. All three roles currently have the same appointment read/update permission; granular role permissions are a later enhancement. Membership changes remain an administrator-only SQL operation.

## Lifecycle rules

- Only confirmed appointments can be cancelled, completed, marked no-show or rescheduled.
- Cancellation updates status in PostgreSQL; the existing trigger releases active resource reservations in the same transaction.
- Terminal states cannot be reopened.
- Rescheduling preserves the customer, location, service snapshots, price snapshots, and currently assigned staff resource. It locks the booking and resource, checks resource mapping, current schedule, blackout windows, booking horizon and notice rules, then updates the booking and reservation atomically.
- Rescheduling currently supports the one staff resource allocated by Phase B. It does not reassign staff or reserve studio rooms. If the original staff resource is no longer configured for all services, the operation fails without changing the booking.
- The new database trigger runs on every booking update. It blocks direct edits to customer, service, location and payment fields, and prevents direct schedule edits outside the reschedule RPC.

## Configuration and launch gates

The SQL migration is committed but must be applied manually after migrations 007–008. No Supabase project has been modified by this repository commit. Staff accounts and membership rows must exist before the calendar can display data.

Before production use:
- Apply migrations 007–009 to the intended Supabase project in order.
- Provision owner/staff membership and verify inactive users receive 403.
- Test an active staff account can list appointments and non-staff cannot.
- Confirm cancellation releases its resource reservation.
- Test same-slot and overlapping reschedule conflicts, an unavailable staff schedule, a blackout, and rescheduling on a different date.
- Review CSP and XSS protections for the browser-held Supabase session.
- Keep `public_booking_enabled = false` until public abuse protection, guest confirmation/cancellation tokens, configuration and concurrency tests are complete.

No migration is applied, no staff account is provisioned, no booking data is read, and no production deployment is performed by this phase.
