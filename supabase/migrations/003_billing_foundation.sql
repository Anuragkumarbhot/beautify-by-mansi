-- Billing foundation: one-time plan checkout records, not recurring mandates.
create table if not exists public.subscription_plans (
  code text primary key check (code ~ '^[a-z0-9_-]{2,40}$'),
  name text not null,
  amount_paise integer not null check (amount_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  duration_days integer not null check (duration_days between 1 and 3660),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.subscription_plans(code,name,amount_paise,duration_days)
values
 ('starter-monthly','Starter · 30 days',19900,30),
 ('pro-monthly','Pro · 30 days',49900,30),
 ('pro-yearly','Pro · 365 days',499900,365)
on conflict (code) do nothing;

create table if not exists public.customer_subscriptions (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 profile_id uuid not null references public.business_profiles(id) on delete cascade,
 plan_code text not null references public.subscription_plans(code),
 razorpay_order_id text unique,
 razorpay_payment_id text unique,
 amount_paise integer not null check (amount_paise > 0),
 currency text not null default 'INR' check (currency = 'INR'),
 status text not null default 'created' check (status in ('created','paid','failed','expired','refunded')),
 starts_at timestamptz,
 ends_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists customer_subscriptions_owner_idx on public.customer_subscriptions(owner_id,created_at desc);
create index if not exists customer_subscriptions_profile_idx on public.customer_subscriptions(profile_id);

create table if not exists public.payment_webhook_events (
 event_id text primary key,
 event_type text not null,
 processed_at timestamptz not null default now()
);

alter table public.subscription_plans enable row level security;
alter table public.customer_subscriptions enable row level security;
alter table public.payment_webhook_events enable row level security;
grant select on public.subscription_plans to anon,authenticated;
grant select on public.customer_subscriptions to authenticated;
revoke all on public.payment_webhook_events from anon,authenticated;
drop policy if exists "Anyone can view active subscription plans" on public.subscription_plans;
create policy "Anyone can view active subscription plans" on public.subscription_plans
for select using (active = true);
drop policy if exists "Owners can read their subscriptions" on public.customer_subscriptions;
create policy "Owners can read their subscriptions" on public.customer_subscriptions
for select to authenticated using (owner_id = (select auth.uid()));
-- All subscription/payment writes are performed by trusted Edge Functions using server secrets.
-- No browser INSERT/UPDATE/DELETE policies are granted.
grant update on public.customer_subscriptions to service_role;
grant insert,select on public.customer_subscriptions to service_role;
grant insert,select on public.payment_webhook_events to service_role;
