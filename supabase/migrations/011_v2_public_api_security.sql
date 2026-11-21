-- V2 launch-readiness security controls.
-- Apply after migrations 007-010.
-- Public booking and availability RPCs are callable only through trusted server
-- routes using the server-only Supabase service-role key. The public booking
-- feature switch remains false until the studio explicitly completes launch QA.

-- The service role is used by the application server only. Anonymous and
-- authenticated browser JWTs cannot bypass Next.js request rate limiting by
-- calling these SECURITY DEFINER functions directly.
revoke all on function public.get_appointment_availability(date, text, uuid[], text)
  from public, anon, authenticated;
grant execute on function public.get_appointment_availability(date, text, uuid[], text)
  to service_role;

revoke all on function public.create_appointment_booking(
  uuid, uuid[], timestamptz, text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_appointment_booking(
  uuid, uuid[], timestamptz, text, text, text, text, text, text, text, text, text, text
) to service_role;

-- Fixed-window request counters. Expired buckets are pruned opportunistically
-- by subsequent limiter invocations; no scheduled cleanup job is installed here.
-- The table is never directly readable/writable by browser roles.
create table if not exists public.api_rate_limit_buckets (
  client_ip inet not null,
  scope text not null check (scope in (
    'booking_availability',
    'booking_create',
    'booking_guest_read',
    'booking_guest_cancel'
  )),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (client_ip, scope)
);

create index if not exists api_rate_limit_buckets_window_idx
  on public.api_rate_limit_buckets (window_started_at);

alter table public.api_rate_limit_buckets enable row level security;
revoke all on public.api_rate_limit_buckets from public, anon, authenticated;
revoke all on public.api_rate_limit_buckets from service_role;

create or replace function public.consume_api_rate_limit(
  p_client_ip inet,
  p_scope text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  remaining integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
  v_request_count integer;
  v_retry_after integer;
begin
  if p_client_ip is null
    or p_scope is null
    or p_scope not in (
      'booking_availability',
      'booking_create',
      'booking_guest_read',
      'booking_guest_cancel'
    )
    or p_limit is null or p_limit < 1 or p_limit > 120
    or p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 3600 then
    raise exception using errcode = '22023', message = 'INVALID_RATE_LIMIT_REQUEST';
  end if;

  insert into public.api_rate_limit_buckets as current_bucket (
    client_ip, scope, window_started_at, request_count
  ) values (
    p_client_ip, p_scope, v_now, 1
  )
  on conflict (client_ip, scope) do update
  set
    window_started_at = case
      when current_bucket.window_started_at
        + make_interval(secs => p_window_seconds) <= v_now
      then v_now
      else current_bucket.window_started_at
    end,
    request_count = case
      when current_bucket.window_started_at
        + make_interval(secs => p_window_seconds) <= v_now
      then 1
      else current_bucket.request_count + 1
    end
  returning current_bucket.window_started_at,
            current_bucket.request_count
  into v_window_started_at, v_request_count;

  -- Bounded retention for abandoned IP buckets.
  delete from public.api_rate_limit_buckets
  where window_started_at < v_now - interval '2 days';

  v_retry_after := greatest(
    1,
    ceil(extract(epoch from (
      v_window_started_at + make_interval(secs => p_window_seconds) - v_now
    )))::integer
  );

  return query
  select
    v_request_count <= p_limit,
    case when v_request_count <= p_limit then 0 else v_retry_after end,
    greatest(0, p_limit - v_request_count);
end;
$function$;

revoke all on function public.consume_api_rate_limit(inet, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(inet, text, integer, integer)
  to service_role;

comment on table public.api_rate_limit_buckets is
  'Private fixed-window rate counters. Access is through consume_api_rate_limit() using the server-only service role.';
comment on function public.consume_api_rate_limit(inet, text, integer, integer) is
  'Atomically consumes one request from a bounded public API rate bucket; service-role only.';
