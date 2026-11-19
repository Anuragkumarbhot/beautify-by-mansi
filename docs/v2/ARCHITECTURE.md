# Beautify by Mansi — V2.0.0 Foundation Architecture

Status: proposed architecture and implementation plan. This document does not represent a production deployment or a completed migration.

## 1. Repository baseline (verified from `main`)

The current repository is a static, multi-page HTML/CSS/JavaScript application. The root `package.json` is private, declares Node.js >=18, and exposes `npm test` using Node's built-in test runner. It does not currently define a Next.js build or application runtime.

Existing user-facing areas include the main booking/pricing experience, The Beauty Edit product catalogue, makeup/press-on service pages, Business Studio, public business profiles, and admin pages.

The backend foundation is Supabase:
- Existing appointment bookings and admin allow-list.
- Business profiles and public profile RPCs.
- Billing tables, one-time plan checkout, and webhook event storage.
- Plan entitlements and multi-profile workspace limits.
- Supabase Edge Functions for business-profile plan order creation and Razorpay webhook processing.

Important boundary: the existing Razorpay flow documented in the repository is for Business Studio profile plans. It is not evidence that press-on nail product checkout has live Razorpay payments. Product orders currently have their own orders schema and should remain payment-disabled until a separate secure product-payment flow is implemented and tested.

The repository includes GitHub Actions for Node tests and a GitHub Pages static deployment workflow. The existing production website is also deployed through Vercel. Confirm deployment ownership and production routing before changing hosting or DNS.

## 2. V2 architectural decision

Use an incremental migration rather than replacing the working V1 site in one release.

- Keep the current root-level static site as the V1 fallback during V2 development.
- Build the new customer application under `apps/web` using Next.js App Router, TypeScript, and Tailwind CSS.
- Keep Supabase PostgreSQL as the system of record initially; do not introduce a second database.
- Use Supabase Auth for customer and staff identity.
- Enforce authorization in PostgreSQL RLS and trusted server-side functions, not in client-only checks.
- Use Supabase Edge Functions or a dedicated server API for privileged operations and payment-provider secrets.
- Use Vercel preview deployments for staging and a controlled production cutover after acceptance tests.

Do not migrate every existing page into Next.js before the shared design system, authentication, and data-access layer are stable.

## 3. Target logical architecture

Customer browser / mobile web
→ Next.js presentation and server routes
→ Supabase Auth (identity)
→ PostgreSQL (profiles, products, variants, inventory, carts, orders, bookings)
→ RLS policies and narrowly scoped RPCs

Trusted payment boundary
→ server-side order creation
→ Razorpay Checkout
→ signed webhook verification
→ idempotent payment event processing
→ order/payment state transition in PostgreSQL

Operational integrations
→ WhatsApp deep links / approved WhatsApp Business Platform integration
→ email provider (to be selected)
→ analytics and error monitoring (to be selected)

Never expose service-role keys, Razorpay secrets, webhook secrets, or database credentials in browser code, static assets, Git history, or public environment variables.

## 4. Domain model for V2

Retain and evolve the existing tables where practical. Introduce new tables only through ordered, reviewed migrations.

| Domain | Proposed entities | Notes |
|---|---|---|
| Identity | auth.users, customer_profiles, staff_members | Auth provider remains Supabase Auth |
| Business profiles | business_profiles, profile subscriptions | Existing multi-profile workspace remains separate from retail customers |
| Catalogue | products, product_variants, product_media, collections | Variant dimensions include nail size and design |
| Inventory | inventory_levels, inventory_movements | Track stock changes as auditable movements |
| Cart | carts, cart_items | Server validates price and availability at checkout |
| Retail commerce | orders, order_items, fulfilments | Product orders must not share subscription payment semantics |
| Payments | payment_attempts, payment_events, refunds | Provider IDs unique; event processing idempotent |
| Appointments | bookings, booking_services, availability_rules | Preserve current booking records and status history |
| Marketing | coupons, campaign_assets, consent_records | Consent and unsubscribe support required |
| Operations | audit_events, notification_jobs | Avoid storing secrets or unnecessary sensitive data |

### Retail order invariants

1. Prices and totals are recomputed by trusted server code from active product/variant records; never trust client-submitted totals.
2. A browser callback is not proof of payment.
3. Only a verified provider webhook can mark a payment as captured/paid.
4. Webhook handling must be signature-verified, idempotent, amount/currency checked, and safe under retries.
5. Order status and payment status are separate state machines.
6. Address and contact data are access-controlled and retained only as long as operationally necessary.
7. Public visitors may create a limited order request, but must never read other customers' orders.

## 5. Migration plan

### Stage 0 — Baseline and safety
- Record the current production commit and deployment target.
- Confirm Supabase migrations already applied in the live project; repository presence does not prove database application.
- Export/backup database before schema changes.
- Add automated tests for existing pricing and order validation.
- Verify V1 booking, product enquiry, admin login, and Business Studio paths.

### Stage 1 — Application foundation
- Add `apps/web` Next.js application and TypeScript configuration.
- Add shared design tokens and accessible component primitives.
- Add environment-variable validation with separate public and server-only namespaces.
- Add preview deployment and CI build/typecheck/lint gates.
- No production traffic migration at this stage.

### Stage 2 — Read-only storefront migration
- Port homepage, services, catalogue, and product detail views.
- Read catalogue data from a server-controlled source.
- Preserve WhatsApp enquiry fallback.
- Compare mobile/desktop output and SEO metadata against V1.

### Stage 3 — Identity and customer workspace
- Add customer account flows, profile management, order history, and protected routes.
- Add customer-specific RLS policies and authorization tests.
- Keep staff/admin roles separate from customer ownership.

### Stage 4 — Retail commerce
- Implement server-validated cart and checkout.
- Add payment_attempts/payment_events and verified Razorpay product-payment flow only after credentials, webhook configuration, refund policy, and reconciliation are ready.
- Test duplicate webhook delivery, invalid signatures, amount mismatch, failed payments, retries, and partial failures.

### Stage 5 — Studio operations
- Add product/variant inventory, stock movements, fulfilment management, appointment calendar, and operational reporting.
- Add role-based staff access and audit trail.

### Stage 6 — Launch and cutover
- Run security review, accessibility checks, mobile QA, load checks, backup/restore drill, and payment sandbox suite.
- Conduct a limited pilot.
- Cut over production only after owner approval and rollback procedure are documented.
- Keep V1 deployable until V2 has passed the agreed observation period.

## 6. Proposed application structure

```text
apps/
  web/
    src/
      app/
        (store)/
        account/
        admin/
        api/
      components/
      features/
        catalogue/
        cart/
        orders/
        bookings/
        profile/
      lib/
        supabase/
        validation/
        security/
      styles/
packages/
  ui/
  domain/
  config/
supabase/
  migrations/
  functions/
tests/
  unit/
  integration/
  e2e/
docs/
  v2/
```

This is the target structure, not a claim that these directories already exist.

## 7. Release gates

V2.0.0 is not ready for release until all of the following pass:
- CI build, lint, typecheck, unit and integration tests.
- RLS tests for anonymous, customer, staff, and admin roles.
- No secret scanning findings in source or build artifacts.
- Product prices and stock are server-authoritative.
- Payment webhook signature, idempotency, amount, and currency tests pass.
- Customer A cannot read or mutate Customer B's orders or profile.
- Booking, order, cancellation, refund, and fulfilment states are tested.
- Mobile, keyboard, screen-reader, and accessibility checks pass.
- Backup, restore, monitoring, incident response, and rollback are documented.
- Business owner signs off on content, prices, legal/privacy text, and production cutover.

## 8. Known decisions still required

- Final product catalogue source and who maintains inventory.
- Delivery regions, shipping charges, delivery partner, and return/refund rules.
- Whether customer login is mandatory or guest checkout remains supported.
- Staff roles and which staff can view customer addresses and phone numbers.
- Email/WhatsApp notification provider and customer consent wording.
- Retail Razorpay account readiness and product-payment settlement workflow.
- Tax/GST invoice requirements and commercial pricing approval.

## 9. Verification boundary

This blueprint is based on repository source inspection. It does not verify the live Supabase schema, live Razorpay configuration, production secrets, current order insertion, or browser end-to-end behaviour. Those require environment-level tests before release.
