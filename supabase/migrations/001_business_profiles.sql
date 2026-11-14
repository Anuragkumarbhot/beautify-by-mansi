-- Beautify by Mansi: multi-tenant business profile foundation
-- Apply in Supabase SQL Editor or via Supabase CLI migrations.
create extension if not exists pgcrypto;

create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  business_name text not null check (char_length(business_name) between 1 and 100),
  owner_name text not null default '' check (char_length(owner_name) <= 80),
  category text not null default '' check (char_length(category) <= 100),
  bio text not null default '' check (char_length(bio) <= 500),
  phone text not null default '' check (char_length(phone) <= 30),
  city text not null default '' check (char_length(city) <= 120),
  website_url text not null default '' check (char_length(website_url) <= 500),
  instagram_url text not null default '' check (char_length(instagram_url) <= 500),
  google_review_url text not null default '' check (char_length(google_review_url) <= 500),
  theme text not null default 'rose-gold' check (theme in ('rose-gold','ivory','plum')),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_profiles_slug_format check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])?$'),
  constraint business_profiles_website_scheme check (website_url = '' or website_url ~* '^https://'),
  constraint business_profiles_instagram_scheme check (instagram_url = '' or instagram_url ~* '^https://'),
  constraint business_profiles_review_scheme check (google_review_url = '' or google_review_url ~* '^https://')
);

create index if not exists business_profiles_owner_id_idx on public.business_profiles(owner_id);
create index if not exists business_profiles_published_idx on public.business_profiles(slug) where is_published = true;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists business_profiles_set_updated_at on public.business_profiles;
create trigger business_profiles_set_updated_at
before update on public.business_profiles
for each row execute function public.set_updated_at();

alter table public.business_profiles enable row level security;

-- Public visitors can read published cards only. Owners can read their own drafts.
drop policy if exists "Public can read published business profiles" on public.business_profiles;
create policy "Public can read published business profiles"
on public.business_profiles for select
using (is_published = true);

drop policy if exists "Owners can read their own business profiles" on public.business_profiles;
create policy "Owners can read their own business profiles"
on public.business_profiles for select to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "Owners can create business profiles" on public.business_profiles;
create policy "Owners can create business profiles"
on public.business_profiles for insert to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can update their own business profiles" on public.business_profiles;
create policy "Owners can update their own business profiles"
on public.business_profiles for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can delete their own business profiles" on public.business_profiles;
create policy "Owners can delete their own business profiles"
on public.business_profiles for delete to authenticated
using (owner_id = (select auth.uid()));

-- No anonymous writes. Never expose the Supabase service_role key in browser code.
