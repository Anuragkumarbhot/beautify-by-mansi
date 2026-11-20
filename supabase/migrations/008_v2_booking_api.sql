-- Beautify by Mansi V2: availability and atomic appointment reservation.
-- Apply after 007_v2_appointment_booking.sql.
-- This does not enable public bookings. The singleton settings switch remains false.

alter table public.appointment_bookings
  alter column reference set default (
    'BBM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 20))
  );

create or replace function public.get_appointment_availability(
  p_date date,
  p_location_type text,
  p_service_ids uuid[],
  p_postal_code text default null
)
returns table (
  starts_at timestamptz,
  ends_at timestamptz,
  available_resources integer
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_timezone text;
  v_minimum_notice integer;
  v_booking_horizon integer;
  v_public_enabled boolean;
  v_duration integer;
  v_buffer_before integer;
  v_buffer_after integer;
  v_service_count integer;
  v_area_id uuid;
  v_travel_buffer integer := 0;
  v_weekday smallint;
  v_date_end timestamptz;
begin
  if p_date is null
    or p_location_type is null
    or p_location_type not in ('studio', 'home')
    or p_service_ids is null
    or cardinality(p_service_ids) < 1
    or cardinality(p_service_ids) > 8
    or cardinality(p_service_ids) <> (
      select count(distinct ids.service_id)::integer
      from unnest(p_service_ids) as ids(service_id)
    ) then
    raise exception using errcode = '22023', message = 'INVALID_AVAILABILITY_REQUEST';
  end if;

  select s.timezone_name, s.minimum_notice_minutes, s.booking_horizon_days, s.public_booking_enabled
    into v_timezone, v_minimum_notice, v_booking_horizon, v_public_enabled
  from public.appointment_booking_settings s
  where s.id = 1;

  if not found or v_public_enabled is not true
    or v_minimum_notice is null
    or v_booking_horizon is null then
    return;
  end if;

  if v_timezone is null or not exists (
    select 1 from pg_timezone_names z where z.name = v_timezone
  ) then
    return;
  end if;

  select
    count(*)::integer,
    coalesce(sum(s.duration_minutes), 0)::integer,
    coalesce(sum(s.buffer_before_minutes), 0)::integer,
    coalesce(sum(s.buffer_after_minutes), 0)::integer
  into v_service_count, v_duration, v_buffer_before, v_buffer_after
  from public.appointment_services s
  where s.id = any(p_service_ids)
    and s.is_active = true
    and case
      when p_location_type = 'studio' then s.supports_studio
      when p_location_type = 'home' then s.supports_home
      else false
    end;

  if v_service_count <> cardinality(p_service_ids) or v_duration < 1 or v_duration > 1440 then
    return;
  end if;

  if p_location_type = 'home' then
    if p_postal_code is null or p_postal_code !~ '^[0-9]{6}$' then
      return;
    end if;

    select a.id, a.travel_buffer_minutes
      into v_area_id, v_travel_buffer
    from public.appointment_service_areas a
    where a.pincode = p_postal_code::char(6)
      and a.is_active = true;

    if not found then
      return;
    end if;
  elsif p_postal_code is not null then
    return;
  end if;

  v_weekday := extract(dow from p_date)::smallint;
  v_date_end := ((p_date + 1)::timestamp at time zone v_timezone);

  if v_booking_horizon is not null
    and p_date > ((now() at time zone v_timezone)::date + v_booking_horizon) then
    return;
  end if;

  if v_minimum_notice is not null
    and v_date_end <= now() + make_interval(mins => v_minimum_notice) then
    return;
  end if;

  return query
  with compatible_resources as (
    select r.id as resource_id
    from public.appointment_resources r
    join public.appointment_resource_services rs
      on rs.resource_id = r.id
     and rs.location_type = p_location_type
     and rs.service_id = any(p_service_ids)
    where r.resource_type = 'staff'
      and r.is_active = true
    group by r.id
    having count(distinct rs.service_id) = cardinality(p_service_ids)
  ),
  candidate_slots as (
    select
      cr.resource_id,
      gs.slot_start,
      gs.slot_start + make_interval(mins => v_duration) as slot_end,
      gs.slot_start - make_interval(mins => v_buffer_before + v_travel_buffer) as reserved_from,
      gs.slot_start + make_interval(mins => v_duration + v_buffer_after + v_travel_buffer) as reserved_to
    from compatible_resources cr
    join public.appointment_availability_rules ar
      on ar.resource_id = cr.resource_id
     and ar.location_type = p_location_type
     and ar.weekday = v_weekday
     and ar.is_active = true
     and (ar.effective_from is null or p_date >= ar.effective_from)
     and (ar.effective_until is null or p_date <= ar.effective_until)
    cross join lateral generate_series(
      ((p_date::timestamp + ar.opens_at) at time zone ar.timezone_name)
        + make_interval(mins => v_buffer_before + v_travel_buffer),
      ((p_date::timestamp + ar.closes_at) at time zone ar.timezone_name)
        - make_interval(mins => v_duration + v_buffer_after + v_travel_buffer),
      make_interval(mins => ar.slot_interval_minutes)
    ) as gs(slot_start)
    where ar.timezone_name = v_timezone
      and gs.slot_start >= now() + make_interval(mins => coalesce(v_minimum_notice, 0))
      and gs.slot_start < v_date_end
  ),
  eligible_slots as (
    select distinct c.resource_id, c.slot_start, c.slot_end
    from candidate_slots c
    where not exists (
      select 1
      from public.appointment_booking_resources br
      where br.resource_id = c.resource_id
        and br.is_active = true
        and tstzrange(br.reserved_from, br.reserved_to, '[)')
          && tstzrange(c.reserved_from, c.reserved_to, '[)')
    )
    and not exists (
      select 1
      from public.appointment_blackouts bo
      where bo.resource_id = c.resource_id
        and tstzrange(bo.starts_at, bo.ends_at, '[)')
          && tstzrange(c.reserved_from, c.reserved_to, '[)')
    )
  )
  select e.slot_start, e.slot_end, count(distinct e.resource_id)::integer
  from eligible_slots e
  group by e.slot_start, e.slot_end
  order by e.slot_start;
end;
$function$;

revoke all on function public.get_appointment_availability(date, text, uuid[], text)
  from public;
grant execute on function public.get_appointment_availability(date, text, uuid[], text)
  to anon, authenticated, service_role;


-- Schedule, blackout and staff-service configuration changes take an exclusive
-- lock on the owning resource. Reservation transactions hold a shared lock on
-- that resource while rechecking configuration, so admin edits serialize with
-- a reservation rather than slipping between validation and insert.
create or replace function public.lock_appointment_resource_configuration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_resource_id uuid;
begin
  if tg_op = 'DELETE' then
    v_resource_id := old.resource_id;
  else
    v_resource_id := new.resource_id;
  end if;

  perform 1
  from public.appointment_resources r
  where r.id = v_resource_id
  for update;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

revoke all on function public.lock_appointment_resource_configuration() from public, anon, authenticated;

drop trigger if exists appointment_resource_services_lock_resource on public.appointment_resource_services;
create trigger appointment_resource_services_lock_resource
before insert or update or delete on public.appointment_resource_services
for each row execute function public.lock_appointment_resource_configuration();

drop trigger if exists appointment_availability_rules_lock_resource on public.appointment_availability_rules;
create trigger appointment_availability_rules_lock_resource
before insert or update or delete on public.appointment_availability_rules
for each row execute function public.lock_appointment_resource_configuration();

drop trigger if exists appointment_blackouts_lock_resource on public.appointment_blackouts;
create trigger appointment_blackouts_lock_resource
before insert or update or delete on public.appointment_blackouts
for each row execute function public.lock_appointment_resource_configuration();

create or replace function public.create_appointment_booking(
  p_idempotency_key uuid,
  p_service_ids uuid[],
  p_starts_at timestamptz,
  p_location_type text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text default '',
  p_event_type text default 'Appointment',
  p_customer_notes text default '',
  p_address_line1 text default null,
  p_address_line2 text default null,
  p_locality text default null,
  p_postal_code text default null
)
returns table (
  booking_id uuid,
  reference text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text,
  was_existing_request boolean
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_existing public.appointment_bookings%rowtype;
  v_timezone text;
  v_minimum_notice integer;
  v_booking_horizon integer;
  v_public_enabled boolean;
  v_duration integer;
  v_buffer_before integer;
  v_buffer_after integer;
  v_service_count integer;
  v_area_id uuid;
  v_travel_buffer integer := 0;
  v_city text;
  v_state text;
  v_local_date date;
  v_ends_at timestamptz;
  v_reserved_from timestamptz;
  v_reserved_to timestamptz;
  v_resource_id uuid;
  v_selected_resource_id uuid;
  v_booking_id uuid;
  v_reference text;
  v_phone_digits text;
  v_user_id uuid := auth.uid();
begin
  if p_idempotency_key is null
    or p_starts_at is null
    or p_location_type is null
    or p_location_type not in ('studio', 'home')
    or p_service_ids is null
    or cardinality(p_service_ids) < 1
    or cardinality(p_service_ids) > 8
    or cardinality(p_service_ids) <> (
      select count(distinct ids.service_id)::integer
      from unnest(p_service_ids) as ids(service_id)
    )
    or p_customer_name is null
    or char_length(btrim(p_customer_name)) not between 1 and 80
    or p_customer_phone is null
    or char_length(btrim(p_customer_phone)) not between 10 and 20
    or char_length(p_customer_email) > 254
    or char_length(p_event_type) not between 1 and 100
    or char_length(p_customer_notes) > 1000 then
    raise exception using errcode = '22023', message = 'INVALID_BOOKING_REQUEST';
  end if;

  v_phone_digits := regexp_replace(p_customer_phone, '[^0-9]', '', 'g');
  if char_length(v_phone_digits) not between 10 and 15 then
    raise exception using errcode = '22023', message = 'INVALID_CUSTOMER_PHONE';
  end if;

  -- Serialise retries for the same client request before checking for an
  -- existing booking. A retry returns the same reference without duplicating.
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 1));

  select b.*
    into v_existing
  from public.appointment_bookings b
  where b.idempotency_key = p_idempotency_key;

  if found then
    return query
    select v_existing.id, v_existing.reference, v_existing.starts_at,
      v_existing.ends_at, v_existing.status, true;
    return;
  end if;

  select s.timezone_name, s.minimum_notice_minutes, s.booking_horizon_days, s.public_booking_enabled
    into v_timezone, v_minimum_notice, v_booking_horizon, v_public_enabled
  from public.appointment_booking_settings s
  where s.id = 1
  for share;

  if not found or v_public_enabled is not true then
    raise exception using errcode = 'P0001', message = 'BOOKING_DISABLED';
  end if;

  if v_minimum_notice is null or v_booking_horizon is null then
    raise exception using errcode = 'P0001', message = 'BOOKING_SETTINGS_INCOMPLETE';
  end if;

  if v_timezone is null or not exists (
    select 1 from pg_timezone_names z where z.name = v_timezone
  ) then
    raise exception using errcode = 'P0001', message = 'BOOKING_TIMEZONE_NOT_CONFIGURED';
  end if;

  perform 1
  from public.appointment_services s
  where s.id = any(p_service_ids)
  order by s.id
  for share;

  select
    count(*)::integer,
    coalesce(sum(s.duration_minutes), 0)::integer,
    coalesce(sum(s.buffer_before_minutes), 0)::integer,
    coalesce(sum(s.buffer_after_minutes), 0)::integer
  into v_service_count, v_duration, v_buffer_before, v_buffer_after
  from public.appointment_services s
  where s.id = any(p_service_ids)
    and s.is_active = true
    and case
      when p_location_type = 'studio' then s.supports_studio
      when p_location_type = 'home' then s.supports_home
      else false
    end;

  if v_service_count <> cardinality(p_service_ids) or v_duration < 1 or v_duration > 1440 then
    raise exception using errcode = 'P0001', message = 'SERVICE_NOT_BOOKABLE';
  end if;

  if p_location_type = 'home' then
    if p_postal_code is null or p_postal_code !~ '^[0-9]{6}$'
      or p_address_line1 is null
      or char_length(btrim(p_address_line1)) not between 1 and 200 then
      raise exception using errcode = '22023', message = 'HOME_ADDRESS_REQUIRED';
    end if;

    select a.id, a.travel_buffer_minutes, a.city, a.state
      into v_area_id, v_travel_buffer, v_city, v_state
    from public.appointment_service_areas a
    where a.pincode = p_postal_code::char(6)
      and a.is_active = true
    for share;

    if not found then
      raise exception using errcode = 'P0001', message = 'HOME_SERVICE_AREA_UNAVAILABLE';
    end if;
  elsif p_address_line1 is not null
     or nullif(btrim(coalesce(p_address_line2, '')), '') is not null
     or nullif(btrim(coalesce(p_locality, '')), '') is not null
     or p_postal_code is not null then
    raise exception using errcode = '22023', message = 'STUDIO_BOOKING_MUST_NOT_INCLUDE_HOME_ADDRESS';
  end if;

  v_local_date := (p_starts_at at time zone v_timezone)::date;
  v_ends_at := p_starts_at + make_interval(mins => v_duration);
  v_reserved_from := p_starts_at - make_interval(mins => v_buffer_before + v_travel_buffer);
  v_reserved_to := v_ends_at + make_interval(mins => v_buffer_after + v_travel_buffer);

  if p_starts_at <= now()
    or (v_minimum_notice is not null
      and p_starts_at < now() + make_interval(mins => v_minimum_notice))
    or (v_booking_horizon is not null
      and v_local_date > ((now() at time zone v_timezone)::date + v_booking_horizon)) then
    raise exception using errcode = 'P0001', message = 'BOOKING_OUTSIDE_ALLOWED_WINDOW';
  end if;

  -- Verify the exact requested local slot against the public availability
  -- function before attempting a final resource assignment.
  if not exists (
    select 1
    from public.get_appointment_availability(
      v_local_date,
      p_location_type,
      p_service_ids,
      p_postal_code
    ) a
    where a.starts_at = p_starts_at
      and a.ends_at = v_ends_at
  ) then
    raise exception using errcode = 'P0001', message = 'SLOT_UNAVAILABLE';
  end if;

  -- Candidate resources are considered in stable order. Lock each resource,
  -- then re-check its schedule and reservations after the lock is acquired.
  for v_resource_id in
    select r.id
    from public.appointment_resources r
    join public.appointment_resource_services rs
      on rs.resource_id = r.id
     and rs.location_type = p_location_type
     and rs.service_id = any(p_service_ids)
    where r.resource_type = 'staff'
      and r.is_active = true
    group by r.id
    having count(distinct rs.service_id) = cardinality(p_service_ids)
    order by r.id
  loop
    perform pg_advisory_xact_lock(
      hashtextextended(v_resource_id::text || '|' || v_reserved_from::text, 2)
    );

    perform 1
    from public.appointment_resources r
    where r.id = v_resource_id
      and r.resource_type = 'staff'
      and r.is_active = true
    for share;
    if not found then
      continue;
    end if;

    perform 1
    from public.appointment_resource_services rs
    where rs.resource_id = v_resource_id
      and rs.location_type = p_location_type
      and rs.service_id = any(p_service_ids)
    order by rs.service_id
    for share;

    if (select count(distinct rs.service_id)::integer
        from public.appointment_resource_services rs
        where rs.resource_id = v_resource_id
          and rs.location_type = p_location_type
          and rs.service_id = any(p_service_ids)) <> cardinality(p_service_ids) then
      continue;
    end if;

    perform 1
    from public.appointment_availability_rules ar
    where ar.resource_id = v_resource_id
      and ar.location_type = p_location_type
      and ar.weekday = extract(dow from v_local_date)::smallint
      and ar.is_active = true
      and ar.timezone_name = v_timezone
      and (ar.effective_from is null or v_local_date >= ar.effective_from)
      and (ar.effective_until is null or v_local_date <= ar.effective_until)
      and v_reserved_from >= ((v_local_date::timestamp + ar.opens_at) at time zone ar.timezone_name)
      and v_reserved_to <= ((v_local_date::timestamp + ar.closes_at) at time zone ar.timezone_name)
    for share;
    if not found then
      continue;
    end if;

    if not exists (
      select 1
      from public.appointment_blackouts bo
      where bo.resource_id = v_resource_id
        and tstzrange(bo.starts_at, bo.ends_at, '[)')
          && tstzrange(v_reserved_from, v_reserved_to, '[)')
    )
    and not exists (
      select 1
      from public.appointment_booking_resources br
      where br.resource_id = v_resource_id
        and br.is_active = true
        and tstzrange(br.reserved_from, br.reserved_to, '[)')
          && tstzrange(v_reserved_from, v_reserved_to, '[)')
    ) then
      v_selected_resource_id := v_resource_id;
      exit;
    end if;
  end loop;

  if v_selected_resource_id is null then
    raise exception using errcode = 'P0001', message = 'SLOT_JUST_BECAME_UNAVAILABLE';
  end if;

  insert into public.appointment_bookings (
    idempotency_key,
    customer_user_id,
    customer_name,
    customer_phone,
    customer_email,
    event_type,
    location_type,
    service_area_id,
    address_line1,
    address_line2,
    locality,
    postal_code,
    address_city,
    address_state,
    starts_at,
    ends_at,
    customer_notes,
    status,
    payment_status
  ) values (
    p_idempotency_key,
    v_user_id,
    btrim(p_customer_name),
    btrim(p_customer_phone),
    coalesce(btrim(p_customer_email), ''),
    btrim(p_event_type),
    p_location_type,
    v_area_id,
    case when p_location_type = 'home' then btrim(p_address_line1) else null end,
    case when p_location_type = 'home' then nullif(btrim(coalesce(p_address_line2, '')), '') else null end,
    case when p_location_type = 'home' then nullif(btrim(coalesce(p_locality, '')), '') else null end,
    case when p_location_type = 'home' then p_postal_code::char(6) else null end,
    v_city,
    v_state,
    p_starts_at,
    v_ends_at,
    coalesce(btrim(p_customer_notes), ''),
    'confirmed',
    'not_required'
  )
  returning id, appointment_bookings.reference
  into v_booking_id, v_reference;

  insert into public.appointment_booking_items (
    booking_id,
    service_id,
    service_name_snapshot,
    duration_snapshot_minutes,
    buffer_before_snapshot_minutes,
    buffer_after_snapshot_minutes,
    unit_price_snapshot_amount
  )
  select
    v_booking_id,
    s.id,
    s.name,
    s.duration_minutes,
    s.buffer_before_minutes,
    s.buffer_after_minutes,
    s.price_amount
  from public.appointment_services s
  where s.id = any(p_service_ids)
  order by s.id;

  insert into public.appointment_booking_resources (
    booking_id, resource_id, reserved_from, reserved_to, is_active
  ) values (
    v_booking_id, v_selected_resource_id, v_reserved_from, v_reserved_to, true
  );

  return query
  select v_booking_id, v_reference, p_starts_at, v_ends_at, 'confirmed'::text, false;
exception
  when exclusion_violation then
    raise exception using errcode = 'P0001', message = 'SLOT_JUST_BECAME_UNAVAILABLE';
end;
$function$;

revoke all on function public.create_appointment_booking(
  uuid, uuid[], timestamptz, text, text, text, text, text, text, text, text, text, text
) from public;
grant execute on function public.create_appointment_booking(
  uuid, uuid[], timestamptz, text, text, text, text, text, text, text, text, text, text
) to anon, authenticated, service_role;

comment on function public.get_appointment_availability(date, text, uuid[], text) is
  'Returns only available start/end instants; resource identities and customer data are never exposed.';
comment on function public.create_appointment_booking(
  uuid, uuid[], timestamptz, text, text, text, text, text, text, text, text, text, text
) is
  'Atomically creates a confirmed appointment after server-side service, area, schedule and resource checks. No payment is collected.';
