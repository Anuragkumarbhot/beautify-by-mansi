-- Beautify by Mansi V2: staff appointment lifecycle and transactional rescheduling.
-- Apply only after migrations 007 and 008.
-- This migration does not enable public booking and uses caller JWT + RLS.

-- Harden booking updates. The old trigger only fired for UPDATE OF status, so
-- schedule columns could otherwise be modified by a staff table update.
create or replace function public.guard_appointment_booking_status()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if (to_jsonb(new) - array['status', 'starts_at', 'ends_at', 'updated_at', 'cancelled_at'])
     is distinct from
     (to_jsonb(old) - array['status', 'starts_at', 'ends_at', 'updated_at', 'cancelled_at']) then
    raise exception 'Appointment customer, service, location and payment details are immutable in staff operations.';
  end if;

  if old.status is distinct from new.status
    and not (old.status = 'confirmed' and new.status in ('cancelled', 'completed', 'no_show')) then
    raise exception 'Only a confirmed appointment can transition to a terminal status.';
  end if;

  if old.starts_at is distinct from new.starts_at
    or old.ends_at is distinct from new.ends_at then
    if coalesce(current_setting('app.allow_appointment_reschedule', true), '') <> 'on'
      or old.status <> 'confirmed'
      or new.status <> 'confirmed' then
      raise exception 'Appointment time changes must use the transactional reschedule workflow.';
    end if;
  end if;

  if old.cancelled_at is distinct from new.cancelled_at
    and not (old.status = 'confirmed' and new.status = 'cancelled') then
    raise exception 'Cancellation timestamps are system managed.';
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  end if;

  return new;
end;
$function$;

drop trigger if exists appointment_bookings_guard_status on public.appointment_bookings;
create trigger appointment_bookings_guard_status
before update on public.appointment_bookings
for each row execute function public.guard_appointment_booking_status();

create or replace function public.reschedule_appointment_booking(
  p_booking_id uuid,
  p_new_starts_at timestamptz
)
returns table (
  reference text,
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_booking public.appointment_bookings%rowtype;
  v_resource_id uuid;
  v_resource_count integer;
  v_item_count integer;
  v_duration integer;
  v_buffer_before integer;
  v_buffer_after integer;
  v_service_ids uuid[];
  v_service_count integer;
  v_mapped_count integer;
  v_timezone text;
  v_minimum_notice integer;
  v_booking_horizon integer;
  v_local_date date;
  v_ends_at timestamptz;
  v_reserved_from timestamptz;
  v_reserved_to timestamptz;
  v_travel_buffer integer := 0;
  v_mapping_count integer;
begin
  if (select auth.uid()) is null or not public.is_appointment_staff() then
    raise exception using errcode = '42501', message = 'STAFF_ACCESS_REQUIRED';
  end if;

  if p_booking_id is null or p_new_starts_at is null then
    raise exception using errcode = '22023', message = 'INVALID_RESCHEDULE_REQUEST';
  end if;

  select b.*
    into v_booking
  from public.appointment_bookings b
  where b.id = p_booking_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'APPOINTMENT_NOT_FOUND';
  end if;

  if v_booking.status <> 'confirmed' then
    raise exception using errcode = 'P0001', message = 'APPOINTMENT_NOT_RESCHEDULABLE';
  end if;

  select
    count(*)::integer,
    coalesce(sum(i.duration_snapshot_minutes), 0)::integer,
    coalesce(sum(i.buffer_before_snapshot_minutes), 0)::integer,
    coalesce(sum(i.buffer_after_snapshot_minutes), 0)::integer,
    array_agg(i.service_id order by i.service_id)
  into v_item_count, v_duration, v_buffer_before, v_buffer_after, v_service_ids
  from public.appointment_booking_items i
  where i.booking_id = p_booking_id;

  if v_item_count < 1 or v_duration < 1 or v_duration > 1440 then
    raise exception using errcode = 'P0001', message = 'APPOINTMENT_SERVICE_SNAPSHOT_INVALID';
  end if;

  select count(*)::integer
    into v_resource_count
  from public.appointment_booking_resources br
  where br.booking_id = p_booking_id
    and br.is_active = true;

  -- Phase B allocates one staff resource per booking. Multi-resource/room
  -- assignment must be implemented before this constraint is relaxed.
  if v_resource_count <> 1 then
    raise exception using errcode = 'P0001', message = 'APPOINTMENT_RESOURCE_CONFIGURATION_UNSUPPORTED';
  end if;

  select br.resource_id
    into v_resource_id
  from public.appointment_booking_resources br
  where br.booking_id = p_booking_id
    and br.is_active = true
  limit 1;

  perform 1
  from public.appointment_resources r
  where r.id = v_resource_id
    and r.resource_type = 'staff'
    and r.is_active = true
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'APPOINTMENT_RESOURCE_UNAVAILABLE';
  end if;

  select
    count(distinct rs.service_id)::integer
  into v_mapped_count
  from public.appointment_resource_services rs
  where rs.resource_id = v_resource_id
    and rs.location_type = v_booking.location_type
    and rs.service_id = any(v_service_ids);

  if v_mapped_count <> cardinality(v_service_ids) then
    raise exception using errcode = 'P0001', message = 'APPOINTMENT_RESOURCE_SERVICE_MAPPING_CHANGED';
  end if;

  select s.timezone_name, s.minimum_notice_minutes, s.booking_horizon_days
    into v_timezone, v_minimum_notice, v_booking_horizon
  from public.appointment_booking_settings s
  where s.id = 1;

  if not found or v_timezone is null
    or not exists (select 1 from pg_timezone_names z where z.name = v_timezone)
    or v_minimum_notice is null
    or v_booking_horizon is null then
    raise exception using errcode = 'P0001', message = 'BOOKING_SETTINGS_INCOMPLETE';
  end if;

  if v_booking.service_area_id is not null then
    select a.travel_buffer_minutes
      into v_travel_buffer
    from public.appointment_service_areas a
    where a.id = v_booking.service_area_id
      and a.is_active = true;

    if not found then
      raise exception using errcode = 'P0001', message = 'HOME_SERVICE_AREA_UNAVAILABLE';
    end if;
  end if;

  v_local_date := (p_new_starts_at at time zone v_timezone)::date;
  v_ends_at := p_new_starts_at + make_interval(mins => v_duration);
  v_reserved_from := p_new_starts_at
    - make_interval(mins => v_buffer_before + v_travel_buffer);
  v_reserved_to := v_ends_at
    + make_interval(mins => v_buffer_after + v_travel_buffer);

  if p_new_starts_at <= now() + make_interval(mins => v_minimum_notice)
    or v_local_date > ((now() at time zone v_timezone)::date + v_booking_horizon) then
    raise exception using errcode = 'P0001', message = 'RESCHEDULE_OUTSIDE_ALLOWED_WINDOW';
  end if;

  -- Confirm the original assigned staff member can still deliver every
  -- snapshot service at the requested slot and that the slot aligns to their
  -- configured grid. The resource row lock serializes this with new bookings
  -- and staff schedule edits.
  if not exists (
    select 1
    from public.appointment_availability_rules ar
    where ar.resource_id = v_resource_id
      and ar.location_type = v_booking.location_type
      and ar.weekday = extract(dow from v_local_date)::smallint
      and ar.is_active = true
      and ar.timezone_name = v_timezone
      and (ar.effective_from is null or v_local_date >= ar.effective_from)
      and (ar.effective_until is null or v_local_date <= ar.effective_until)
      and v_reserved_from >= ((v_local_date + ar.opens_at) at time zone ar.timezone_name)
      and v_reserved_to <= ((v_local_date + ar.closes_at) at time zone ar.timezone_name)
      and p_new_starts_at >= (
        ((v_local_date + ar.opens_at) at time zone ar.timezone_name)
        + make_interval(mins => v_buffer_before + v_travel_buffer)
      )
      and mod(
        extract(epoch from (
          p_new_starts_at - (
            ((v_local_date + ar.opens_at) at time zone ar.timezone_name)
            + make_interval(mins => v_buffer_before + v_travel_buffer)
          )
        ))::bigint,
        ar.slot_interval_minutes::bigint * 60
      ) = 0
  ) then
    raise exception using errcode = 'P0001', message = 'SLOT_UNAVAILABLE';
  end if;

  if exists (
    select 1
    from public.appointment_blackouts bo
    where bo.resource_id = v_resource_id
      and tstzrange(bo.starts_at, bo.ends_at, '[)')
        && tstzrange(v_reserved_from, v_reserved_to, '[)')
  ) or exists (
    select 1
    from public.appointment_booking_resources br
    where br.resource_id = v_resource_id
      and br.is_active = true
      and br.booking_id <> p_booking_id
      and tstzrange(br.reserved_from, br.reserved_to, '[)')
        && tstzrange(v_reserved_from, v_reserved_to, '[)')
  ) then
    raise exception using errcode = 'P0001', message = 'SLOT_UNAVAILABLE';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_resource_id::text || '|' || v_reserved_from::text, 2)
  );

  perform set_config('app.allow_appointment_reschedule', 'on', true);

  update public.appointment_bookings b
  set starts_at = p_new_starts_at,
      ends_at = v_ends_at
  where b.id = p_booking_id
  returning b.* into v_booking;

  update public.appointment_booking_resources br
  set reserved_from = v_reserved_from,
      reserved_to = v_reserved_to
  where br.booking_id = p_booking_id
    and br.resource_id = v_resource_id
    and br.is_active = true;

  return query select v_booking.reference, v_booking.starts_at, v_booking.ends_at;
exception
  when exclusion_violation then
    raise exception using errcode = 'P0001', message = 'SLOT_JUST_BECAME_UNAVAILABLE';
end;
$function$;

revoke all on function public.reschedule_appointment_booking(uuid, timestamptz)
  from public, anon;
grant execute on function public.reschedule_appointment_booking(uuid, timestamptz)
  to authenticated, service_role;

comment on function public.reschedule_appointment_booking(uuid, timestamptz) is
  'Staff-only transactional time change. Preserves original service snapshots, location and staff resource; RLS/JWT and trigger safeguards remain authoritative.';
