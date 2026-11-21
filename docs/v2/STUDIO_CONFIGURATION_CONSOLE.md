# V2 Studio Configuration Console

This milestone adds an owner/manager console at `/staff/config`. It is separate from the V1 enquiry flow and does not enable public online booking.

## Console sections

- Services: slug, category, description, duration, before/after buffers, INR price and studio/home eligibility.
- Staff resources: staff and room resource records. Phase B public booking allocation and Phase C rescheduling currently use one staff resource only; room resources are stored for later use but are not selected or reserved.
- Service assignments: map each staff resource to a service and location type.
- Weekly availability: weekday, opening/closing time, slot interval, timezone and optional effective dates.
- Home-service coverage: six-digit pincode, city/state and travel buffer.
- Blackouts: staff resource, start/end instant and reason.
- Booking limits: minimum notice and horizon in Asia/Kolkata. The public booking switch is read-only and cannot be enabled from this console.

All amounts are stored in paise. Enter prices in rupees; the API converts them to integer paise. Empty price means quote-based service.

## Access control

- The API validates Supabase Auth access tokens, verifies active membership and checks role `owner` or `manager`.
- The UI and API return 403 for `staff` members.
- Migration 010 introduces `is_appointment_manager()` and narrows configuration write RLS policies to owners/managers. Active staff can read operational configuration; public visitors retain only existing active service/area read access.
- Membership assignment remains an out-of-band Supabase administrator action. The console cannot create users or elevate roles.
- PostgREST requests use the signed-in user's JWT; no service-role key is used.

## Apply and configure

1. Confirm migrations 007–009 are installed after migrations 001–006.
2. Apply `supabase/migrations/010_v2_staff_configuration_permissions.sql`.
3. Provision owner/manager membership in `appointment_staff_members` using trusted SQL administration.
4. Sign in at `/staff`, then open `/staff/config`.
5. Create services and staff resources. Assign services to each resource/location combination.
6. Add active weekly rules and home areas only after confirming actual operational hours, durations, travel buffers and coverage.
7. Configure minimum booking notice and horizon. Keep the booking switch false.

## Guardrails and limitations

- The application does not seed guessed services, prices, staff, hours or pincodes.
- Phase B currently allocates one staff resource and does not reserve studio rooms. Room resources are not considered when the customer-facing availability engine creates bookings.
- Service deactivation and schedule/blackout changes can affect future slot availability. Existing appointment reservations remain protected by the database overlap constraint.
- Delete operations may be rejected when foreign keys or appointment history depend on the record. Prefer deactivation for services/resources/areas.
- Role-level permissions for owner versus manager are not yet differentiated; both can administer configuration.
- The migration has not been applied to Supabase by this code change. No live configuration has been written or public booking enabled.
- Complete a real Supabase RLS smoke test and rescheduling/availability regression test before production use.
