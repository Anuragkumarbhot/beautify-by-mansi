-- Beautify by Mansi V2 staging smoke checks.
-- Run only against the isolated STAGING database after migrations 007-012.
-- This file contains SELECT diagnostics only; it performs no data changes.

-- 1. Required V2 objects. Every returned relation should be non-null.
select
  to_regclass('public.appointment_booking_settings') as booking_settings,
  to_regclass('public.appointment_services') as services,
  to_regclass('public.appointment_resources') as resources,
  to_regclass('public.appointment_availability_rules') as availability_rules,
  to_regclass('public.appointment_bookings') as bookings,
  to_regclass('public.appointment_booking_resources') as booking_resources,
  to_regclass('public.appointment_guest_sessions') as guest_sessions,
  to_regclass('public.api_rate_limit_buckets') as rate_limit_buckets;

-- 2. RLS should be enabled on appointment tables, guest sessions and rate buckets.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and (
    c.relname like 'appointment_%'
    or c.relname = 'api_rate_limit_buckets'
  )
  and c.relkind in ('r', 'p')
order by c.relname;

-- 3. The studio reservation exclusion constraint should exist.
select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = to_regclass('public.appointment_booking_resources')
  and contype = 'x';

-- 4. Final booking switch state must be false before controlled staging E2E.
select id, public_booking_enabled, timezone_name, minimum_notice_minutes, booking_horizon_days
from public.appointment_booking_settings
where id = 1;

-- 5. Final browser/server RPC grants after migrations 011-012.
with signatures as (
  select
    'availability' as rpc_name,
    to_regprocedure('public.get_appointment_availability(date,text,uuid[],text)') as function_oid
  union all
  select
    'create_booking',
    to_regprocedure('public.create_appointment_booking(uuid,uuid[],timestamp with time zone,text,text,text,text,text,text,text,text,text,text)')
  union all
  select
    'rate_limit',
    to_regprocedure('public.consume_api_rate_limit(inet,text,integer,integer)')
  union all
  select
    'guest_session_create',
    to_regprocedure('public.create_appointment_guest_session(uuid,text,timestamp with time zone)')
  union all
  select
    'guest_session_read',
    to_regprocedure('public.get_appointment_by_guest_session(text)')
  union all
  select
    'guest_session_cancel',
    to_regprocedure('public.cancel_appointment_by_guest_session(text)')
)
select
  rpc_name,
  function_oid is not null as function_exists,
  has_function_privilege('anon', function_oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', function_oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', function_oid, 'EXECUTE') as service_role_can_execute
from signatures
order by rpc_name;

-- 6. Browser roles should not have direct read access to private storage.
select
  has_table_privilege('anon', to_regclass('public.appointment_guest_sessions'), 'SELECT') as anon_can_read_guest_sessions,
  has_table_privilege('authenticated', to_regclass('public.appointment_guest_sessions'), 'SELECT') as authenticated_can_read_guest_sessions,
  has_table_privilege('service_role', to_regclass('public.appointment_guest_sessions'), 'SELECT') as service_role_has_direct_guest_session_select,
  has_table_privilege('anon', to_regclass('public.api_rate_limit_buckets'), 'SELECT') as anon_can_read_rate_buckets,
  has_table_privilege('authenticated', to_regclass('public.api_rate_limit_buckets'), 'SELECT') as authenticated_can_read_rate_buckets,
  has_table_privilege('service_role', to_regclass('public.api_rate_limit_buckets'), 'SELECT') as service_role_has_direct_rate_bucket_select;

-- Expected final state:
-- * All listed relations/functions exist.
-- * RLS is true for all V2 appointment tables, guest sessions and rate buckets.
-- * The exclusion constraint query returns at least one row.
-- * public_booking_enabled is false.
-- * Browser-role RPC execute booleans are false; service_role booleans are true.
-- * Direct browser-role SELECT booleans on private storage are false.
-- * The migration deliberately revokes direct table privileges from service_role
--   as well; security-definer RPCs own access to those tables.
