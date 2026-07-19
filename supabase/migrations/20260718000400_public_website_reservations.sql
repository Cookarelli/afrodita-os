-- Public website contracts. Anonymous callers receive narrow projections and
-- may write only through validated, transaction-safe security-definer functions.

drop index if exists public.reservations_one_active_appliance_idx;
drop policy if exists reservations_pm_insert on public.reservations;
alter table public.reservations alter column status drop default;
alter type public.reservation_status rename to reservation_status_legacy;
create type public.reservation_status as enum (
  'requested', 'pending_review', 'confirmed', 'declined', 'expired',
  'withdrawn', 'converted_to_sale'
);
alter table public.reservations
  alter column status type public.reservation_status
  using (
    case status::text
      when 'approved' then 'confirmed'
      when 'cancelled' then 'withdrawn'
      when 'converted' then 'converted_to_sale'
      else status::text
    end
  )::public.reservation_status;
alter table public.reservations alter column status set default 'requested';
drop type public.reservation_status_legacy;

alter table public.reservations
  add column reservation_reference text,
  add column preferred_date date,
  add column communication_consent boolean not null default false,
  add column confirmation_acknowledged boolean not null default false,
  add column customer_withdrawal_reason text,
  add column duplicate_review_required boolean not null default false,
  add column extended_at timestamptz,
  add column declined_at timestamptz,
  add column withdrawn_at timestamptz;

update public.reservations
set reservation_reference = 'AFR-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where reservation_reference is null;

alter table public.reservations
  alter column reservation_reference set not null,
  add constraint reservations_reference_unique unique (reservation_reference);

create unique index reservations_one_active_appliance_idx
  on public.reservations(appliance_id)
  where status in ('requested', 'pending_review', 'confirmed') and archived_at is null;

create policy reservations_pm_insert on public.reservations for insert to authenticated
with check (
  property_management_company_id is not null
  and public.can_access_property_company(property_management_company_id)
  and status = 'requested'
);

create table public.customer_duplicate_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  incoming_customer_id uuid not null references public.customers(id) on delete restrict,
  possible_customer_id uuid not null references public.customers(id) on delete restrict,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'not_duplicate', 'merged')),
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (incoming_customer_id <> possible_customer_id)
);

create table public.internal_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status text not null default 'pending' check (status in ('pending', 'processing', 'delivered', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  inquiry_reference text not null unique,
  reason text not null check (reason in ('retail', 'property_manager', 'repair', 'delivery', 'warranty')),
  first_name text not null,
  last_name text not null,
  email extensions.citext not null,
  phone text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'spam')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reservations_expiration_idx on public.reservations(expires_at)
  where status in ('requested', 'pending_review', 'confirmed') and archived_at is null;
create index duplicate_candidates_pending_idx on public.customer_duplicate_candidates(organization_id, created_at)
  where status = 'pending';
create index internal_notifications_pending_idx on public.internal_notifications(available_at, created_at)
  where status = 'pending';
create index contact_inquiries_status_idx on public.contact_inquiries(organization_id, status, created_at desc);

alter table public.customer_duplicate_candidates enable row level security;
alter table public.customer_duplicate_candidates force row level security;
alter table public.internal_notifications enable row level security;
alter table public.internal_notifications force row level security;
alter table public.contact_inquiries enable row level security;
alter table public.contact_inquiries force row level security;

create policy duplicate_candidates_staff_manage on public.customer_duplicate_candidates for all to authenticated
using (public.has_permission('manage_customers', organization_id))
with check (public.has_permission('manage_customers', organization_id));
create policy internal_notifications_staff_select on public.internal_notifications for select to authenticated
using (public.has_permission('manage_operations', organization_id));
create policy contact_inquiries_staff_manage on public.contact_inquiries for all to authenticated
using (public.has_permission('manage_customers', organization_id))
with check (public.has_permission('manage_customers', organization_id));

drop function if exists public.list_public_appliances();
create function public.list_public_appliances()
returns table (
  public_id text, inventory_number text, category text, brand text, model text,
  color text, finish text, width_inches numeric, fuel_type text, condition text,
  public_description text, public_price_cents bigint, currency text,
  available_at timestamptz, photo_path text, photo_alt text
)
language sql stable security definer set search_path = ''
as $$
  select
    a.qr_lookup_id, a.inventory_number, a.category, a.brand, a.model, a.color,
    a.finish, a.width_inches, a.fuel_type, a.condition, a.public_description,
    a.public_price_cents, a.currency, a.available_at, photo.object_path, photo.alt_text
  from public.appliances a
  join public.organizations o on o.id = a.organization_id and o.slug = 'afrodita-appliances'
  left join lateral (
    select ap.object_path, ap.alt_text
    from public.appliance_photos ap
    where ap.appliance_id = a.id and ap.public_eligible and ap.archived_at is null
    order by ap.sort_order, ap.created_at
    limit 1
  ) photo on true
  where a.status = 'available'
    and a.public_visibility
    and a.archived_at is null
    and exists (
      select 1 from public.inventory_locations il
      join public.locations l on l.id = il.location_id
      where il.id = a.inventory_location_id and il.active and l.active
    )
  order by a.available_at desc nulls last, a.created_at desc
$$;
grant execute on function public.list_public_appliances() to anon, authenticated;

create function public.get_public_appliance(target_public_id text)
returns table (
  public_id text, inventory_number text, category text, brand text, model text,
  color text, finish text, width_inches numeric, fuel_type text, condition text,
  public_description text, public_price_cents bigint, currency text,
  available_at timestamptz, photos jsonb
)
language sql stable security definer set search_path = ''
as $$
  select
    a.qr_lookup_id, a.inventory_number, a.category, a.brand, a.model, a.color,
    a.finish, a.width_inches, a.fuel_type, a.condition, a.public_description,
    a.public_price_cents, a.currency, a.available_at,
    coalesce((
      select jsonb_agg(jsonb_build_object('path', ap.object_path, 'alt', ap.alt_text) order by ap.sort_order, ap.created_at)
      from public.appliance_photos ap
      where ap.appliance_id = a.id and ap.public_eligible and ap.archived_at is null
    ), '[]'::jsonb)
  from public.appliances a
  join public.organizations o on o.id = a.organization_id and o.slug = 'afrodita-appliances'
  where a.qr_lookup_id = target_public_id
    and a.status = 'available' and a.public_visibility and a.archived_at is null
    and exists (
      select 1 from public.inventory_locations il join public.locations l on l.id = il.location_id
      where il.id = a.inventory_location_id and il.active and l.active
    )
  limit 1
$$;
grant execute on function public.get_public_appliance(text) to anon, authenticated;

create function public.normalize_public_phone(raw_phone text)
returns text language sql immutable set search_path = ''
as $$
  select case
    when length(regexp_replace(coalesce(raw_phone, ''), '[^0-9]', '', 'g')) = 10
      then '+1' || regexp_replace(raw_phone, '[^0-9]', '', 'g')
    else '+' || regexp_replace(coalesce(raw_phone, ''), '[^0-9]', '', 'g')
  end
$$;

create function public.create_public_reservation(
  target_public_id text,
  first_name text,
  last_name text,
  phone text,
  email text,
  fulfillment text,
  preferred_date date,
  delivery_address_line_1 text default null,
  delivery_address_line_2 text default null,
  delivery_city text default null,
  delivery_state text default null,
  delivery_postal_code text default null,
  customer_notes text default null,
  communication_consent boolean default false,
  confirmation_acknowledged boolean default false,
  expiration_hours integer default 24
)
returns table (reservation_reference text, expires_at timestamptz, duplicate_review_required boolean)
language plpgsql volatile security definer set search_path = ''
as $$
#variable_conflict use_variable
declare
  target_appliance public.appliances%rowtype;
  normalized_email text := lower(trim(email));
  normalized_phone text := public.normalize_public_phone(phone);
  org_uuid uuid;
  exact_customer uuid;
  possible_customer uuid;
  customer_uuid uuid;
  reservation_uuid uuid := gen_random_uuid();
  reference text := 'AFR-' || upper(substr(replace(reservation_uuid::text, '-', ''), 1, 8));
  review_required boolean := false;
begin
  if trim(first_name) = '' or trim(last_name) = '' or normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid reservation request' using errcode = '22023';
  end if;
  if length(regexp_replace(phone, '[^0-9]', '', 'g')) < 10 or fulfillment not in ('pickup', 'delivery') then
    raise exception 'invalid reservation request' using errcode = '22023';
  end if;
  if not confirmation_acknowledged or expiration_hours < 1 or expiration_hours > 168 then
    raise exception 'reservation acknowledgment or expiration is invalid' using errcode = '22023';
  end if;
  if fulfillment = 'delivery' and (nullif(trim(delivery_address_line_1), '') is null or nullif(trim(delivery_city), '') is null or nullif(trim(delivery_state), '') is null) then
    raise exception 'delivery address is required' using errcode = '22023';
  end if;

  select a.* into target_appliance
  from public.appliances a
  join public.organizations o on o.id = a.organization_id and o.slug = 'afrodita-appliances'
  where a.qr_lookup_id = target_public_id
  for update of a;

  if target_appliance.id is null or target_appliance.status <> 'available' or not target_appliance.public_visibility or target_appliance.archived_at is not null then
    raise exception 'appliance is no longer available' using errcode = 'P0001';
  end if;
  org_uuid := target_appliance.organization_id;

  select c.id into exact_customer
  from public.customers c
  where c.organization_id = org_uuid and c.status = 'active'
    and exists (select 1 from public.customer_contacts cc where cc.customer_id = c.id and cc.contact_type = 'email' and cc.normalized_value = normalized_email and cc.archived_at is null)
    and exists (select 1 from public.customer_contacts cc where cc.customer_id = c.id and cc.contact_type = 'phone' and cc.normalized_value = normalized_phone and cc.archived_at is null)
  limit 1;

  if exact_customer is not null then
    customer_uuid := exact_customer;
    update public.customers set first_name = trim(first_name), last_name = trim(last_name), display_name = trim(first_name) || ' ' || trim(last_name)
    where id = customer_uuid;
  else
    select c.id into possible_customer
    from public.customers c
    join public.customer_contacts cc on cc.customer_id = c.id and cc.archived_at is null
    where c.organization_id = org_uuid and c.status = 'active'
      and ((cc.contact_type = 'email' and cc.normalized_value = normalized_email) or (cc.contact_type = 'phone' and cc.normalized_value = normalized_phone))
    limit 1;

    customer_uuid := gen_random_uuid();
    insert into public.customers(id, organization_id, display_name, first_name, last_name)
    values (customer_uuid, org_uuid, trim(first_name) || ' ' || trim(last_name), trim(first_name), trim(last_name));
    insert into public.customer_contacts(customer_id, contact_type, contact_value, normalized_value, is_primary, consent_status)
    values
      (customer_uuid, 'email', normalized_email, normalized_email, true, case when communication_consent then 'granted' else 'unknown' end),
      (customer_uuid, 'phone', phone, normalized_phone, true, case when communication_consent then 'granted' else 'unknown' end);

    if possible_customer is not null then
      review_required := true;
      insert into public.customer_duplicate_candidates(organization_id, incoming_customer_id, possible_customer_id, reason)
      values (org_uuid, customer_uuid, possible_customer, 'One normalized contact matched; manual review required.');
    end if;
  end if;

  if fulfillment = 'delivery' then
    insert into public.customer_addresses(customer_id, address_type, address_line_1, address_line_2, city, state, postal_code)
    values (customer_uuid, 'delivery', trim(delivery_address_line_1), nullif(trim(delivery_address_line_2), ''), trim(delivery_city), upper(trim(delivery_state)), nullif(trim(delivery_postal_code), ''));
  end if;

  insert into public.reservations(
    id, organization_id, appliance_id, customer_id, status, fulfillment_preference,
    preferred_date, expires_at, notes, reservation_reference,
    communication_consent, confirmation_acknowledged, duplicate_review_required
  ) values (
    reservation_uuid, org_uuid, target_appliance.id, customer_uuid, 'pending_review', fulfillment,
    preferred_date, now() + make_interval(hours => expiration_hours), nullif(trim(customer_notes), ''), reference,
    communication_consent, confirmation_acknowledged, review_required
  );

  update public.appliances
  set status = 'reservation_pending', reserved_at = now(), version = version + 1
  where id = target_appliance.id;
  insert into public.appliance_status_history(appliance_id, from_status, to_status, reason)
  values (target_appliance.id, 'available', 'reservation_pending', 'Public reservation request ' || reference);
  insert into public.activity_log(action, entity_type, entity_id, organization_id, after_metadata)
  values ('reservation.public_requested', 'reservation', reservation_uuid, org_uuid, jsonb_build_object('reference', reference, 'fulfillment', fulfillment, 'duplicate_review_required', review_required));
  insert into public.internal_notifications(organization_id, event_type, entity_type, entity_id, payload)
  values (org_uuid, 'reservation.requested', 'reservation', reservation_uuid, jsonb_build_object('reference', reference));

  return query select reference, now() + make_interval(hours => expiration_hours), review_required;
end;
$$;
revoke all on function public.create_public_reservation(text,text,text,text,text,text,date,text,text,text,text,text,text,boolean,boolean,integer) from public;
grant execute on function public.create_public_reservation(text,text,text,text,text,text,date,text,text,text,text,text,text,boolean,boolean,integer) to anon, authenticated;

create function public.create_contact_inquiry(
  inquiry_reason text, first_name text, last_name text, email text, phone text, message text
)
returns text language plpgsql volatile security definer set search_path = ''
as $$
#variable_conflict use_variable
declare
  org_uuid uuid;
  reference text := 'INQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  inquiry_uuid uuid;
begin
  if inquiry_reason not in ('retail', 'property_manager', 'repair', 'delivery', 'warranty')
     or trim(first_name) = '' or trim(last_name) = '' or length(trim(message)) < 10
     or lower(trim(email)) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid inquiry' using errcode = '22023';
  end if;
  select id into org_uuid from public.organizations where slug = 'afrodita-appliances';
  insert into public.contact_inquiries(organization_id, inquiry_reference, reason, first_name, last_name, email, phone, message)
  values (org_uuid, reference, inquiry_reason, trim(first_name), trim(last_name), lower(trim(email)), nullif(trim(phone), ''), trim(message))
  returning id into inquiry_uuid;
  insert into public.internal_notifications(organization_id, event_type, entity_type, entity_id, payload)
  values (org_uuid, 'contact.inquiry', 'contact_inquiry', inquiry_uuid, jsonb_build_object('reference', reference, 'reason', inquiry_reason));
  return reference;
end;
$$;
revoke all on function public.create_contact_inquiry(text,text,text,text,text,text) from public;
grant execute on function public.create_contact_inquiry(text,text,text,text,text,text) to anon, authenticated;

create function public.manage_reservation(
  target_reservation_id uuid,
  target_status public.reservation_status default null,
  extend_until timestamptz default null,
  staff_reason text default null
)
returns public.reservations
language plpgsql volatile security definer set search_path = ''
as $$
declare current_row public.reservations%rowtype; appliance_state public.appliance_status;
begin
  select * into current_row from public.reservations where id = target_reservation_id for update;
  if current_row.id is null or not public.has_permission('manage_sales', current_row.organization_id) then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  if extend_until is not null then
    if extend_until <= now() or current_row.status not in ('requested', 'pending_review', 'confirmed') then
      raise exception 'reservation cannot be extended' using errcode = '22023';
    end if;
    update public.reservations set expires_at = extend_until, extended_at = now(), version = version + 1 where id = current_row.id returning * into current_row;
  end if;
  if target_status is not null and target_status <> current_row.status then
    if not (
      (current_row.status in ('requested', 'pending_review') and target_status in ('confirmed', 'declined', 'withdrawn'))
      or (current_row.status = 'confirmed' and target_status in ('withdrawn', 'converted_to_sale'))
    ) then raise exception 'invalid reservation transition' using errcode = '22023'; end if;
    update public.reservations set
      status = target_status,
      approved_at = case when target_status = 'confirmed' then now() else approved_at end,
      declined_at = case when target_status = 'declined' then now() else declined_at end,
      withdrawn_at = case when target_status = 'withdrawn' then now() else withdrawn_at end,
      converted_at = case when target_status = 'converted_to_sale' then now() else converted_at end,
      version = version + 1
    where id = current_row.id returning * into current_row;

    select status into appliance_state from public.appliances where id = current_row.appliance_id for update;
    if target_status = 'confirmed' then
      update public.appliances set status = 'reserved', version = version + 1 where id = current_row.appliance_id and status = 'reservation_pending';
      insert into public.appliance_status_history(appliance_id, from_status, to_status, reason, changed_by_profile_id)
      values (current_row.appliance_id, appliance_state, 'reserved', coalesce(staff_reason, 'Reservation confirmed'), public.current_profile_id());
    elsif target_status in ('declined', 'withdrawn') then
      update public.appliances set status = 'available', reserved_at = null, version = version + 1 where id = current_row.appliance_id and status in ('reservation_pending', 'reserved');
      insert into public.appliance_status_history(appliance_id, from_status, to_status, reason, changed_by_profile_id)
      values (current_row.appliance_id, appliance_state, 'available', coalesce(staff_reason, 'Reservation released'), public.current_profile_id());
    end if;
    insert into public.activity_log(actor_profile_id, action, entity_type, entity_id, organization_id, after_metadata)
    values (public.current_profile_id(), 'reservation.' || target_status::text, 'reservation', current_row.id, current_row.organization_id, jsonb_build_object('reason', staff_reason));
  end if;
  return current_row;
end;
$$;
revoke all on function public.manage_reservation(uuid,public.reservation_status,timestamptz,text) from public, anon;
grant execute on function public.manage_reservation(uuid,public.reservation_status,timestamptz,text) to authenticated;

create function public.release_expired_reservations(batch_size integer default 100)
returns integer language plpgsql volatile security definer set search_path = ''
as $$
declare released integer := 0; row_data record;
begin
  for row_data in
    select r.id, r.appliance_id, r.organization_id, r.reservation_reference
    from public.reservations r
    where r.status in ('requested', 'pending_review', 'confirmed') and r.expires_at <= now() and r.archived_at is null
    order by r.expires_at for update skip locked limit greatest(1, least(batch_size, 500))
  loop
    update public.reservations set status = 'expired', updated_at = now(), version = version + 1 where id = row_data.id;
    update public.appliances set status = 'available', reserved_at = null, version = version + 1
      where id = row_data.appliance_id and status in ('reservation_pending', 'reserved');
    insert into public.appliance_status_history(appliance_id, from_status, to_status, reason)
      values (row_data.appliance_id, 'reservation_pending', 'available', 'Reservation expired: ' || row_data.reservation_reference);
    insert into public.activity_log(action, entity_type, entity_id, organization_id)
      values ('reservation.expired', 'reservation', row_data.id, row_data.organization_id);
    released := released + 1;
  end loop;
  return released;
end;
$$;
revoke all on function public.release_expired_reservations(integer) from public, anon, authenticated;
grant execute on function public.release_expired_reservations(integer) to service_role;

create trigger contact_inquiries_touch_updated_at before update on public.contact_inquiries
for each row execute function public.touch_updated_at();
