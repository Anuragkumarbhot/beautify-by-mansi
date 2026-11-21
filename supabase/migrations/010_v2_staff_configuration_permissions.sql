-- V2 Studio Configuration Console.
-- Apply after migrations 007-009.
-- Owners/managers may configure booking data. Active staff can read configuration
-- for operations, but cannot alter services, resources, schedules or coverage.

create or replace function public.is_appointment_manager()
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
      and m.role in ('owner', 'manager')
  );
$function$;

revoke all on function public.is_appointment_manager() from public, anon;
grant execute on function public.is_appointment_manager() to authenticated;

-- Booking settings: all active staff may read, only owner/manager may write.
drop policy if exists "Appointment staff manage settings" on public.appointment_booking_settings;
create policy "Appointment staff read settings"
on public.appointment_booking_settings for select to authenticated
using (public.is_appointment_staff());
create policy "Appointment managers manage settings"
on public.appointment_booking_settings for all to authenticated
using (public.is_appointment_manager())
with check (public.is_appointment_manager());

-- Service catalogue.
drop policy if exists "Appointment staff manage services" on public.appointment_services;
create policy "Appointment staff read all services"
on public.appointment_services for select to authenticated
using (public.is_appointment_staff());
create policy "Appointment managers manage services"
on public.appointment_services for all to authenticated
using (public.is_appointment_manager())
with check (public.is_appointment_manager());

-- Resources and service assignments.
drop policy if exists "Appointment staff manage resources" on public.appointment_resources;
create policy "Appointment staff read resources"
on public.appointment_resources for select to authenticated
using (public.is_appointment_staff());
create policy "Appointment managers manage resources"
on public.appointment_resources for all to authenticated
using (public.is_appointment_manager())
with check (public.is_appointment_manager());

drop policy if exists "Appointment staff manage resource services" on public.appointment_resource_services;
create policy "Appointment staff read resource service mappings"
on public.appointment_resource_services for select to authenticated
using (public.is_appointment_staff());
create policy "Appointment managers manage resource service mappings"
on public.appointment_resource_services for all to authenticated
using (public.is_appointment_manager())
with check (public.is_appointment_manager());

-- Home-service coverage.
drop policy if exists "Appointment staff manage service areas" on public.appointment_service_areas;
create policy "Appointment staff read all service areas"
on public.appointment_service_areas for select to authenticated
using (public.is_appointment_staff());
create policy "Appointment managers manage service areas"
on public.appointment_service_areas for all to authenticated
using (public.is_appointment_manager())
with check (public.is_appointment_manager());

-- Weekly hours and blackout periods.
drop policy if exists "Appointment staff manage availability rules" on public.appointment_availability_rules;
create policy "Appointment staff read availability rules"
on public.appointment_availability_rules for select to authenticated
using (public.is_appointment_staff());
create policy "Appointment managers manage availability rules"
on public.appointment_availability_rules for all to authenticated
using (public.is_appointment_manager())
with check (public.is_appointment_manager());

drop policy if exists "Appointment staff manage blackouts" on public.appointment_blackouts;
create policy "Appointment staff read blackouts"
on public.appointment_blackouts for select to authenticated
using (public.is_appointment_staff());
create policy "Appointment managers manage blackouts"
on public.appointment_blackouts for all to authenticated
using (public.is_appointment_manager())
with check (public.is_appointment_manager());

comment on function public.is_appointment_manager() is
  'True only for active appointment owners and managers; used to gate V2 configuration writes.';
