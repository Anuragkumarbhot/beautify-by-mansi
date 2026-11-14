-- Platform administrator access. Admin membership is provisioned manually by a trusted project owner.
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;
grant select on public.platform_admins to authenticated;

drop policy if exists "Admins can read own membership" on public.platform_admins;
create policy "Admins can read own membership"
on public.platform_admins for select to authenticated
using (user_id = (select auth.uid()));

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

drop policy if exists "Platform admins can read all business profiles" on public.business_profiles;
create policy "Platform admins can read all business profiles"
on public.business_profiles for select to authenticated
using ((select public.is_platform_admin()));

-- Deliberately no client-side INSERT/UPDATE/DELETE policy on platform_admins.
-- Provision an administrator from the Supabase SQL Editor only:
-- insert into public.platform_admins (user_id)
-- select id from auth.users where email = 'YOUR-ADMIN-EMAIL';
