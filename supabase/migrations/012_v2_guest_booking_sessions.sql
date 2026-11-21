-- V2 guest booking management sessions. Apply after migrations 007-011.
-- Only a SHA-256 digest of a random HttpOnly cookie is stored.

create table if not exists public.appointment_guest_sessions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.appointment_bookings(id) on delete cascade,
  session_hash text not null unique check (session_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists appointment_guest_sessions_booking_idx
  on public.appointment_guest_sessions (booking_id, expires_at desc);
create index if not exists appointment_guest_sessions_expiry_idx
  on public.appointment_guest_sessions (expires_at) where revoked_at is null;
alter table public.appointment_guest_sessions enable row level security;
revoke all on public.appointment_guest_sessions from public, anon, authenticated, service_role;

create or replace function public.create_appointment_guest_session(
  p_booking_id uuid, p_session_hash text, p_expires_at timestamptz
)
returns boolean
language plpgsql security definer set search_path = ''
as $function$
begin
  if p_booking_id is null or p_session_hash is null
    or p_session_hash !~ '^[0-9a-f]{64}$'
    or p_expires_at is null or p_expires_at <= now()
    or p_expires_at > now() + interval '400 days' then
    raise exception using errcode = '22023', message = 'INVALID_GUEST_SESSION_REQUEST';
  end if;
  if not exists (select 1 from public.appointment_bookings b where b.id = p_booking_id) then
    raise exception using errcode = 'P0001', message = 'BOOKING_NOT_FOUND';
  end if;
  insert into public.appointment_guest_sessions (booking_id, session_hash, expires_at)
  values (p_booking_id, p_session_hash, p_expires_at);
  delete from public.appointment_guest_sessions
  where expires_at < now() - interval '30 days'
     or revoked_at < now() - interval '30 days';
  return true;
end;
$function$;

create or replace function public.get_appointment_by_guest_session(p_session_hash text)
returns jsonb
language plpgsql security definer set search_path = ''
as $function$
declare
  v_booking_id uuid;
  v_result jsonb;
begin
  if p_session_hash is null or p_session_hash !~ '^[0-9a-f]{64}$' then return null; end if;
  update public.appointment_guest_sessions s
  set last_used_at = now()
  where s.session_hash = p_session_hash and s.revoked_at is null and s.expires_at > now()
  returning s.booking_id into v_booking_id;
  if not found then return null; end if;

  select jsonb_build_object(
    'reference', b.reference,
    'customerName', b.customer_name,
    'customerPhone', b.customer_phone,
    'customerEmail', b.customer_email,
    'eventType', b.event_type,
    'locationType', b.location_type,
    'addressLine1', b.address_line1,
    'addressLine2', b.address_line2,
    'locality', b.locality,
    'postalCode', b.postal_code,
    'addressCity', b.address_city,
    'addressState', b.address_state,
    'startsAt', b.starts_at,
    'endsAt', b.ends_at,
    'status', b.status,
    'paymentStatus', b.payment_status,
    'customerNotes', b.customer_notes,
    'cancelledAt', b.cancelled_at,
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', i.service_name_snapshot,
        'durationMinutes', i.duration_snapshot_minutes,
        'priceAmount', i.unit_price_snapshot_amount,
        'currency', i.currency
      ) order by i.created_at)
      from public.appointment_booking_items i where i.booking_id = b.id
    ), '[]'::jsonb)
  ) into v_result
  from public.appointment_bookings b where b.id = v_booking_id;
  return v_result;
end;
$function$;

create or replace function public.cancel_appointment_by_guest_session(p_session_hash text)
returns jsonb
language plpgsql security definer set search_path = ''
as $function$
declare
  v_booking_id uuid;
  v_booking public.appointment_bookings%rowtype;
  v_cancelled boolean := false;
begin
  if p_session_hash is null or p_session_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '42501', message = 'GUEST_SESSION_NOT_FOUND';
  end if;
  select s.booking_id into v_booking_id
  from public.appointment_guest_sessions s
  where s.session_hash = p_session_hash and s.revoked_at is null and s.expires_at > now()
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'GUEST_SESSION_NOT_FOUND';
  end if;

  select b.* into v_booking
  from public.appointment_bookings b where b.id = v_booking_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'BOOKING_NOT_FOUND'; end if;

  if v_booking.status = 'confirmed' then
    update public.appointment_bookings b set status = 'cancelled'
    where b.id = v_booking_id returning b.* into v_booking;
    v_cancelled := true;
  end if;

  update public.appointment_guest_sessions set last_used_at = now()
  where session_hash = p_session_hash;

  return jsonb_build_object(
    'reference', v_booking.reference,
    'status', v_booking.status,
    'cancelled', v_cancelled,
    'cancelledAt', v_booking.cancelled_at
  );
end;
$function$;

revoke all on function public.create_appointment_guest_session(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_appointment_by_guest_session(text) from public, anon, authenticated;
revoke all on function public.cancel_appointment_by_guest_session(text) from public, anon, authenticated;
grant execute on function public.create_appointment_guest_session(uuid, text, timestamptz) to service_role;
grant execute on function public.get_appointment_by_guest_session(text) to service_role;
grant execute on function public.cancel_appointment_by_guest_session(text) to service_role;

comment on table public.appointment_guest_sessions is
  'Private guest sessions; only SHA-256 digests of random HttpOnly cookie values are stored.';
