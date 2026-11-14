-- Beautify by Mansi: product orders + makeup appointments
-- Migration: run in Supabase SQL Editor after the existing schema.sql.
-- Payment is intentionally disabled until a Razorpay account and trusted backend are configured.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_name text not null check (char_length(customer_name) between 1 and 80),
  customer_phone text not null check (char_length(customer_phone) between 7 and 20),
  customer_email text not null default '' check (char_length(customer_email) <= 254),
  order_type text not null check (order_type in ('nail_product','makeup_service','mixed')),
  items jsonb not null check (
    jsonb_typeof(items) = 'array'
    and jsonb_array_length(items) between 1 and 30
  ),
  subtotal integer not null check (subtotal >= 0),
  discount integer not null default 0 check (discount >= 0),
  total integer not null check (total >= 0),
  currency text not null default 'INR' check (currency = 'INR'),
  fulfilment_type text not null default 'not_set'
    check (fulfilment_type in ('delivery','studio','venue','not_set')),
  delivery_address text not null default '' check (char_length(delivery_address) <= 500),
  event_date date,
  event_location text not null default '' check (char_length(event_location) <= 160),
  customer_notes text not null default '' check (char_length(customer_notes) <= 1000),
  order_status text not null default 'New'
    check (order_status in ('New','Contacted','Confirmed','In Progress','Ready','Completed','Cancelled')),
  payment_status text not null default 'Not Started'
    check (payment_status in ('Not Started','Pending','Paid','Failed','Refunded')),
  payment_provider text not null default 'none'
    check (payment_provider in ('none','razorpay')),
  payment_reference text not null default '' check (char_length(payment_reference) <= 160),
  source text not null default 'website'
    check (source in ('website','whatsapp','admin'))
);

alter table public.orders enable row level security;

drop policy if exists "Public can submit orders" on public.orders;
create policy "Public can submit orders"
on public.orders for insert to anon, authenticated
with check (
  order_status = 'New'
  and payment_status = 'Not Started'
  and payment_provider = 'none'
  and payment_reference = ''
  and char_length(customer_name) between 1 and 80
  and char_length(customer_phone) between 7 and 20
  and jsonb_typeof(items) = 'array'
  and jsonb_array_length(items) between 1 and 30
  and subtotal >= 0 and discount >= 0 and total >= 0
);

drop policy if exists "Admins can view orders" on public.orders;
create policy "Admins can view orders"
on public.orders for select to authenticated
using (public.is_booking_admin());

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
on public.orders for update to authenticated
using (public.is_booking_admin())
with check (public.is_booking_admin());

drop policy if exists "Admins can delete orders" on public.orders;
create policy "Admins can delete orders"
on public.orders for delete to authenticated
using (public.is_booking_admin());

grant insert on public.orders to anon, authenticated;
grant select, update, delete on public.orders to authenticated;

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (order_status, payment_status);

-- IMPORTANT:
-- The public website cannot set an order to Paid.
-- Razorpay checkout/order creation and webhook signature verification must be
-- implemented on a trusted server before enabling online payments.
