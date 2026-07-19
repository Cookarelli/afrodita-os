-- Development-only fictional data. No Auth users, real emails, passwords,
-- customers, or production identifiers are created by this seed.

insert into public.organizations (id, slug, legal_name, public_name)
values (
  '00000000-0000-4000-8000-000000000001',
  'afrodita-appliances',
  'Afrodita White Goods LLC',
  'Afrodita Appliances'
);

insert into public.locations (
  id, organization_id, code, name, location_type,
  address_line_1, city, state, postal_code, phone
)
values (
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001',
  'LOVES-PARK',
  'Loves Park Store',
  'retail',
  '5205 N. 2nd St.',
  'Loves Park',
  'IL',
  '61111',
  '815-222-3679'
);

insert into public.inventory_locations (id, organization_id, location_id, code, name, location_type)
values
  ('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 'FLOOR', 'Sales Floor', 'floor'),
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 'REPAIR', 'Repair Area', 'repair'),
  ('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 'INTAKE', 'Intake Area', 'intake');

-- Invitation-ready real staff directory records. They remain pending and have no
-- Auth IDs or email addresses. An authorized admin will supply email at invite time.
insert into public.profiles (id, display_name, first_name, last_name, title, status)
values
  ('10000000-0000-4000-8000-000000000001', 'Steven Cook', 'Steven', 'Cook', 'Business Development Manager', 'pending'),
  ('10000000-0000-4000-8000-000000000002', 'Erika Cedillo', 'Erika', 'Cedillo', 'Owner', 'pending'),
  ('10000000-0000-4000-8000-000000000003', 'Mikey Jones', 'Mikey', 'Jones', 'Sales Manager', 'pending'),
  ('10000000-0000-4000-8000-000000000004', 'Carlo', 'Carlo', null, 'Delivery and Repair', 'pending');

-- Fictional profiles exercise every role without creating login credentials.
insert into public.profiles (id, display_name, first_name, last_name, title, status)
values
  ('20000000-0000-4000-8000-000000000001', 'Avery Admin', 'Avery', 'Admin', 'Development Super Admin', 'active'),
  ('20000000-0000-4000-8000-000000000002', 'Olivia Owner', 'Olivia', 'Owner', 'Development Owner', 'active'),
  ('20000000-0000-4000-8000-000000000003', 'Sam Sales', 'Sam', 'Sales', 'Development Sales Manager', 'active'),
  ('20000000-0000-4000-8000-000000000004', 'Sasha Staff', 'Sasha', 'Staff', 'Development Sales Staff', 'active'),
  ('20000000-0000-4000-8000-000000000005', 'Wren Warehouse', 'Wren', 'Warehouse', 'Development Warehouse', 'active'),
  ('20000000-0000-4000-8000-000000000006', 'Drew Delivery', 'Drew', 'Delivery', 'Development Delivery Technician', 'active'),
  ('20000000-0000-4000-8000-000000000007', 'Terry Technician', 'Terry', 'Technician', 'Development Technician', 'active'),
  ('20000000-0000-4000-8000-000000000008', 'Parker Portfolio', 'Parker', 'Portfolio', 'Development Property Manager Admin', 'active'),
  ('20000000-0000-4000-8000-000000000009', 'Morgan Manager', 'Morgan', 'Manager', 'Development Property Manager Staff', 'active'),
  ('20000000-0000-4000-8000-000000000010', 'Indigo Investor', 'Indigo', 'Investor', 'Development Investor', 'active');

insert into public.organization_members (id, organization_id, profile_id, member_kind, status, started_at)
select
  ('30000000-0000-4000-8000-' || lpad(row_number() over (order by p.id)::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001'::uuid,
  p.id,
  case when p.display_name = 'Indigo Investor' then 'investor' else 'employee' end,
  'active'::public.membership_status,
  now()
from public.profiles p
where p.id::text like '20000000-%';

insert into public.role_assignments (organization_member_id, role)
select om.id, role_map.role::public.system_role
from public.organization_members om
join public.profiles p on p.id = om.profile_id
join (values
  ('Avery Admin', 'super_admin'),
  ('Olivia Owner', 'owner_admin'),
  ('Sam Sales', 'sales_manager'),
  ('Sasha Staff', 'sales_staff'),
  ('Wren Warehouse', 'warehouse'),
  ('Drew Delivery', 'delivery_technician'),
  ('Terry Technician', 'technician'),
  ('Parker Portfolio', 'property_manager_admin'),
  ('Morgan Manager', 'property_manager_staff'),
  ('Indigo Investor', 'investor_viewer')
) as role_map(display_name, role) on role_map.display_name = p.display_name;

insert into public.property_management_companies (id, organization_id, company_name, status, door_count)
values
  ('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Prairie Lantern Property Group', 'active', 8),
  ('40000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Rock River Demo Management', 'active', 4);

insert into public.property_manager_members (property_management_company_id, profile_id, status)
values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000008', 'active'),
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000009', 'active');

update public.role_assignments ra
set property_management_company_id = '40000000-0000-4000-8000-000000000001'
from public.organization_members om
where om.id = ra.organization_member_id
  and om.profile_id in (
    '20000000-0000-4000-8000-000000000008',
    '20000000-0000-4000-8000-000000000009'
  );

insert into public.properties (id, property_management_company_id, name, address_line_1, city, state, postal_code, door_count)
values
  ('41000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Lantern Court', '101 Demo Avenue', 'Rockford', 'IL', '61101', 8),
  ('41000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'Riverstone Duplexes', '202 Sample Street', 'Loves Park', 'IL', '61111', 4);

insert into public.property_units (id, property_id, unit_label)
values
  ('42000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', '1A'),
  ('42000000-0000-4000-8000-000000000002', '41000000-0000-4000-8000-000000000001', '1B'),
  ('42000000-0000-4000-8000-000000000003', '41000000-0000-4000-8000-000000000002', 'A');

insert into public.customers (id, organization_id, display_name, first_name, last_name)
values
  ('50000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Maria Example', 'Maria', 'Example'),
  ('50000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Jordan Sample', 'Jordan', 'Sample');

insert into public.customer_contacts (customer_id, contact_type, contact_value, normalized_value, is_primary, consent_status)
values
  ('50000000-0000-4000-8000-000000000001', 'email', 'maria@example.invalid', 'maria@example.invalid', true, 'granted'),
  ('50000000-0000-4000-8000-000000000002', 'phone', '815-555-0199', '+18155550199', true, 'unknown');

insert into public.customer_addresses (id, customer_id, address_type, address_line_1, city, state, postal_code, is_primary)
values
  ('51000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'delivery', '303 Fictional Lane', 'Rockford', 'IL', '61103', true);

insert into public.appliances (
  id, organization_id, inventory_location_id, inventory_number, qr_lookup_id,
  category, brand, model, color, finish, width_inches, fuel_type, condition,
  public_description, public_price_cents, property_manager_price_cents,
  minimum_authorized_price_cents, status, public_visibility, available_at
)
values
  ('60000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', 'DEV-R001', 'dev_qr_refrigerator_000001', 'refrigerator', 'Example Brand', 'REF-100', 'stainless', 'stainless', 36, 'electric', 'refurbished', 'Fictional development refrigerator.', 65000, 60000, 52500, 'available', true, now()),
  ('60000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021', 'DEV-W001', 'dev_qr_washer_repair_000001', 'washer', 'Sample Works', 'WASH-20', 'white', 'painted', 27, 'electric', 'used', null, 37500, 34000, 30000, 'repair', false, null),
  ('60000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000022', 'DEV-D001', 'dev_qr_dryer_intake_000001', 'dryer', 'Demo Electric', 'DRY-30', 'white', 'painted', 27, 'electric', 'used', null, 32500, 30000, 27500, 'intake', false, null),
  ('60000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', 'DEV-S001', 'dev_qr_stove_sold_0000001', 'range', 'Fictional Home', 'RANGE-40', 'black', 'painted', 30, 'gas', 'refurbished', null, 45000, 41000, 36000, 'sold', false, null);

insert into public.appliances (
  id, organization_id, inventory_location_id, inventory_number, qr_lookup_id,
  category, brand, model, color, finish, width_inches, fuel_type, condition,
  public_description, public_price_cents, status, public_visibility, available_at
)
values
  ('60000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', 'DEV-W002', 'dev_qr_washer_00000000001', 'washer', 'Harbor', 'HWT-27', 'white', 'painted', 27, 'electric', 'used', 'A straightforward top-load washer prepared for everyday laundry.', 37500, 'available', true, now() - interval '1 day'),
  ('60000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', 'DEV-D003', 'dev_qr_dryer_000000000001', 'dryer', 'Harbor', 'HDE-27', 'white', 'painted', 27, 'electric', 'refurbished', 'An electric dryer with simple controls and a bright white finish.', 32500, 'available', true, now() - interval '2 days'),
  ('60000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', 'DEV-S004', 'dev_qr_range_000000000001', 'range', 'Hearthline', 'HGR-30', 'black', 'enameled', 30, 'gas', 'used', 'A practical gas range with a black finish.', 45000, 'available', true, now() - interval '3 days'),
  ('60000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', 'DEV-F005', 'dev_qr_freezer_0000000001', 'freezer', 'Cold Creek', 'CCF-21', 'white', 'painted', 33, 'electric', 'refurbished', 'A chest freezer ready for extra frozen storage.', 42500, 'available', true, now() - interval '4 days'),
  ('60000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', 'DEV-L006', 'dev_qr_laundry_center_001', 'laundry-center', 'Stackwell', 'SWC-24', 'white', 'painted', 24, 'electric', 'used', 'A space-saving stacked laundry center.', 57500, 'available', true, now() - interval '5 days'),
  ('60000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', 'DEV-M007', 'dev_qr_misc_dishwasher_01', 'miscellaneous', 'Clearwater', 'CDW-24', 'black', 'enameled', 24, 'electric', 'refurbished', 'A compact dishwasher with an easy-clean black front.', 27500, 'available', true, now() - interval '6 days');

insert into public.appliance_costs (appliance_id, cost_type, amount_cents, description)
values
  ('60000000-0000-4000-8000-000000000001', 'acquisition', 25000, 'Fictional seed acquisition cost'),
  ('60000000-0000-4000-8000-000000000001', 'labor', 5000, 'Fictional seed labor estimate'),
  ('60000000-0000-4000-8000-000000000002', 'acquisition', 12500, 'Fictional seed acquisition cost');

insert into public.appliance_status_history (appliance_id, to_status, reason)
select id, status, 'Development seed state' from public.appliances;
