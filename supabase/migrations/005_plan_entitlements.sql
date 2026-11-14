-- Phase 7: plan-based feature entitlements enforced by PostgreSQL.
-- Apply after migrations 001-004.

create table if not exists public.subscription_plan_entitlements (
  plan_code text primary key references public.subscription_plans(code) on delete cascade,
  premium_themes boolean not null default false,
  review_links boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.subscription_plan_entitlements (plan_code, premium_themes, review_links)
values
  ('starter-monthly', false, false),
  ('pro-monthly', true, true),
  ('pro-yearly', true, true)
on conflict (plan_code) do update
set premium_themes = excluded.premium_themes,
    review_links = excluded.review_links,
    updated_at = now();

alter table public.subscription_plan_entitlements enable row level security;
revoke all on public.subscription_plan_entitlements from public, anon, authenticated;
grant select on public.subscription_plan_entitlements to service_role;

-- The owner-facing function exposes only the signed-in owner's effective plan flags.
create or replace function public.get_business_profile_entitlements(p_profile_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_owner_id uuid;
  v_result jsonb;
begin
  select bp.owner_id
    into v_owner_id
  from public.business_profiles bp
  where bp.id = p_profile_id;

  if v_owner_id is null or v_owner_id is distinct from auth.uid() then
    return null;
  end if;

  select jsonb_build_object(
    'active', true,
    'plan_code', s.plan_code,
    'premium_themes', e.premium_themes,
    'review_links', e.review_links,
    'ends_at', s.ends_at
  )
  into v_result
  from public.customer_subscriptions s
  join public.subscription_plan_entitlements e on e.plan_code = s.plan_code
  where s.profile_id = p_profile_id
    and s.owner_id = v_owner_id
    and s.status = 'paid'
    and s.starts_at <= now()
    and s.ends_at > now()
  order by s.ends_at desc
  limit 1;

  return coalesce(
    v_result,
    jsonb_build_object(
      'active', false,
      'plan_code', null,
      'premium_themes', false,
      'review_links', false,
      'ends_at', null
    )
  );
end;
$function$;

revoke all on function public.get_business_profile_entitlements(uuid) from public, anon;
grant execute on function public.get_business_profile_entitlements(uuid) to authenticated;

-- Public profile data is served through a sanitizing RPC, not direct table reads.
-- Starter profiles receive the base theme and no Google-review link.
create or replace function public.get_public_business_profile(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'slug', bp.slug,
    'business_name', bp.business_name,
    'owner_name', bp.owner_name,
    'category', bp.category,
    'bio', bp.bio,
    'phone', bp.phone,
    'city', bp.city,
    'website_url', bp.website_url,
    'instagram_url', bp.instagram_url,
    'google_review_url', case when e.review_links then bp.google_review_url else '' end,
    'theme', case when e.premium_themes then bp.theme else 'rose-gold' end
  )
  from public.business_profiles bp
  join public.customer_subscriptions s
    on s.profile_id = bp.id
   and s.status = 'paid'
   and s.starts_at <= now()
   and s.ends_at > now()
  join public.subscription_plan_entitlements e
    on e.plan_code = s.plan_code
  where bp.slug = p_slug
    and bp.is_published = true
  order by s.ends_at desc
  limit 1;
$function$;

revoke all on function public.get_public_business_profile(text) from public;
grant execute on function public.get_public_business_profile(text) to anon, authenticated;

-- Prevent anonymous clients from bypassing plan-aware output through REST table selection.
revoke select on public.business_profiles from anon;

-- Enforce premium fields and publishing at the database boundary as well as in the UI.
create or replace function public.enforce_business_profile_entitlements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_active boolean := false;
  v_premium_themes boolean := false;
  v_review_links boolean := false;
begin
  select
    coalesce(bool_or(
      s.status = 'paid'
      and s.starts_at <= now()
      and s.ends_at > now()
    ), false),
    coalesce(bool_or(
      s.status = 'paid'
      and s.starts_at <= now()
      and s.ends_at > now()
      and e.premium_themes
    ), false),
    coalesce(bool_or(
      s.status = 'paid'
      and s.starts_at <= now()
      and s.ends_at > now()
      and e.review_links
    ), false)
  into v_active, v_premium_themes, v_review_links
  from public.customer_subscriptions s
  left join public.subscription_plan_entitlements e on e.plan_code = s.plan_code
  where s.profile_id = new.id;

  if (tg_op = 'INSERT' or new.theme is distinct from old.theme)
     and new.theme in ('ivory', 'plum')
     and not v_premium_themes then
    raise exception 'Premium themes require an active Pro plan';
  end if;

  if (tg_op = 'INSERT' or new.google_review_url is distinct from old.google_review_url)
     and new.google_review_url <> ''
     and not v_review_links then
    raise exception 'Google review links require an active Pro plan';
  end if;

  if new.is_published
     and (tg_op = 'INSERT' or new.is_published is distinct from old.is_published)
     and not v_active then
    raise exception 'An active paid plan is required to publish this profile';
  end if;

  return new;
end;
$function$;

drop trigger if exists business_profiles_enforce_entitlements on public.business_profiles;
create trigger business_profiles_enforce_entitlements
before insert or update on public.business_profiles
for each row execute function public.enforce_business_profile_entitlements();

-- The trigger function is invoked by PostgreSQL only; it is not a client RPC.
revoke all on function public.enforce_business_profile_entitlements() from public, anon, authenticated;
