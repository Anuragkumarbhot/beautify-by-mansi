-- Phase 8: multi-profile workspace with database-enforced plan limits.
-- Apply after migrations 001-005.
-- Starter: 1 profile. Pro monthly/yearly: up to 5 profiles per account.

create or replace function public.get_business_workspace_entitlements()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_count integer := 0;
  v_limit integer := 1;
  v_pro boolean := false;
begin
  if v_user is null then
    return null;
  end if;

  select count(*)::integer into v_count
  from public.business_profiles bp
  where bp.owner_id = v_user;

  select coalesce(bool_or(e.premium_themes), false)
    into v_pro
  from public.business_profiles bp
  join public.customer_subscriptions s on s.profile_id = bp.id
  join public.subscription_plan_entitlements e on e.plan_code = s.plan_code
  where bp.owner_id = v_user
    and s.status = 'paid'
    and s.starts_at <= now()
    and s.ends_at > now();

  if v_pro then v_limit := 5; end if;

  return jsonb_build_object(
    'profile_count', v_count,
    'profile_limit', v_limit,
    'can_create_profile', v_count < v_limit,
    'plan_tier', case when v_pro then 'pro' else 'starter' end
  );
end;
$function$;

revoke all on function public.get_business_workspace_entitlements() from public, anon;
grant execute on function public.get_business_workspace_entitlements() to authenticated;

create or replace function public.enforce_business_profile_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_count integer;
  v_pro boolean := false;
begin
  if tg_op <> 'INSERT' then
    return new;
  end if;

  -- Serialize profile creation per account so concurrent requests cannot exceed the limit.
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 0));

  select count(*)::integer into v_count
  from public.business_profiles bp
  where bp.owner_id = new.owner_id;

  select coalesce(bool_or(e.premium_themes), false)
    into v_pro
  from public.business_profiles bp
  join public.customer_subscriptions s on s.profile_id = bp.id
  join public.subscription_plan_entitlements e on e.plan_code = s.plan_code
  where bp.owner_id = new.owner_id
    and s.status = 'paid'
    and s.starts_at <= now()
    and s.ends_at > now();

  if v_count >= (case when v_pro then 5 else 1 end) then
    raise exception 'Your current plan profile limit has been reached. Upgrade to Pro to manage up to five business profiles.';
  end if;

  return new;
end;
$function$;

drop trigger if exists business_profiles_enforce_profile_limit on public.business_profiles;
create trigger business_profiles_enforce_profile_limit
before insert on public.business_profiles
for each row execute function public.enforce_business_profile_limit();

revoke all on function public.enforce_business_profile_limit() from public, anon, authenticated;
