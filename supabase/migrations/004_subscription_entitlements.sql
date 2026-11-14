-- Phase 6: enforce paid access for published profiles and safely extend renewals.
-- Apply after migrations 001, 002 and 003.

create or replace function public.activate_customer_subscription(
  p_order_id text,
  p_payment_id text,
  p_amount_paise integer,
  p_currency text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub public.customer_subscriptions%rowtype;
  v_duration integer;
  v_start timestamptz;
begin
  select * into v_sub
  from public.customer_subscriptions
  where razorpay_order_id = p_order_id
  for update;

  if not found then
    raise exception 'Subscription order not found';
  end if;

  if v_sub.amount_paise <> p_amount_paise or v_sub.currency <> p_currency then
    raise exception 'Payment amount or currency mismatch';
  end if;

  if v_sub.status = 'paid' then
    if v_sub.razorpay_payment_id = p_payment_id then
      return;
    end if;
    raise exception 'Order already activated with another payment';
  end if;

  if v_sub.status <> 'created' then
    raise exception 'Order is not eligible for activation';
  end if;

  select duration_days into v_duration
  from public.subscription_plans
  where code = v_sub.plan_code and active = true;

  if v_duration is null then
    raise exception 'Subscription plan is unavailable';
  end if;

  select greatest(now(), coalesce(max(ends_at), now()))
  into v_start
  from public.customer_subscriptions
  where profile_id = v_sub.profile_id and status = 'paid';

  update public.customer_subscriptions
  set status = 'paid',
      razorpay_payment_id = p_payment_id,
      starts_at = v_start,
      ends_at = v_start + make_interval(days => v_duration),
      updated_at = now()
  where id = v_sub.id;
end;
$$;

revoke all on function public.activate_customer_subscription(text,text,integer,text) from public, anon, authenticated;
grant execute on function public.activate_customer_subscription(text,text,integer,text) to service_role;

create or replace function public.has_active_profile_subscription(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select exists (
    select 1
    from public.customer_subscriptions s
    where s.profile_id = p_profile_id
      and s.status = 'paid'
      and s.starts_at <= now()
      and s.ends_at > now()
  );
$;

revoke all on function public.has_active_profile_subscription(uuid) from public;
grant execute on function public.has_active_profile_subscription(uuid) to anon, authenticated;

drop policy if exists "Public can read published business profiles" on public.business_profiles;
create policy "Public can read published business profiles"
on public.business_profiles for select
to anon, authenticated
using (
  is_published = true
  and (select public.has_active_profile_subscription(business_profiles.id))
);

-- Owners and platform admins retain their separate SELECT policies.
-- Expired paid rows remain in history; access is calculated from starts_at/ends_at.
