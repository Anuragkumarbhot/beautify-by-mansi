# V2 Guest Booking Management

This feature creates a private guest session for each successful automatic appointment booking.

## Session lifecycle

1. The booking API generates 32 cryptographically random bytes.
2. It hashes the value with SHA-256 and stores only the digest through `create_appointment_guest_session()`.
3. The raw value is placed in an HttpOnly, SameSite=Strict cookie, Secure in production and scoped to `/api/guest-booking`.
4. The management page reads booking details through the cookie-backed API. JavaScript cannot read the cookie.
5. A guest can cancel a booking only while status is `confirmed`. The database cancellation trigger releases the active reservation.
6. The cookie expires after the later of 30 days after issue or 2 days after appointment end, subject to a 400-day maximum.

The raw bearer value is not placed in JSON, URLs, query strings or application logs. Public booking references are not access credentials.

## Endpoints

- `GET /api/guest-booking`: fetch the session's appointment.
- `POST /api/guest-booking/cancel`: verify request Origin and cancel a confirmed appointment.
- `/booking/manage`: customer-facing appointment details and cancellation page.

Guest read rate limit: 30 per IP per 60-second fixed window. Guest cancellation rate limit: 5 per IP per 600-second fixed window. The routes fail closed if the database limiter or server-role key is unavailable.

## Database and access

Apply migration 012 after migrations 007–011. The session table has RLS enabled and no direct browser-role access. Its create/read/cancel functions are executable only by the service role. The application server stores only the session digest in PostgreSQL.

## Required tests

- No cookie, malformed cookie, expired cookie and revoked cookie return no appointment.
- A valid cookie returns only its linked appointment.
- A reference alone cannot retrieve or cancel an appointment.
- Cross-origin cancellation is rejected.
- A confirmed appointment can be cancelled; the resource reservation is released.
- Repeated cancellation does not reopen or otherwise mutate the appointment.
- Completed, no-show and already-cancelled appointments cannot be reopened.
- A lost browser session cannot be recovered through booking-reference lookup. The customer must contact the studio.

## Boundaries

The cookie is browser/device-specific. It is not a transferable one-time link and does not provide cross-device recovery. If guest session creation fails after the booking transaction, the client receives a temporary failure and can retry with the same idempotency key; the booking transaction returns its existing reservation and the server attempts a fresh management session.
