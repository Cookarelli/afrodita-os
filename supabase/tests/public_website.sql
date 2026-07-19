begin;

create or replace function public.public_test_assert(condition boolean, message text)
returns void language plpgsql as $$
begin
  if not condition then raise exception 'public website test failed: %', message; end if;
end $$;

select public.public_test_assert(
  (select count(*) = 7 from public.list_public_appliances()),
  'available public inventory count'
);
select public.public_test_assert(
  not exists (select 1 from public.list_public_appliances() where public_id = 'dev_qr_stove_sold_0000001'),
  'sold inventory excluded'
);
select public.public_test_assert(
  not exists (select 1 from public.list_public_appliances() where public_id in ('dev_qr_washer_repair_000001', 'dev_qr_dryer_intake_000001')),
  'hidden and non-available inventory excluded'
);
select public.public_test_assert(
  pg_get_function_result('public.list_public_appliances()'::regprocedure) !~* '(cost|margin|profit|serial|supplier|notes)',
  'public projection omits private fields'
);
select public.public_test_assert(
  (select count(*) = 0 from public.get_public_appliance('dev_qr_stove_sold_0000001')),
  'sold appliance detail excluded'
);
select public.public_test_assert(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'reservations_one_active_appliance_idx'
      and indexdef ~ 'requested.*pending_review.*confirmed'
  ),
  'active reservation uniqueness constraint'
);
select public.public_test_assert(
  pg_get_functiondef('public.create_public_reservation(text,text,text,text,text,text,date,text,text,text,text,text,text,boolean,boolean,integer)'::regprocedure) ~* 'for update',
  'reservation function locks appliance row'
);

set local role anon;

do $$
begin
  perform * from public.create_public_reservation(
    'dev_qr_refrigerator_000001', 'Riley', 'Preview', '815-555-0110',
    'riley.preview@example.invalid', 'pickup', current_date + 1,
    null, null, null, null, null, 'Please call first.', true, true, 24
  );
end $$;

reset role;

select public.public_test_assert(
  (select count(*) = 1 from public.reservations where reservation_reference like 'AFR-%' and status = 'pending_review'),
  'reservation created in pending review'
);
select public.public_test_assert(
  (select status = 'reservation_pending' from public.appliances where qr_lookup_id = 'dev_qr_refrigerator_000001'),
  'appliance moved to reservation pending'
);
select public.public_test_assert(
  exists (select 1 from public.customers where display_name = 'Riley Preview'),
  'CRM customer created'
);
select public.public_test_assert(
  exists (select 1 from public.internal_notifications where event_type = 'reservation.requested'),
  'notification adapter event created'
);

set local role anon;
do $$
begin
  perform * from public.create_public_reservation(
    'dev_qr_refrigerator_000001', 'Second', 'Claim', '815-555-0111',
    'second.claim@example.invalid', 'pickup', current_date + 1,
    null, null, null, null, null, null, false, true, 24
  );
  raise exception 'conflicting reservation unexpectedly succeeded';
exception when raise_exception then
  if sqlerrm = 'conflicting reservation unexpectedly succeeded' then raise; end if;
end $$;

do $$
begin
  perform * from public.create_public_reservation(
    'dev_qr_washer_00000000001', '', 'Invalid', '12', 'not-an-email',
    'pickup', current_date + 1, null, null, null, null, null, null, false, false, 24
  );
  raise exception 'invalid reservation unexpectedly succeeded';
exception when invalid_parameter_value then null;
end $$;

reset role;

-- Add a second available appliance and exact CRM identity to prove exact matching
-- reuses history rather than creating another customer.
insert into public.customer_contacts(customer_id, contact_type, contact_value, normalized_value, is_primary)
values ('50000000-0000-4000-8000-000000000001', 'phone', '815-555-0122', '+18155550122', true);

set local role anon;
select * from public.create_public_reservation(
  'dev_qr_washer_00000000001', 'Maria', 'Example', '815-555-0122',
  'maria@example.invalid', 'delivery', current_date + 2,
  '404 Preview Street', null, 'Loves Park', 'IL', '61111', null, true, true, 24
);
reset role;

select public.public_test_assert(
  (select count(*) = 1 from public.customers where display_name = 'Maria Example'),
  'exact contact match retained existing customer'
);
select public.public_test_assert(
  exists (
    select 1 from public.reservations r
    where r.customer_id = '50000000-0000-4000-8000-000000000001'
      and r.appliance_id = '60000000-0000-4000-8000-000000000005'
  ),
  'reservation associated with existing customer'
);

update public.reservations
set created_at = now() - interval '2 days', expires_at = now() - interval '1 minute'
where appliance_id = '60000000-0000-4000-8000-000000000005';
set local role service_role;
select public.public_test_assert(public.release_expired_reservations(100) = 1, 'expiration releases one reservation');
reset role;
select public.public_test_assert(
  (select status = 'available' from public.appliances where id = '60000000-0000-4000-8000-000000000005'),
  'expired reservation releases appliance'
);

rollback;
