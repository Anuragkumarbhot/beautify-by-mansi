# V2 Launch Readiness — Security Controls

Status: code and CI controls committed to `v2.0.0-foundation`. This is not a production launch approval.

## Implemented in Phase E

- Migration 011 revokes browser-role EXECUTE grants on availability and booking-creation RPCs and grants them to the server-side service role only.
- Next.js server routes use `SUPABASE_SERVICE_ROLE_KEY` only through a `server-only` module. The secret is not returned to client code.
- Availability requests are rate-limited to 45 requests per IP per 60-second fixed window.
- Booking creation is rate-limited to 5 requests per IP per 10-minute fixed window.
- Booking JSON bodies are streamed and cancelled above 16 KiB, including requests without a declared `Content-Length`; non-JSON content types are rejected.
- The rate-limit table has RLS enabled and no browser-role table grants. Its RPC is service-role-only.
- Baseline HTTP response headers are configured in Next.js: HSTS, frame denial, MIME sniffing protection, referrer policy, and a restricted permissions policy.
- CI runs `npm audit --audit-level=high` before tests, type-check, lint and build.
- Static security regression tests cover RPC grants, rate-limit access, server-only secret handling, role boundaries and response headers.

## Verified dependency remediation

The CI audit reported 4 issues in the prior dependency set: 1 critical and 3 high. The patch commit updated:
- Next.js and `eslint-config-next` to `15.5.29`.
- Zod to `4.6.7`.
- PostCSS to `8.5.23`, with a root npm workspace override so the patched version is also used for Next.js' nested PostCSS dependency.

These were selected from the remediation versions reported by the repository's npm audit run. The post-update audit must pass before treating the dependency remediation as complete. Continue to review subsequent audit advisories; passing one audit is time-specific.

## Required hosting configuration

Set `SUPABASE_SERVICE_ROLE_KEY` as an encrypted server-side Vercel environment variable for the V2 project. It must not be exposed through a `NEXT_PUBLIC_*` variable, embedded in static output, or committed.

Also configure the public Supabase URL and anon key. The service-role helper is marked `server-only` and only accepts `/rest/v1/` paths. Public availability and booking operations fail closed if the service-role key or database limiter cannot be reached.

## Rate-limit trust boundary

The current implementation takes the first valid IP in `X-Forwarded-For`, falling back to `X-Real-IP`; if neither is valid, requests share a fallback bucket. Before launch, verify the actual hosting edge overwrites client-supplied forwarding headers. If not, change the source to a trusted edge-provided client IP or deploy an edge/WAF rate limiter. The SQL fixed-window limiter does not provide CAPTCHA, bot classification, geographic filtering, distributed DDoS protection, or alerting.

## Database launch gates

After migrations 007–011 are manually applied to the intended Supabase project:

1. Verify anonymous and authenticated roles cannot execute the booking or availability RPCs directly.
2. Verify the server-role can execute both RPCs and the rate-limit function.
3. Verify a request exceeding either fixed-window threshold receives HTTP 429 with `Retry-After`.
4. Confirm the rate-limit counter cleanup works and storage remains bounded under representative traffic.
5. Verify active/inactive staff and owner/manager boundaries after migration 010.
6. Exercise simultaneous slot booking and overlapping rescheduling with test data.
7. Confirm direct RPC invocation through browser keys is denied.
8. Confirm Supabase service-role secret is absent from browser bundles and client-accessible source maps.

## Still not implemented / still blocking launch

- Database migrations have not been applied to Supabase in this workflow.
- The V2 server environment has not been configured or tested.
- No live Supabase RLS or concurrency test has been performed.
- No CAPTCHA or turnstile provider is configured.
- IP forwarding header trust needs confirmation against the actual hosting project.
- Guest booking retrieval and cancellation now use a high-entropy, browser-specific HttpOnly session cookie. There is no transferable one-time link or cross-device recovery flow.
- Staff auth sessions remain browser-held bearer tokens; hardened HttpOnly-cookie/session handling and CSP nonce policy still need review.
- Staff roles currently share the same appointment-management permission; finer-grained operational roles are not implemented.
- Studio-room reservations and multi-resource booking allocation remain unsupported.
- No V2 deployment, public booking enablement, payment collection or production cutover was performed.

## Rollback

If the V2 public API needs to be disabled, keep `public_booking_enabled = false` and remove/disable the V2 deployment. Do not re-grant anonymous RPC execution to restore functionality; use the V1 enquiry booking path while investigating. The migration is additive and does not alter the V1 `public.bookings` flow.


## Guest booking session status

Migration 012 and the customer management page now implement a server-issued 256-bit random session cookie. Only its SHA-256 digest is persisted. Guest reads and cancellations are service-role-only database RPCs; the cookie is HttpOnly, SameSite=Strict, Secure in production, and scoped to the guest-booking API path. The cancellation API checks Origin and only transitions confirmed bookings. Apply migration 012 and run the session-specific checks in `docs/v2/GUEST_BOOKING_MANAGEMENT.md` before enabling public booking.
