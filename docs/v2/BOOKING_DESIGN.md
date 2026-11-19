# V2 Automatic Appointment Booking — Technical Design

Status: approved product direction; technical design only. This document does not claim that automatic booking, live availability, or customer notifications have been implemented or deployed.

## 1. Product decision

The V2 booking workflow is **automatic slot selection and confirmation**. Customers can request either:
- **Studio appointment** — reserve a slot from the configured studio schedule.
- **Home service** — reserve a slot only when the supplied service area is supported and a suitable staff/resource schedule plus travel buffer is available.

After a successful atomic reservation, the appointment is confirmed and a booking reference is shown. Payment state is separate from booking state. An appointment must never be marked paid merely because the customer saw a confirmation screen or a payment was initiated.

The same service and booking model supports bridal, party, nail and other bookable services. The service catalogue must explicitly mark whether each service supports studio, home or both.

## 2. Verified V1 baseline and migration boundary

The current V1 booking experience is in index.html and assets/js/app.js:
- Customer details: name, contact number, event type/date, preferred time, service location and notes.
- Preferred time is a broad text option (Morning, Afternoon, Evening, Late evening or flexible), not a reservable time slot.
- Location is a free-form choice (Studio, Venue / home service or discuss with studio).
- Selected packages and totals are saved to public.bookings when Supabase is configured.
- V1 booking statuses are New, Contacted, Confirmed, Completed and Cancelled.
- The current public insert policy permits a new enquiry; admin users manage records through the existing allow-list.

The V1 schema does not have resource calendars, weekly availability rules, service durations, service-area coverage, travel buffers, or a database-enforced overlapping-slot constraint.

**Migration boundary:** keep V1 public.bookings and its policies intact. V2 will use separate appointment tables and routes. Do not change or backfill the V1 table until a separately tested migration and cutover plan exists. New V2 appointments must not silently appear as V1 enquiries or vice versa.

## 3. Core booking invariants

1. The server, not the browser, decides whether a slot is available.
2. Service duration and price are read from active database records; never trust client-submitted duration or totals.
3. Availability shown to the customer is provisional until the reservation transaction succeeds.
4. A database constraint and transaction must prevent overlapping reservations for the same resource.
5. Studio and home-service reservations share the same resource calendar so a staff member cannot be booked twice at overlapping times across different locations.
6. Home service additionally requires an active service area and a valid customer address/pincode.
7. A successful reservation creates a confirmed appointment and a unique reference. A conflict returns a clear “slot just became unavailable” response and asks the customer to choose another time.
8. Appointment status and payment status are separate state machines.
9. Customer-facing queries must never expose another customer's phone, address, notes or appointment history.
10. Staff actions and changes to availability must be authorized and auditable.

## 4. Domain model

Recommended V2 tables (names can be finalized during the migration review):

| Table | Purpose | Key fields |
|---|---|---|
| appointment_services | Bookable services and package rules | id, slug, name, duration_minutes, buffer_before_minutes, buffer_after_minutes, price_amount, currency, supports_studio, supports_home, is_active |
| appointment_resources | Staff, artist or reservable studio resource | id, display_name, resource_type, is_active |
| appointment_resource_services | Which resources can deliver which services | resource_id, service_id |
| appointment_availability_rules | Recurring working windows | resource_id, location_type, weekday, opens_at, closes_at, slot_interval_minutes, effective_from, effective_until, is_active |
| appointment_blackouts | Leave, breaks, holidays and blocked windows | resource_id, starts_at, ends_at, reason |
| appointment_service_areas | Home-service coverage | id, name, pincode, is_active, travel_buffer_minutes |
| appointment_bookings | Appointment header | id, reference, customer fields, location_type, address/area, starts_at, ends_at, status, payment_status, timestamps |
| appointment_booking_items | Services captured at booking time | booking_id, service_id, service_name_snapshot, duration_snapshot, price_snapshot |
| appointment_audit_events | Booking and admin activity | actor, action, booking id, timestamp, minimal metadata |

### Time and duration calculation

- Store appointment instants as timestamptz.
- Interpret business hours and customer-facing dates/times in Asia/Kolkata.
- starts_at and ends_at are the reserved interval.
- The duration is the sum of service durations plus applicable buffers. Any package-specific duration override must be explicit in the database, not inferred from its price.
- Home-service bookings add configured travel buffers before/after the appointment; the same staff resource remains unavailable during that time.
- Use half-open intervals [start, end) so an appointment ending at 12:00 can be followed by another beginning at 12:00 only when all configured buffers permit it.

### Resource assignment

For the first release, model Mansi and any other bookable staff as appointment_resources. A studio appointment reserves both the assigned staff resource and, if room capacity becomes relevant, a studio resource. A home appointment reserves the assigned staff resource. The data model can support multiple staff later without changing the customer flow.

If no suitable active resource is configured for a service/location combination, return no slots rather than inventing availability.

## 5. Availability engine

Availability must be generated server-side for a requested date, selected services and location.

1. Validate that requested services are active and support the requested location.
2. Determine total service duration and buffers from database records.
3. Load applicable weekly rules for the resource and date.
4. Apply effective dates, breaks, blackouts, holidays and existing non-cancelled bookings.
5. For home service, validate the supplied service area and add travel buffers.
6. Generate candidate start times using the configured slot interval.
7. Remove candidates that do not fit entirely inside the working window or that overlap a reserved/blocked interval.
8. Return only safe candidate slots to the customer.

The UI should display the appointment's local date/time, estimated duration and location. It should not expose staff private calendars or other customer details.

### Atomic reservation / double-booking protection

Availability reads are advisory. On submission, the database must perform a final check in one transaction:
- lock the relevant resource/day or use an equivalent concurrency-safe reservation operation;
- revalidate active services, duration, location coverage and working window;
- insert the booking and all booking items;
- rely on a PostgreSQL GiST exclusion constraint over resource_id and time range for non-cancelled bookings as a final overlap guard;
- roll back all inserts if any check or constraint fails.

Return a conflict response (HTTP 409) when another customer wins the same slot. The customer can then select a new slot. The transaction must be idempotent for a client-generated request key so retries do not create duplicate appointments.

## 6. Booking and payment states

### Appointment status

| State | Meaning |
|---|---|
| confirmed | Slot was atomically reserved |
| cancelled | Appointment was cancelled; slot becomes available subject to rules |
| completed | Service completed |
| no_show | Customer did not attend |

A separate rescheduled status is not required for the first release; rescheduling should atomically cancel/release the old slot and reserve the new slot with an audit record.

### Payment status

| State | Meaning |
|---|---|
| not_required | No advance collected for this booking |
| pending | Payment initiated, not yet verified |
| paid | Payment verified server-side |
| failed | Payment attempt failed |
| refunded | Refund confirmed |

For the first automatic-booking release, default to not_required unless the business explicitly configures mandatory advance collection. If an advance becomes mandatory, use a short-lived slot hold and mark the appointment confirmed only after the verified Razorpay webhook reports successful capture. The existing V1 ₹500 checkbox is an indicative amount only; it is not evidence of an integrated payment flow.

## 7. Customer experience and routes

### Customer routes

- /services — service categories and bookable services.
- /services/[slug] — service description, indicative price and duration once configured.
- /book — multi-step booking experience.
- /book/confirmation/[reference] — confirmation state for the booking owner/session.

### Booking steps

1. **Service selection:** choose one or more active bookable services.
2. **Location:** choose Studio or Home service. Hide unsupported location options for each service.
3. **Home address:** for Home service, collect address, city/area and pincode; validate the pincode against enabled service areas. Do not ask for precise GPS access by default.
4. **Date and slot:** show dates and slots returned by the availability API.
5. **Contact details:** name, phone, optional email, event type and notes. Validate phone and fields server-side.
6. **Review:** show selected services, expected duration, location, slot and price estimate; explain any unconfirmed commercial details.
7. **Confirm:** submit one idempotent booking request. On success show the booking reference, local date/time, location and cancellation/contact instructions. On conflict, preserve entered data and refresh availability.

### Proposed API contract

- GET /api/booking/services — active services and supported locations.
- GET /api/booking/availability?date=YYYY-MM-DD&location=studio|home&serviceIds=...&pincode=... — safe, bookable slot list.
- POST /api/bookings — validated reservation request with service IDs, selected ISO slot, location details, customer contact, notes and idempotency key.
- GET /api/bookings/[reference] — only the owner/session or an authorized staff member can retrieve booking details.
- GET /api/admin/bookings — staff calendar/list with filters.
- PATCH /api/admin/bookings/[id] — authorized status/reschedule actions.

Use Zod schemas for API validation. The server recalculates service duration and pricing; browser-submitted totals are display-only.

## 8. Staff / admin experience

Add:
- /admin/calendar — day/week calendar with studio and home service filters.
- /admin/bookings — searchable appointment list.
- /admin/availability — recurring hours, exceptions, breaks, holidays and resource assignments.
- /admin/services — edit active services, duration, buffers and location eligibility.
- /admin/service-areas — enable/disable home-service pincodes and travel buffers.

Staff should be able to view the appointment details they need, confirm contact information, mark completed/no-show/cancelled, and reschedule. Admin changes should create audit events. The existing V1 booking_admins allow-list is a useful reference, but V2 should use explicit staff roles and server-side authorization; do not assume the V1 policy automatically secures new tables.

## 9. Security and privacy

- Enable RLS on all new tables.
- Do not grant anonymous users direct SELECT access to appointment or customer tables.
- Public availability should be exposed through a narrowly scoped server endpoint or RPC that returns slot data only.
- Public booking creation must validate input and execute through a controlled transactional function; never expose a service-role key to the browser.
- Apply request rate limiting and bot protection to availability and booking creation.
- Use an idempotency key for booking submission.
- Restrict appointment details and home addresses to the booking owner and authorized staff.
- Add a retention policy for customer addresses, phone numbers and appointment notes.
- Avoid logging full addresses, phone numbers, authentication tokens or payment secrets.
- Audit staff actions and protect admin routes server-side, not only in the UI.

## 10. Implementation sequence

### Phase A — Configuration and data model
- Confirm the actual bookable service list and supported locations.
- Enter duration and buffer values for every bookable service.
- Configure staff/resources, weekly schedules, breaks and blackout dates.
- Configure supported home-service pincodes and travel buffers.
- Add a new ordered Supabase migration for V2 appointment tables, indexes, constraints and RLS.

### Phase B — Availability API
- Implement the server-side slot generator.
- Add tests for working windows, duration, buffers, home-service areas, blackouts and existing reservations.
- Implement atomic booking RPC/transaction with overlap protection and idempotency.
- Add concurrency tests where two requests attempt the same resource and slot.

### Phase C — Customer booking UX
- Build /services, /services/[slug], /book and confirmation.
- Implement location-dependent form fields.
- Add loading, empty, invalid-date, slot-conflict and server-error states.
- Preserve the booking form when a slot becomes unavailable.

### Phase D — Admin operations
- Build calendar, list and availability configuration.
- Add staff authorization and audit logging.
- Test cancellation and rescheduling for correct slot release/reservation.

### Phase E — Notifications and launch readiness
- Send booking confirmation only after the transaction commits.
- Add customer and staff notifications via an approved provider (WhatsApp/email provider still to be selected).
- Add reminders and cancellation/reschedule communications.
- Conduct RLS, privacy, abuse, accessibility, mobile and concurrency tests.
- Run a controlled pilot before any V1/V2 production cutover.

## 11. Required business configuration before real automatic booking

The repository does not currently establish these operational values. They must be configured by the studio; do not invent them in production:
- Studio opening days and hours.
- Staff working hours and resource capacity.
- Exact duration for each makeup/nail service and package.
- Breaks, cleanup time and pre/post-service buffers.
- Home-service pincodes/areas and travel buffers.
- Minimum booking notice and how far ahead customers may book.
- Cancellation/reschedule policy and whether any services require advance payment.
- Whether one booking can include multiple customers/bridal-party members and how that affects duration.

Until these values are entered and verified, the booking UI should report that slots are not yet available instead of showing fabricated dates or times.

## 12. Acceptance criteria

- A customer can select studio or home service where supported.
- Home-service requests outside enabled pincodes are rejected.
- Only slots that fit the service duration, buffers and resource schedule are returned.
- Two concurrent requests for the same resource/time cannot both succeed.
- A booking reference is created exactly once for an idempotent request.
- Successful reservations show confirmed; failed/conflicting reservations do not.
- Cancelled reservations release the slot, while completed/no-show records remain in history.
- Customers cannot read other customers' bookings or addresses.
- Staff access is enforced by server-side authorization and RLS.
- V1 booking enquiries continue to work independently until an approved cutover.
- No appointment is reported as paid without verified payment evidence.

## 13. Current implementation status

Not yet implemented in V2: booking tables/migration, availability engine, booking APIs, customer booking UI, staff calendar, notification integration and live payment flow. This document records the approved direction and implementation sequence, not a live booking capability.
