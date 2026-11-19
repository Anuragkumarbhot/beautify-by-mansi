-- Beautify by Mansi V2: automatic appointment booking foundation.
-- Apply after migrations 001-006.
-- This migration is separate from the V1 public.bookings enquiry workflow.
-- No working hours, resources, service prices, service durations or home-service
-- pincodes are seeded. Public booking remains disabled until studio configuration
-- and the availability/reservation APIs are implemented and tested.

create extension if not exists btree_gist;

-- Staff membership is managed by an owner through trusted database administration.
-- There is deliberately no browser-side self-enrolment policy.
create table if not exists public.appointment_staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_appointment_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.appointment_staff_members m
    where m.user_id = (select auth.uid())
      and m.is_active = true
  );
$function$;

revoke all on function public.is_appointment_staff() from public, anon;
grant execute on function public.is_appointment_staff() to anon, authenticated, service_role;

-- A singleton operational switch prevents accidental public booking before
-- resources, hours, durations, service areas and policies are configured.
create table if not exists public.appointment_booking_settings (
  id smallint primary key default 1 check (id = 1),
  timezone_name text not null default 'Asia/Kolkata',
  minimum_notice_minutes integer check (minimum_notice_minutes is null or minimum_notice_minutes >= 0),
  booking_horizon_days integer check (booking_horizon_days is null or booking_horizon_days > 0),
  public_booking_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.appointment_booking_settings (id, timezone_name, public_booking_enabled)
values (1, 'Asia/Kolkata', false)
on conflict (id) do nothing;

create table if not exists public.appointment_services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  category text not null check (char_length(btrim(category)) between 1 and 60),
  description text not null default '' check (char_length(description) <= 1200),
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  buffer_before_minutes integer not null check (buffer_before_minutes between 0 and 1440),
  buffer_after_minutes integer not null check (buffer_after_minutes between 0 and 1440),
  price_amount integer check (price_amount is null or price_amount >= 0),
  currency text not null default 'INR' check (currency = 'INR'),
  supports_studio boolean not null,
  supports_home boolean not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_services_slug_format
    check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$'),
  constraint appointment_services_location_check
    check (supports_studio = true or supports_home = true)
);

create index if not exists appointment_services_active_category_idx
  on public.appointment_services (category, name)
  where is_active = true;

create table if not exists public.appointment_resources (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null check (resource_type in ('staff', 'studio_room')),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointment_resources_active_type_idx
  on public.appointment_resources (resource_type, display_name)
  where is_active = true;

-- A staff resource must be explicitly assigned to each service and location
-- it can perform. Studio-room resources are reserved separately where needed.
create table if not exists public.appointment_resource_services (
  resource_id uuid not null references public.appointment_resources(id) on delete cascade,
  service_id uuid not null references public.appointment_services(id) on delete restrict,
  location_type text not null check (location_type in ('studio', 'home')),
  created_at timestamptz not null default now(),
  primary key (resource_id, service_id, location_type)
);

create index if not exists appointment_resource_services_service_idx
  on public.appointment_resource_services (service_id, location_type);

create table if not exists public.appointment_service_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  pincode char(6) not null unique check (pincode ~ '^[0-9]{6}$'),
  city text not null check (char_length(btrim(city)) between 1 and 100),
  state text not null check (char_length(btrim(state)) between 1 and 100),
  travel_buffer_minutes integer not null check (travel_buffer_minutes between 0 and 1440),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_service_areas_id_pincode_unique unique (id, pincode)
);

create index if not exists appointment_service_areas_active_pincode_idx
  on public.appointment_service_areas (pincode)
  where is_active = true;

create table if not exists public.appointment_availability_rules (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.appointment_resources(id) on delete cascade,
  location_type text not null check (location_type in ('studio', 'home')),
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  slot_interval_minutes integer not null check (slot_interval_minutes between 5 and 240),
  timezone_name text not null default 'Asia/Kolkata',
  effective_from date,
  effective_until date,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_availability_rules_window_check check (opens_at < closes_at),
  constraint appointment_availability_rules_effective_check
    check (effective_from is null or effective_until is null or effective_until >= effective_from)
);

create index if not exists appointment_availability_rules_lookup_idx
  on public.appointment_availability_rules (resource_id, location_type, weekday)
  where is_active = true;

create table if not exists public.appointment_blackouts (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.appointment_resources(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '' check (char_length(reason) <= 240),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint appointment_blackouts_window_check check (starts_at < ends_at)
);

create index if not exists appointment_blackouts_resource_window_idx
  on public.appointment_blackouts using gist
  (resource_id, tstzrange(starts_at, ends_at, '[)'));

create table if not exists public.appointment_bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'BBM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),
  idempotency_key uuid not null unique,
  customer_user_id uuid references auth.users(id) on delete set null,
  customer_name text not null check (char_length(btrim(customer_name)) between 1 and 80),
  customer_phone text not null check (char_length(btrim(customer_phone)) between 10 and 20),
  customer_email text not null default '' check (char_length(customer_email) <= 254),
  event_type text not null check (char_length(btrim(event_type)) between 1 and 100),
  location_type text not null check (location_type in ('studio', 'home')),
  service_area_id uuid,
  address_line1 text,
  address_line2 text,
  locality text,
  postal_code char(6),
  address_city text,
  address_state text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  customer_notes text not null default '' check (char_length(customer_notes) <= 1000),
  status text not null default 'confirmed'
    check (status in ('confirmed', 'cancelled', 'completed', 'no_show')),
  payment_status text not null default 'not_required'
    check (payment_status in ('not_required', 'pending', 'paid', 'failed', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  constraint appointment_bookings_window_check check (starts_at < ends_at),
  constraint appointment_bookings_home_address_check check (
    (
      location_type = 'home'
      and service_area_id is not null
      and address_line1 is not null
      and char_length(btrim(address_line1)) between 1 and 200
      and postal_code is not null
      and postal_code ~ '^[0-9]{6}$'
      and address_city is not null
      and char_length(btrim(address_city)) between 1 and 100
      and address_state is not null
      and char_length(btrim(address_state)) between 1 and 100
    )
    or
    (
      location_type = 'studio'
      and service_area_id is null
      and address_line1 is null
      and address_line2 is null
      and locality is null
      and postal_code is null
      and address_city is null
      and address_state is null
    )
  ),
  constraint appointment_bookings_service_area_pincode_fk
    foreign key (service_area_id, postal_code)
    references public.appointment_service_areas (id, pincode)
    on delete restrict
);

create index if not exists appointment_bookings_customer_start_idx
  on public.appointment_bookings (customer_user_id, starts_at desc)
  where customer_user_id is not null;

create index if not exists appointment_bookings_start_status_idx
  on public.appointment_bookings (starts_at, status);

create table if not exists public.appointment_booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.appointment_bookings(id) on delete cascade,
  service_id uuid not null references public.appointment_services(id) on delete restrict,
  service_name_snapshot text not null check (char_length(btrim(service_name_snapshot)) between 1 and 120),
  duration_snapshot_minutes integer not null check (duration_snapshot_minutes between 1 and 1440),
  buffer_before_snapshot_minutes integer not null check (buffer_before_snapshot_minutes between 0 and 1440),
  buffer_after_snapshot_minutes integer not null check (buffer_after_snapshot_minutes between 0 and 1440),
  unit_price_snapshot_amount integer check (
    unit_price_snapshot_amount is null or unit_price_snapshot_amount >= 0
  ),
  currency text not null default 'INR' check (currency = 'INR'),
  created_at timestamptz not null default now()
);

create index if not exists appointment_booking_items_booking_idx
  on public.appointment_booking_items (booking_id);

-- Every reserved staff/room resource receives its own interval row. This makes
-- one booking capable of locking multiple resources in one transaction.
-- btree_gist supplies GiST equality support for resource_id.
create table if not exists public.appointment_booking_resources (
  booking_id uuid not null references public.appointment_bookings(id) on delete cascade,
  resource_id uuid not null references public.appointment_resources(id) on delete restrict,
  reserved_from timestamptz not null,
  reserved_to timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (booking_id, resource_id),
  constraint appointment_booking_resources_window_check
    check (reserved_from < reserved_to),
  constraint appointment_booking_resources_no_overlap
    exclude using gist (
      resource_id with =,
      tstzrange(reserved_from, reserved_to, '[)') with &&
    )
    where (is_active)
);

create index if not exists appointment_booking_resources_booking_idx
  on public.appointment_booking_resources (booking_id);

create table if not exists public.appointment_audit_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.appointment_bookings(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in (
    'booking_created',
    'status_changed',
    'schedule_changed'
  )),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists appointment_audit_events_booking_created_idx
  on public.appointment_audit_events (booking_id, created_at desc);

-- Timestamp maintenance.
create or replace function public.set_appointment_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function public.set_appointment_updated_at() from public, anon, authenticated;

drop trigger if exists appointment_staff_members_set_updated_at on public.appointment_staff_members;
create trigger appointment_staff_members_set_updated_at
before update on public.appointment_staff_members
for each row execute function public.set_appointment_updated_at();

drop trigger if exists appointment_booking_settings_set_updated_at on public.appointment_booking_settings;
create trigger appointment_booking_settings_set_updated_at
before update on public.appointment_booking_settings
for each row execute function public.set_appointment_updated_at();

drop trigger if exists appointment_services_set_updated_at on public.appointment_services;
create trigger appointment_services_set_updated_at
before update on public.appointment_services
for each row execute function public.set_appointment_updated_at();

drop trigger if exists appointment_resources_set_updated_at on public.appointment_resources;
create trigger appointment_resources_set_updated_at
before update on public.appointment_resources
for each row execute function public.set_appointment_updated_at();

drop trigger if exists appointment_service_areas_set_updated_at on public.appointment_service_areas;
create trigger appointment_service_areas_set_updated_at
before update on public.appointment_service_areas
for each row execute function public.set_appointment_updated_at();

drop trigger if exists appointment_availability_rules_set_updated_at on public.appointment_availability_rules;
create trigger appointment_availability_rules_set_updated_at
before update on public.appointment_availability_rules
for each row execute function public.set_appointment_updated_at();

drop trigger if exists appointment_bookings_set_updated_at on public.appointment_bookings;
create trigger appointment_bookings_set_updated_at
before update on public.appointment_bookings
for each row execute function public.set_appointment_updated_at();

-- A booking is created as confirmed by the trusted booking transaction. Terminal
-- states cannot be reopened; rescheduling creates a new booking and audit trail.
create or replace function public.guard_appointment_booking_status()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if old.status in ('cancelled', 'completed', 'no_show')
    and new.status <> old.status then
    raise exception 'A terminal appointment cannot be reopened. Create a new booking to reschedule.';
  end if;

  if old.starts_at is distinct from new.starts_at
    or old.ends_at is distinct from new.ends_at
    or old.location_type is distinct from new.location_type
    or old.service_area_id is distinct from new.service_area_id
    or old.address_line1 is distinct from new.address_line1
    or old.address_line2 is distinct from new.address_line2
    or old.locality is distinct from new.locality
    or old.postal_code is distinct from new.postal_code
    or old.address_city is distinct from new.address_city
    or old.address_state is distinct from new.address_state then
    raise exception 'Appointment schedule changes must use the transactional reschedule workflow.';
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  end if;

  return new;
end;
$function$;

revoke all on function public.guard_appointment_booking_status() from public, anon, authenticated;

drop trigger if exists appointment_bookings_guard_status on public.appointment_bookings;
create trigger appointment_bookings_guard_status
before update of status on public.appointment_bookings
for each row execute function public.guard_appointment_booking_status();

-- Reservation insertion locks the parent booking while checking its state. The
-- exclusion constraint below then resolves concurrent attempts for one resource.
create or replace function public.validate_appointment_resource_reservation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_booking_status text;
  v_resource_active boolean;
begin
  if new.is_active = false then
    return new;
  end if;

  select b.status
    into v_booking_status
  from public.appointment_bookings b
  where b.id = new.booking_id
  for update;

  if not found or v_booking_status <> 'confirmed' then
    raise exception 'Only a confirmed appointment can reserve a resource.';
  end if;

  select r.is_active
    into v_resource_active
  from public.appointment_resources r
  where r.id = new.resource_id
  for share;

  if not found or v_resource_active is not true then
    raise exception 'The selected appointment resource is not active.';
  end if;

  return new;
end;
$function$;

revoke all on function public.validate_appointment_resource_reservation() from public, anon, authenticated;

drop trigger if exists appointment_booking_resources_validate on public.appointment_booking_resources;
create trigger appointment_booking_resources_validate
before insert or update on public.appointment_booking_resources
for each row execute function public.validate_appointment_resource_reservation();

-- Cancelling an appointment releases all its resource intervals in the same
-- transaction as the status change.
create or replace function public.release_cancelled_appointment_resources()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.appointment_booking_resources
    set is_active = false
    where booking_id = new.id
      and is_active = true;
  end if;
  return new;
end;
$function$;

revoke all on function public.release_cancelled_appointment_resources() from public, anon, authenticated;

drop trigger if exists appointment_bookings_release_resources on public.appointment_bookings;
create trigger appointment_bookings_release_resources
after update of status on public.appointment_bookings
for each row execute function public.release_cancelled_appointment_resources();

-- Audit creation and operational changes without copying customer PII into logs.
create or replace function public.audit_appointment_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    insert into public.appointment_audit_events (
      booking_id, actor_user_id, action, metadata
    ) values (
      new.id,
      (select auth.uid()),
      'booking_created',
      jsonb_build_object(
        'status', new.status,
        'location_type', new.location_type,
        'starts_at', new.starts_at,
        'ends_at', new.ends_at
      )
    );
    return new;
  end if;

  if old.status is distinct from new.status then
    insert into public.appointment_audit_events (
      booking_id, actor_user_id, action, metadata
    ) values (
      new.id,
      (select auth.uid()),
      'status_changed',
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;

  if old.starts_at is distinct from new.starts_at
     or old.ends_at is distinct from new.ends_at
     or old.location_type is distinct from new.location_type then
    insert into public.appointment_audit_events (
      booking_id, actor_user_id, action, metadata
    ) values (
      new.id,
      (select auth.uid()),
      'schedule_changed',
      jsonb_build_object(
        'old_starts_at', old.starts_at,
        'new_starts_at', new.starts_at,
        'old_ends_at', old.ends_at,
        'new_ends_at', new.ends_at,
        'old_location_type', old.location_type,
        'new_location_type', new.location_type
      )
    );
  end if;

  return new;
end;
$function$;

revoke all on function public.audit_appointment_booking() from public, anon, authenticated;

drop trigger if exists appointment_bookings_audit on public.appointment_bookings;
create trigger appointment_bookings_audit
after insert or update on public.appointment_bookings
for each row execute function public.audit_appointment_booking();

-- RLS is enabled on every V2 appointment table.
alter table public.appointment_staff_members enable row level security;
alter table public.appointment_booking_settings enable row level security;
alter table public.appointment_services enable row level security;
alter table public.appointment_resources enable row level security;
alter table public.appointment_resource_services enable row level security;
alter table public.appointment_service_areas enable row level security;
alter table public.appointment_availability_rules enable row level security;
alter table public.appointment_blackouts enable row level security;
alter table public.appointment_bookings enable row level security;
alter table public.appointment_booking_items enable row level security;
alter table public.appointment_booking_resources enable row level security;
alter table public.appointment_audit_events enable row level security;

-- Staff membership: a member can read their own membership; active staff can
-- read the roster. Membership writes stay in trusted administrative workflows.
drop policy if exists "Appointment members read own membership" on public.appointment_staff_members;
create policy "Appointment members read own membership"
on public.appointment_staff_members for select to authenticated
using (user_id = (select auth.uid()) or public.is_appointment_staff());

drop policy if exists "Appointment staff manage settings" on public.appointment_booking_settings;
create policy "Appointment staff manage settings"
on public.appointment_booking_settings for all to authenticated
using (public.is_appointment_staff())
with check (public.is_appointment_staff());

drop policy if exists "Public read active appointment services" on public.appointment_services;
create policy "Public read active appointment services"
on public.appointment_services for select to anon, authenticated
using (is_active = true or public.is_appointment_staff());

drop policy if exists "Appointment staff manage services" on public.appointment_services;
create policy "Appointment staff manage services"
on public.appointment_services for all to authenticated
using (public.is_appointment_staff())
with check (public.is_appointment_staff());

drop policy if exists "Appointment staff manage resources" on public.appointment_resources;
create policy "Appointment staff manage resources"
on public.appointment_resources for all to authenticated
using (public.is_appointment_staff())
with check (public.is_appointment_staff());

drop policy if exists "Appointment staff manage resource services" on public.appointment_resource_services;
create policy "Appointment staff manage resource services"
on public.appointment_resource_services for all to authenticated
using (public.is_appointment_staff())
with check (public.is_appointment_staff());

drop policy if exists "Public read active appointment areas" on public.appointment_service_areas;
create policy "Public read active appointment areas"
on public.appointment_service_areas for select to anon, authenticated
using (is_active = true or public.is_appointment_staff());

drop policy if exists "Appointment staff manage service areas" on public.appointment_service_areas;
create policy "Appointment staff manage service areas"
on public.appointment_service_areas for all to authenticated
using (public.is_appointment_staff())
with check (public.is_appointment_staff());

drop policy if exists "Appointment staff manage availability rules" on public.appointment_availability_rules;
create policy "Appointment staff manage availability rules"
on public.appointment_availability_rules for all to authenticated
using (public.is_appointment_staff())
with check (public.is_appointment_staff());

drop policy if exists "Appointment staff manage blackouts" on public.appointment_blackouts;
create policy "Appointment staff manage blackouts"
on public.appointment_blackouts for all to authenticated
using (public.is_appointment_staff())
with check (public.is_appointment_staff());

drop policy if exists "Customers and staff read permitted appointments" on public.appointment_bookings;
create policy "Customers and staff read permitted appointments"
on public.appointment_bookings for select to authenticated
using (customer_user_id = (select auth.uid()) or public.is_appointment_staff());

drop policy if exists "Appointment staff update appointments" on public.appointment_bookings;
create policy "Appointment staff update appointments"
on public.appointment_bookings for update to authenticated
using (public.is_appointment_staff())
with check (public.is_appointment_staff());

drop policy if exists "Customers and staff read permitted appointment items" on public.appointment_booking_items;
create policy "Customers and staff read permitted appointment items"
on public.appointment_booking_items for select to authenticated
using (
  exists (
    select 1
    from public.appointment_bookings b
    where b.id = appointment_booking_items.booking_id
      and (b.customer_user_id = (select auth.uid()) or public.is_appointment_staff())
  )
);

drop policy if exists "Appointment staff read resource reservations" on public.appointment_booking_resources;
create policy "Appointment staff read resource reservations"
on public.appointment_booking_resources for select to authenticated
using (public.is_appointment_staff());

drop policy if exists "Appointment staff read appointment audit" on public.appointment_audit_events;
create policy "Appointment staff read appointment audit"
on public.appointment_audit_events for select to authenticated
using (public.is_appointment_staff());

-- No anonymous direct writes to appointment or schedule tables. Booking creation
-- is added later through a single validated transactional server/RPC boundary.
grant select on public.appointment_services to anon, authenticated;
grant insert, update, delete on public.appointment_services to authenticated;

grant select on public.appointment_service_areas to anon, authenticated;
grant insert, update, delete on public.appointment_service_areas to authenticated;

grant select, insert, update, delete on public.appointment_resources to authenticated;
grant select, insert, update, delete on public.appointment_resource_services to authenticated;
grant select, insert, update, delete on public.appointment_availability_rules to authenticated;
grant select, insert, update, delete on public.appointment_blackouts to authenticated;

grant select on public.appointment_staff_members to authenticated;
grant select, update on public.appointment_booking_settings to authenticated;
grant select, update on public.appointment_bookings to authenticated;
grant select on public.appointment_booking_items to authenticated;
grant select on public.appointment_booking_resources to authenticated;
grant select on public.appointment_audit_events to authenticated;

-- Trusted backend service role is allowed to call future server-side booking
-- workflows; RLS still protects browser roles.
grant all on public.appointment_staff_members to service_role;
grant all on public.appointment_booking_settings to service_role;
grant all on public.appointment_services to service_role;
grant all on public.appointment_resources to service_role;
grant all on public.appointment_resource_services to service_role;
grant all on public.appointment_service_areas to service_role;
grant all on public.appointment_availability_rules to service_role;
grant all on public.appointment_blackouts to service_role;
grant all on public.appointment_bookings to service_role;
grant all on public.appointment_booking_items to service_role;
grant all on public.appointment_booking_resources to service_role;
grant all on public.appointment_audit_events to service_role;

comment on table public.appointment_bookings is
  'V2 automatic appointments. Kept separate from V1 public.bookings enquiries.';
comment on table public.appointment_booking_resources is
  'Per-resource reserved intervals. Active intervals cannot overlap for the same resource.';
comment on table public.appointment_booking_settings is
  'Singleton V2 booking switch and operational booking limits. Public booking defaults to disabled.';
