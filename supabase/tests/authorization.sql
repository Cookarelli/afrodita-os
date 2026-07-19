begin;

create or replace function public.test_assert(condition boolean, message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if condition is not true then
    raise exception 'authorization test failed: %', message;
  end if;
end;
$$;

grant execute on function public.test_assert(boolean, text) to anon, authenticated, service_role;

select public.test_assert(
  not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and (not c.relrowsecurity or not c.relforcerowsecurity)
  ),
  'every public table enables and forces RLS'
);

select public.test_assert(
  not exists (
    select 1
    from pg_tables t
    left join pg_policies p on p.schemaname = t.schemaname and p.tablename = t.tablename
    where t.schemaname = 'public'
    group by t.tablename
    having count(p.policyname) = 0
  ),
  'every public table has an explicit policy'
);

insert into auth.users (id, email)
values
  ('70000000-0000-4000-8000-000000000001', 'super-admin@example.invalid'),
  ('70000000-0000-4000-8000-000000000002', 'owner@example.invalid'),
  ('70000000-0000-4000-8000-000000000003', 'sales@example.invalid'),
  ('70000000-0000-4000-8000-000000000006', 'delivery@example.invalid'),
  ('70000000-0000-4000-8000-000000000008', 'pm-admin@example.invalid'),
  ('70000000-0000-4000-8000-000000000009', 'pm-staff@example.invalid'),
  ('70000000-0000-4000-8000-000000000010', 'investor@example.invalid'),
  ('70000000-0000-4000-8000-000000000011', 'invitee@example.invalid'),
  ('70000000-0000-4000-8000-000000000012', 'expired@example.invalid');

update public.profiles
set auth_user_id = case display_name
  when 'Avery Admin' then '70000000-0000-4000-8000-000000000001'::uuid
  when 'Olivia Owner' then '70000000-0000-4000-8000-000000000002'::uuid
  when 'Sam Sales' then '70000000-0000-4000-8000-000000000003'::uuid
  when 'Drew Delivery' then '70000000-0000-4000-8000-000000000006'::uuid
  when 'Parker Portfolio' then '70000000-0000-4000-8000-000000000008'::uuid
  when 'Morgan Manager' then '70000000-0000-4000-8000-000000000009'::uuid
  when 'Indigo Investor' then '70000000-0000-4000-8000-000000000010'::uuid
end
where display_name in (
  'Avery Admin', 'Olivia Owner', 'Sam Sales', 'Drew Delivery',
  'Parker Portfolio', 'Morgan Manager', 'Indigo Investor'
);

insert into public.appliance_photos (appliance_id, object_path, public_eligible)
values
  ('60000000-0000-4000-8000-000000000001', 'public/available.webp', true),
  ('60000000-0000-4000-8000-000000000002', 'private/repair.webp', false);

insert into storage.objects (bucket_id, name)
values
  ('appliance-photos', 'public/available.webp'),
  ('appliance-photos', 'private/repair.webp'),
  ('company-documents', 'company/prairie/document.pdf'),
  ('company-documents', 'company/river/document.pdf');

insert into public.stored_files (
  bucket_id, object_path, property_management_company_id, visibility
)
values
  ('company-documents', 'company/prairie/document.pdf', '40000000-0000-4000-8000-000000000001', 'company'),
  ('company-documents', 'company/river/document.pdf', '40000000-0000-4000-8000-000000000002', 'company');

insert into public.deliveries (
  id, organization_id, customer_id, delivery_address_id, assigned_profile_id,
  status, customer_contact_name, customer_contact_phone
)
values
  ('72000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000006', 'assigned', 'Maria Example', '815-555-0101'),
  ('72000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', null, '20000000-0000-4000-8000-000000000007', 'assigned', 'Jordan Sample', '815-555-0102');

-- Anonymous users cannot query any private base table, but the public RPC and
-- eligible storage object remain available.
set local role anon;
do $$
begin
  perform 1 from public.appliances;
  raise exception 'anonymous base-table access unexpectedly succeeded';
exception
  when insufficient_privilege then null;
end $$;
select public.test_assert((select count(*) = 7 from public.list_public_appliances()), 'public inventory RPC projection');
select public.test_assert((select count(*) = 1 from storage.objects), 'only eligible public appliance photo is readable');
reset role;

-- Sales can view operational appliances but no raw cost rows.
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"email":"sales@example.invalid"}', true);
set local role authenticated;
select public.test_assert((select count(*) = 10 from public.appliances), 'sales inventory access');
select public.test_assert((select count(*) = 0 from public.appliance_costs), 'sales raw-cost denial');
reset role;

-- Delivery workers cannot browse CRM or costs. Assigned contact retrieval is an
-- RPC and currently returns no rows because no work has been assigned in seed.
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000006', true);
select set_config('request.jwt.claims', '{"email":"delivery@example.invalid"}', true);
set local role authenticated;
select public.test_assert((select count(*) = 0 from public.appliance_costs), 'delivery raw-cost denial');
select public.test_assert((select count(*) = 0 from public.customers), 'delivery CRM denial');
select public.test_assert((select count(*) = 1 from public.deliveries), 'delivery row assignment scoping');
select public.test_assert((select count(*) = 1 from public.list_my_assigned_work_contacts()), 'delivery contact assignment scoping');
do $$
declare
  changed_count integer;
begin
  update public.deliveries set status = 'scheduled';
  get diagnostics changed_count = row_count;
  perform public.test_assert(changed_count = 1, 'delivery update assignment scoping');
end $$;
reset role;

-- Property-manager tenant isolation blocks malicious company/property IDs.
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000008', true);
select set_config('request.jwt.claims', '{"email":"pm-admin@example.invalid"}', true);
set local role authenticated;
select public.test_assert((select count(*) = 1 from public.properties), 'PM sees one own-company property');
select public.test_assert((select count(*) = 0 from public.properties where id = '41000000-0000-4000-8000-000000000002'), 'malicious property ID denied');
select public.test_assert((select count(*) = 0 from public.customers), 'PM retail customer denial');
select public.test_assert((select count(*) = 1 from storage.objects where bucket_id = 'company-documents'), 'PM protected storage tenant isolation');
reset role;

-- Investor access is aggregate-only and cannot modify operational rows.
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000010', true);
select set_config('request.jwt.claims', '{"email":"investor@example.invalid"}', true);
set local role authenticated;
select public.test_assert((select count(*) = 0 from public.appliances), 'investor base inventory denial');
select public.test_assert((select count(*) = 1 from public.get_investor_summary('00000000-0000-4000-8000-000000000001')), 'investor aggregate access');
do $$
declare
  changed_count integer;
begin
  update public.appliances set public_description = 'forbidden';
  get diagnostics changed_count = row_count;
  perform public.test_assert(changed_count = 0, 'investor edit denial');
end $$;
reset role;

-- Owners and super admins can retrieve raw costs.
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"email":"owner@example.invalid"}', true);
set local role authenticated;
select public.test_assert((select count(*) = 3 from public.appliance_costs), 'owner raw-cost access');
reset role;

select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"email":"super-admin@example.invalid"}', true);
set local role authenticated;
select public.test_assert((select count(*) = 3 from public.appliance_costs), 'super-admin raw-cost access');
reset role;

-- Invitation acceptance activates a pending profile and assigns its role.
insert into public.profiles (id, display_name, status)
values ('71000000-0000-4000-8000-000000000011', 'Invited Fictional User', 'pending');
insert into public.invitations (
  organization_id, pending_profile_id, email, intended_role, token_hash,
  invited_by_profile_id, expires_at
)
values (
  '00000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000011',
  'invitee@example.invalid',
  'sales_staff',
  '397a2a9c5bf5e2ccec38c2596b682bb1bd05fe6e4ecea6c10cf42755ff225403',
  '20000000-0000-4000-8000-000000000001',
  now() + interval '1 day'
);

select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000011', true);
select set_config('request.jwt.claims', '{"email":"invitee@example.invalid"}', true);
set local role authenticated;
select public.accept_invitation('397a2a9c5bf5e2ccec38c2596b682bb1bd05fe6e4ecea6c10cf42755ff225403');
select public.test_assert(public.has_role('sales_staff', '00000000-0000-4000-8000-000000000001'), 'accepted invitation role');
reset role;

-- Expiration is performed by a trusted scheduled server job. Expired tokens can
-- no longer be accepted.
insert into public.profiles (id, display_name, status)
values ('71000000-0000-4000-8000-000000000012', 'Expired Fictional User', 'pending');
insert into public.invitations (
  organization_id, pending_profile_id, email, intended_role, token_hash,
  invited_by_profile_id, expires_at, created_at
)
values (
  '00000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000012',
  'expired@example.invalid',
  'sales_staff',
  'b52b3ef2233858ce1156d85f235cf2c41eddfa8ca1eedc924398b9af1db303cb',
  '20000000-0000-4000-8000-000000000001',
  now() - interval '1 minute',
  now() - interval '1 day'
);
set local role service_role;
select public.test_assert(public.expire_invitations() = 1, 'scheduled invitation expiration');
reset role;

select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000012', true);
select set_config('request.jwt.claims', '{"email":"expired@example.invalid"}', true);
set local role authenticated;
do $$
begin
  perform public.accept_invitation('b52b3ef2233858ce1156d85f235cf2c41eddfa8ca1eedc924398b9af1db303cb');
  raise exception 'expired invitation unexpectedly accepted';
exception
  when invalid_parameter_value then null;
end $$;
reset role;

-- Disabled memberships invalidate role-derived access immediately.
update public.organization_members
set status = 'disabled'
where profile_id = '20000000-0000-4000-8000-000000000009';
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000009', true);
select set_config('request.jwt.claims', '{"email":"pm-staff@example.invalid"}', true);
set local role authenticated;
select public.test_assert((select count(*) = 0 from public.properties), 'disabled membership denial');
reset role;

rollback;
