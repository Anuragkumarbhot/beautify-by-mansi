-- Beautify by Mansi: cloud booking schema
-- Run this in Supabase SQL Editor after creating the project.

create extension if not exists pgcrypto;

create table if not exists public.booking_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_name text not null check (char_length(customer_name) between 1 and 80),
  customer_phone text not null check (char_length(customer_phone) between 7 and 20),
  event_type text not null check (char_length(event_type) between 1 and 80),
  event_date date not null,
  preferred_time text not null check (char_length(preferred_time) between 1 and 80),
  service_location text not null check (char_length(service_location) between 1 and 100),
  nail_style text not null default '',
  notes text not null default '' check (char_length(notes) <= 500),
  services jsonb not null default '[]'::jsonb check (jsonb_typeof(services) = 'array'),
  regular_total integer not null default 0 check (regular_total >= 0),
  savings integer not null default 0 check (savings >= 0),
  offer_total integer not null default 0 check (offer_total >= 0),
  advance integer not null default 0 check (advance >= 0),
  balance integer not null default 0 check (balance >= 0),
  status text not null default 'New'
    check (status in ('New','Contacted','Confirmed','Completed','Cancelled'))
);

create or replace function public.is_booking_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.booking_admins
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_booking_admin() from public;
grant execute on function public.is_booking_admin() to authenticated;

alter table public.booking_admins enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "Admins can read booking admin list" on public.booking_admins;
create policy "Admins can read booking admin list"
on public.booking_admins for select to authenticated
using (public.is_booking_admin());

drop policy if exists "Public can submit booking requests" on public.bookings;
create policy "Public can submit booking requests"
on public.bookings for insert to anon, authenticated
with check (
  status = 'New'
  and char_length(customer_name) between 1 and 80
  and char_length(customer_phone) between 7 and 20
  and char_length(event_type) between 1 and 80
  and event_date >= current_date
  and char_length(preferred_time) between 1 and 80
  and char_length(service_location) between 1 and 100
  and char_length(notes) <= 500
  and jsonb_typeof(services) = 'array'
);

drop policy if exists "Admins can view all bookings" on public.bookings;
create policy "Admins can view all bookings"
on public.bookings for select to authenticated
using (public.is_booking_admin());

drop policy if exists "Admins can update bookings" on public.bookings;
create policy "Admins can update bookings"
on public.bookings for update to authenticated
using (public.is_booking_admin())
with check (public.is_booking_admin());

drop policy if exists "Admins can delete bookings" on public.bookings;
create policy "Admins can delete bookings"
on public.bookings for delete to authenticated
using (public.is_booking_admin());

grant insert on public.bookings to anon, authenticated;
grant select, update, delete on public.bookings to authenticated;
grant select on public.booking_admins to authenticated;

-- Admin bootstrap:
-- 1) Create Mansi's user in Supabase Authentication > Users.
-- 2) Copy that user's UUID.
-- 3) Run: insert into public.booking_admins (user_id) values ('PASTE-AUTH-USER-UUID-HERE');
-- Never put a service_role key in this website.
