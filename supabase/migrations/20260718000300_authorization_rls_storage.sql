-- Security helpers deliberately query active memberships on every request. They
-- do not trust client-supplied organization, company, role, or profile IDs.
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.profiles p
  where p.auth_user_id = auth.uid()
    and p.status = 'active'
  limit 1
$$;

create or replace function public.is_active_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.profile_id = public.current_profile_id()
      and om.status = 'active'
  )
$$;

create or replace function public.is_active_property_manager_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.property_manager_members pmm
    where pmm.property_management_company_id = target_company_id
      and pmm.profile_id = public.current_profile_id()
      and pmm.status = 'active'
  )
$$;

create or replace function public.has_role(
  target_role public.system_role,
  target_organization_id uuid default null,
  target_company_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.role_assignments ra
    join public.organization_members om on om.id = ra.organization_member_id
    where om.profile_id = public.current_profile_id()
      and om.status = 'active'
      and ra.revoked_at is null
      and ra.role = target_role
      and (target_organization_id is null or om.organization_id = target_organization_id)
      and (target_company_id is null or ra.property_management_company_id = target_company_id)
      and (
        ra.role not in ('property_manager_admin', 'property_manager_staff')
        or (
          ra.property_management_company_id is not null
          and public.is_active_property_manager_member(ra.property_management_company_id)
        )
      )
  )
$$;

create or replace function public.has_permission(
  permission_name text,
  target_organization_id uuid default null,
  target_company_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  profile_uuid uuid := public.current_profile_id();
  denied boolean;
  allowed boolean;
begin
  if profile_uuid is null then
    return false;
  end if;

  -- These boundaries cannot be expanded with an override.
  if permission_name in ('view_raw_costs', 'manage_integrations', 'manage_roles') then
    return public.has_role('super_admin', target_organization_id)
      or public.has_role('owner_admin', target_organization_id);
  end if;

  select exists (
    select 1
    from public.permission_overrides po
    join public.organization_members om on om.id = po.organization_member_id
    where om.profile_id = profile_uuid
      and om.status = 'active'
      and (target_organization_id is null or om.organization_id = target_organization_id)
      and po.permission_key = permission_name
      and po.effect = 'deny'
      and po.revoked_at is null
      and (po.expires_at is null or po.expires_at > now())
  ) into denied;

  if denied then
    return false;
  end if;

  select exists (
    select 1
    from public.permission_overrides po
    join public.organization_members om on om.id = po.organization_member_id
    where om.profile_id = profile_uuid
      and om.status = 'active'
      and (target_organization_id is null or om.organization_id = target_organization_id)
      and po.permission_key = permission_name
      and po.effect = 'allow'
      and po.revoked_at is null
      and (po.expires_at is null or po.expires_at > now())
  ) into allowed;

  if allowed then
    return true;
  end if;

  return case permission_name
    when 'internal_access' then
      public.has_role('super_admin', target_organization_id)
      or public.has_role('owner_admin', target_organization_id)
      or public.has_role('sales_manager', target_organization_id)
      or public.has_role('sales_staff', target_organization_id)
      or public.has_role('warehouse', target_organization_id)
      or public.has_role('delivery_technician', target_organization_id)
      or public.has_role('technician', target_organization_id)
    when 'view_inventory' then
      public.has_permission('internal_access', target_organization_id)
    when 'manage_inventory' then
      public.has_role('super_admin', target_organization_id)
      or public.has_role('owner_admin', target_organization_id)
      or public.has_role('sales_manager', target_organization_id)
      or public.has_role('sales_staff', target_organization_id)
      or public.has_role('warehouse', target_organization_id)
    when 'view_customers' then
      public.has_role('super_admin', target_organization_id)
      or public.has_role('owner_admin', target_organization_id)
      or public.has_role('sales_manager', target_organization_id)
      or public.has_role('sales_staff', target_organization_id)
    when 'manage_customers' then
      public.has_permission('view_customers', target_organization_id)
    when 'view_sales' then
      public.has_role('super_admin', target_organization_id)
      or public.has_role('owner_admin', target_organization_id)
      or public.has_role('sales_manager', target_organization_id)
      or public.has_role('sales_staff', target_organization_id)
    when 'manage_sales' then
      public.has_permission('view_sales', target_organization_id)
    when 'view_operations' then
      public.has_permission('internal_access', target_organization_id)
    when 'manage_operations' then
      public.has_role('super_admin', target_organization_id)
      or public.has_role('owner_admin', target_organization_id)
      or public.has_role('sales_manager', target_organization_id)
      or public.has_role('sales_staff', target_organization_id)
      or public.has_role('warehouse', target_organization_id)
    when 'view_assigned_work' then
      public.has_role('delivery_technician', target_organization_id)
      or public.has_role('technician', target_organization_id)
    when 'manage_users' then
      public.has_role('super_admin', target_organization_id)
      or public.has_role('owner_admin', target_organization_id)
    when 'view_reports' then
      public.has_role('super_admin', target_organization_id)
      or public.has_role('owner_admin', target_organization_id)
      or public.has_role('sales_manager', target_organization_id)
    when 'view_investor_summary' then
      public.has_role('super_admin', target_organization_id)
      or public.has_role('owner_admin', target_organization_id)
      or public.has_role('investor_viewer', target_organization_id)
    when 'property_manager_access' then
      target_company_id is not null and public.is_active_property_manager_member(target_company_id)
      and (
        public.has_role('property_manager_admin', target_organization_id, target_company_id)
        or public.has_role('property_manager_staff', target_organization_id, target_company_id)
      )
    when 'manage_property_manager_team' then
      target_company_id is not null and public.is_active_property_manager_member(target_company_id)
      and public.has_role('property_manager_admin', target_organization_id, target_company_id)
    else false
  end;
end;
$$;

create or replace function public.can_access_property_company(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.property_management_companies c
    where c.id = target_company_id
      and public.has_permission('property_manager_access', c.organization_id, c.id)
  )
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organizations', 'locations', 'profiles', 'organization_members',
    'property_management_companies', 'property_manager_contacts',
    'property_manager_members', 'properties', 'property_units', 'customers',
    'customer_addresses', 'customer_contacts', 'customer_tags', 'inventory_locations',
    'appliances', 'appliance_costs', 'reservations', 'sales', 'payments', 'warranties',
    'service_requests', 'repair_jobs', 'suppliers', 'purchase_orders', 'tasks',
    'integration_connections', 'legacy_record_mappings'
  ] loop
    execute format(
      'create trigger %I_touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',
      table_name,
      table_name
    );
  end loop;
end $$;

-- All application tables deny access until an explicit policy below succeeds.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organizations', 'locations', 'profiles', 'organization_members',
    'role_assignments', 'permission_overrides', 'invitations', 'activity_log',
    'property_management_companies', 'property_manager_contacts',
    'property_manager_members', 'properties', 'property_units', 'customers',
    'customer_addresses', 'customer_contacts', 'customer_notes', 'customer_tags',
    'customer_tag_assignments', 'inventory_locations', 'appliances',
    'appliance_photos', 'appliance_status_history', 'appliance_costs',
    'reservations', 'sales', 'sale_items', 'payments', 'refunds', 'deliveries',
    'delivery_status_history', 'warranties', 'warranty_events', 'service_requests',
    'repair_jobs', 'repair_parts', 'suppliers', 'purchase_orders', 'tasks',
    'task_comments', 'integration_connections', 'webhook_events', 'import_batches',
    'legacy_record_mappings', 'import_errors', 'stored_files'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on public.%I from anon', table_name);
    execute format('revoke all on public.%I from authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end $$;

revoke insert, update, delete on public.activity_log from authenticated;

-- Identity and organization policies.
create policy organizations_member_select on public.organizations for select to authenticated
using (public.is_active_organization_member(id));

create policy locations_member_select on public.locations for select to authenticated
using (public.is_active_organization_member(organization_id));
create policy locations_admin_manage on public.locations for all to authenticated
using (public.has_permission('manage_users', organization_id))
with check (public.has_permission('manage_users', organization_id));

create policy profiles_self_select on public.profiles for select to authenticated
using (id = public.current_profile_id());
create policy profiles_admin_select on public.profiles for select to authenticated
using (exists (
  select 1 from public.organization_members target
  where target.profile_id = profiles.id
    and public.has_permission('manage_users', target.organization_id)
));
create policy profiles_admin_update on public.profiles for update to authenticated
using (exists (
  select 1 from public.organization_members target
  where target.profile_id = profiles.id
    and public.has_permission('manage_users', target.organization_id)
))
with check (exists (
  select 1 from public.organization_members target
  where target.profile_id = profiles.id
    and public.has_permission('manage_users', target.organization_id)
));

create policy organization_members_self_select on public.organization_members for select to authenticated
using (profile_id = public.current_profile_id());
create policy organization_members_admin_manage on public.organization_members for all to authenticated
using (public.has_permission('manage_users', organization_id))
with check (public.has_permission('manage_users', organization_id));

create policy role_assignments_self_select on public.role_assignments for select to authenticated
using (exists (
  select 1 from public.organization_members om
  where om.id = role_assignments.organization_member_id
    and om.profile_id = public.current_profile_id()
));
create policy role_assignments_admin_manage on public.role_assignments for all to authenticated
using (exists (
  select 1 from public.organization_members om
  where om.id = role_assignments.organization_member_id
    and public.has_permission('manage_roles', om.organization_id)
))
with check (exists (
  select 1 from public.organization_members om
  where om.id = role_assignments.organization_member_id
    and public.has_permission('manage_roles', om.organization_id)
));

create policy permission_overrides_self_select on public.permission_overrides for select to authenticated
using (exists (
  select 1 from public.organization_members om
  where om.id = permission_overrides.organization_member_id
    and om.profile_id = public.current_profile_id()
));
create policy permission_overrides_admin_manage on public.permission_overrides for all to authenticated
using (exists (
  select 1 from public.organization_members om
  where om.id = permission_overrides.organization_member_id
    and public.has_permission('manage_roles', om.organization_id)
))
with check (exists (
  select 1 from public.organization_members om
  where om.id = permission_overrides.organization_member_id
    and public.has_permission('manage_roles', om.organization_id)
));

create policy invitations_admin_manage on public.invitations for all to authenticated
using (public.has_permission('manage_users', organization_id))
with check (
  public.has_permission('manage_users', organization_id)
  and intended_role not in ('super_admin', 'owner_admin')
  or public.has_role('super_admin', organization_id)
);

create policy activity_log_owner_select on public.activity_log for select to authenticated
using (
  organization_id is not null
  and (public.has_role('super_admin', organization_id) or public.has_role('owner_admin', organization_id))
);

-- Property-manager tenant policies.
create policy pm_companies_staff_select on public.property_management_companies for select to authenticated
using (public.is_active_organization_member(organization_id));
create policy pm_companies_tenant_select on public.property_management_companies for select to authenticated
using (public.can_access_property_company(id));
create policy pm_companies_admin_manage on public.property_management_companies for all to authenticated
using (public.has_permission('manage_operations', organization_id))
with check (public.has_permission('manage_operations', organization_id));

create policy pm_contacts_staff_manage on public.property_manager_contacts for all to authenticated
using (exists (
  select 1 from public.property_management_companies c
  where c.id = property_manager_contacts.property_management_company_id
    and public.has_permission('manage_operations', c.organization_id)
))
with check (exists (
  select 1 from public.property_management_companies c
  where c.id = property_manager_contacts.property_management_company_id
    and public.has_permission('manage_operations', c.organization_id)
));
create policy pm_contacts_tenant_select on public.property_manager_contacts for select to authenticated
using (public.can_access_property_company(property_management_company_id));
create policy pm_contacts_tenant_admin_manage on public.property_manager_contacts for all to authenticated
using (public.has_permission('manage_property_manager_team', null, property_management_company_id))
with check (public.has_permission('manage_property_manager_team', null, property_management_company_id));

create policy pm_members_self_select on public.property_manager_members for select to authenticated
using (profile_id = public.current_profile_id());
create policy pm_members_staff_manage on public.property_manager_members for all to authenticated
using (exists (
  select 1 from public.property_management_companies c
  where c.id = property_manager_members.property_management_company_id
    and public.has_permission('manage_users', c.organization_id)
))
with check (exists (
  select 1 from public.property_management_companies c
  where c.id = property_manager_members.property_management_company_id
    and public.has_permission('manage_users', c.organization_id)
));
create policy pm_members_tenant_admin_select on public.property_manager_members for select to authenticated
using (public.has_permission('manage_property_manager_team', null, property_management_company_id));

create policy properties_staff_manage on public.properties for all to authenticated
using (exists (
  select 1 from public.property_management_companies c
  where c.id = properties.property_management_company_id
    and public.has_permission('manage_operations', c.organization_id)
))
with check (exists (
  select 1 from public.property_management_companies c
  where c.id = properties.property_management_company_id
    and public.has_permission('manage_operations', c.organization_id)
));
create policy properties_tenant_select on public.properties for select to authenticated
using (public.can_access_property_company(property_management_company_id));

create policy property_units_staff_manage on public.property_units for all to authenticated
using (exists (
  select 1 from public.properties p
  join public.property_management_companies c on c.id = p.property_management_company_id
  where p.id = property_units.property_id
    and public.has_permission('manage_operations', c.organization_id)
))
with check (exists (
  select 1 from public.properties p
  join public.property_management_companies c on c.id = p.property_management_company_id
  where p.id = property_units.property_id
    and public.has_permission('manage_operations', c.organization_id)
));
create policy property_units_tenant_select on public.property_units for select to authenticated
using (exists (
  select 1 from public.properties p
  where p.id = property_units.property_id
    and public.can_access_property_company(p.property_management_company_id)
));

-- CRM is never directly selectable by delivery, technician, PM, or investor roles.
create policy customers_staff_manage on public.customers for all to authenticated
using (public.has_permission('manage_customers', organization_id))
with check (public.has_permission('manage_customers', organization_id));

create policy customer_addresses_staff_manage on public.customer_addresses for all to authenticated
using (exists (select 1 from public.customers c where c.id = customer_addresses.customer_id and public.has_permission('manage_customers', c.organization_id)))
with check (exists (select 1 from public.customers c where c.id = customer_addresses.customer_id and public.has_permission('manage_customers', c.organization_id)));
create policy customer_contacts_staff_manage on public.customer_contacts for all to authenticated
using (exists (select 1 from public.customers c where c.id = customer_contacts.customer_id and public.has_permission('manage_customers', c.organization_id)))
with check (exists (select 1 from public.customers c where c.id = customer_contacts.customer_id and public.has_permission('manage_customers', c.organization_id)));
create policy customer_notes_staff_manage on public.customer_notes for all to authenticated
using (exists (select 1 from public.customers c where c.id = customer_notes.customer_id and public.has_permission('manage_customers', c.organization_id)))
with check (exists (select 1 from public.customers c where c.id = customer_notes.customer_id and public.has_permission('manage_customers', c.organization_id)));
create policy customer_tags_staff_manage on public.customer_tags for all to authenticated
using (public.has_permission('manage_customers', organization_id))
with check (public.has_permission('manage_customers', organization_id));
create policy customer_tag_assignments_staff_manage on public.customer_tag_assignments for all to authenticated
using (exists (select 1 from public.customers c where c.id = customer_tag_assignments.customer_id and public.has_permission('manage_customers', c.organization_id)))
with check (exists (select 1 from public.customers c where c.id = customer_tag_assignments.customer_id and public.has_permission('manage_customers', c.organization_id)));

-- Public inventory receives a deliberately narrow table projection through an
-- RPC below. Base appliances remain authenticated-only.
create policy inventory_locations_staff_select on public.inventory_locations for select to authenticated
using (public.has_permission('view_inventory', organization_id));
create policy inventory_locations_staff_manage on public.inventory_locations for all to authenticated
using (public.has_permission('manage_inventory', organization_id))
with check (public.has_permission('manage_inventory', organization_id));

create policy appliances_staff_select on public.appliances for select to authenticated
using (public.has_permission('view_inventory', organization_id));
create policy appliances_staff_manage on public.appliances for all to authenticated
using (public.has_permission('manage_inventory', organization_id))
with check (public.has_permission('manage_inventory', organization_id));
create policy appliances_pm_select on public.appliances for select to authenticated
using (status = 'available' and public_visibility and archived_at is null and exists (
  select 1 from public.property_manager_members pmm
  where pmm.profile_id = public.current_profile_id()
    and pmm.status = 'active'
    and public.can_access_property_company(pmm.property_management_company_id)
));

create policy appliance_photos_staff_manage on public.appliance_photos for all to authenticated
using (exists (select 1 from public.appliances a where a.id = appliance_photos.appliance_id and public.has_permission('manage_inventory', a.organization_id)))
with check (exists (select 1 from public.appliances a where a.id = appliance_photos.appliance_id and public.has_permission('manage_inventory', a.organization_id)));
create policy appliance_photos_pm_select on public.appliance_photos for select to authenticated
using (public_eligible and archived_at is null and exists (
  select 1 from public.appliances a where a.id = appliance_photos.appliance_id
    and a.status = 'available' and a.public_visibility and a.archived_at is null
));

create policy appliance_history_staff_select on public.appliance_status_history for select to authenticated
using (exists (select 1 from public.appliances a where a.id = appliance_status_history.appliance_id and public.has_permission('view_inventory', a.organization_id)));
create policy appliance_history_staff_insert on public.appliance_status_history for insert to authenticated
with check (exists (select 1 from public.appliances a where a.id = appliance_status_history.appliance_id and public.has_permission('manage_inventory', a.organization_id)));

create policy appliance_costs_owner_manage on public.appliance_costs for all to authenticated
using (exists (select 1 from public.appliances a where a.id = appliance_costs.appliance_id and public.has_permission('view_raw_costs', a.organization_id)))
with check (exists (select 1 from public.appliances a where a.id = appliance_costs.appliance_id and public.has_permission('view_raw_costs', a.organization_id)));

-- Commerce policies.
create policy reservations_staff_manage on public.reservations for all to authenticated
using (public.has_permission('manage_sales', organization_id))
with check (public.has_permission('manage_sales', organization_id));
create policy reservations_pm_select on public.reservations for select to authenticated
using (property_management_company_id is not null and public.can_access_property_company(property_management_company_id));
create policy reservations_pm_insert on public.reservations for insert to authenticated
with check (property_management_company_id is not null and public.can_access_property_company(property_management_company_id) and status = 'requested');

create policy sales_staff_manage on public.sales for all to authenticated
using (public.has_permission('manage_sales', organization_id))
with check (public.has_permission('manage_sales', organization_id));
create policy sales_pm_select on public.sales for select to authenticated
using (property_management_company_id is not null and public.can_access_property_company(property_management_company_id));
create policy sale_items_staff_select on public.sale_items for select to authenticated
using (exists (select 1 from public.sales s where s.id = sale_items.sale_id and public.has_permission('view_sales', s.organization_id)));
create policy sale_items_staff_manage on public.sale_items for all to authenticated
using (exists (select 1 from public.sales s where s.id = sale_items.sale_id and public.has_permission('manage_sales', s.organization_id)))
with check (exists (select 1 from public.sales s where s.id = sale_items.sale_id and public.has_permission('manage_sales', s.organization_id)));
create policy sale_items_pm_select on public.sale_items for select to authenticated
using (exists (select 1 from public.sales s where s.id = sale_items.sale_id and s.property_management_company_id is not null and public.can_access_property_company(s.property_management_company_id)));

create policy payments_staff_select on public.payments for select to authenticated
using (public.has_permission('view_sales', organization_id));
create policy payments_owner_manage on public.payments for all to authenticated
using (public.has_role('super_admin', organization_id) or public.has_role('owner_admin', organization_id))
with check (public.has_role('super_admin', organization_id) or public.has_role('owner_admin', organization_id));
create policy payments_pm_select on public.payments for select to authenticated
using (property_management_company_id is not null and public.can_access_property_company(property_management_company_id));
create policy refunds_owner_manage on public.refunds for all to authenticated
using (exists (select 1 from public.payments p where p.id = refunds.payment_id and (public.has_role('super_admin', p.organization_id) or public.has_role('owner_admin', p.organization_id))))
with check (exists (select 1 from public.payments p where p.id = refunds.payment_id and (public.has_role('super_admin', p.organization_id) or public.has_role('owner_admin', p.organization_id))));

-- Operations: staff, assignee, and tenant paths are separate.
create policy deliveries_staff_manage on public.deliveries for all to authenticated
using (public.has_permission('manage_operations', organization_id))
with check (public.has_permission('manage_operations', organization_id));
create policy deliveries_assignee_select on public.deliveries for select to authenticated
using (assigned_profile_id = public.current_profile_id());
create policy deliveries_assignee_update on public.deliveries for update to authenticated
using (assigned_profile_id = public.current_profile_id())
with check (assigned_profile_id = public.current_profile_id());
create policy deliveries_pm_select on public.deliveries for select to authenticated
using (property_management_company_id is not null and public.can_access_property_company(property_management_company_id));

create policy delivery_history_access on public.delivery_status_history for select to authenticated
using (exists (select 1 from public.deliveries d where d.id = delivery_status_history.delivery_id and (public.has_permission('view_operations', d.organization_id) or d.assigned_profile_id = public.current_profile_id() or (d.property_management_company_id is not null and public.can_access_property_company(d.property_management_company_id)))));
create policy delivery_history_insert on public.delivery_status_history for insert to authenticated
with check (exists (select 1 from public.deliveries d where d.id = delivery_status_history.delivery_id and (public.has_permission('manage_operations', d.organization_id) or d.assigned_profile_id = public.current_profile_id())));

create policy warranties_staff_manage on public.warranties for all to authenticated
using (public.has_permission('manage_operations', organization_id))
with check (public.has_permission('manage_operations', organization_id));
create policy warranties_pm_select on public.warranties for select to authenticated
using (property_management_company_id is not null and public.can_access_property_company(property_management_company_id));
create policy warranty_events_staff_manage on public.warranty_events for all to authenticated
using (exists (select 1 from public.warranties w where w.id = warranty_events.warranty_id and public.has_permission('manage_operations', w.organization_id)))
with check (exists (select 1 from public.warranties w where w.id = warranty_events.warranty_id and public.has_permission('manage_operations', w.organization_id)));
create policy warranty_events_pm_select on public.warranty_events for select to authenticated
using (internal_notes is null and exists (select 1 from public.warranties w where w.id = warranty_events.warranty_id and w.property_management_company_id is not null and public.can_access_property_company(w.property_management_company_id)));

create policy service_requests_staff_manage on public.service_requests for all to authenticated
using (public.has_permission('manage_operations', organization_id))
with check (public.has_permission('manage_operations', organization_id));
create policy service_requests_pm_manage on public.service_requests for all to authenticated
using (property_management_company_id is not null and public.can_access_property_company(property_management_company_id))
with check (property_management_company_id is not null and public.can_access_property_company(property_management_company_id));
create policy service_requests_assignee_select on public.service_requests for select to authenticated
using (exists (select 1 from public.repair_jobs rj where rj.service_request_id = service_requests.id and rj.assigned_profile_id = public.current_profile_id()));

create policy repair_jobs_staff_manage on public.repair_jobs for all to authenticated
using (exists (select 1 from public.service_requests sr where sr.id = repair_jobs.service_request_id and public.has_permission('manage_operations', sr.organization_id)))
with check (exists (select 1 from public.service_requests sr where sr.id = repair_jobs.service_request_id and public.has_permission('manage_operations', sr.organization_id)));
create policy repair_jobs_assignee_manage on public.repair_jobs for all to authenticated
using (assigned_profile_id = public.current_profile_id())
with check (assigned_profile_id = public.current_profile_id());
create policy repair_jobs_pm_select on public.repair_jobs for select to authenticated
using (internal_notes is null and exists (select 1 from public.service_requests sr where sr.id = repair_jobs.service_request_id and sr.property_management_company_id is not null and public.can_access_property_company(sr.property_management_company_id)));

create policy repair_parts_access on public.repair_parts for select to authenticated
using (exists (select 1 from public.repair_jobs rj join public.service_requests sr on sr.id = rj.service_request_id where rj.id = repair_parts.repair_job_id and (public.has_permission('view_operations', sr.organization_id) or rj.assigned_profile_id = public.current_profile_id() or (sr.property_management_company_id is not null and public.can_access_property_company(sr.property_management_company_id)))));
create policy repair_parts_staff_manage on public.repair_parts for all to authenticated
using (exists (select 1 from public.repair_jobs rj join public.service_requests sr on sr.id = rj.service_request_id where rj.id = repair_parts.repair_job_id and (public.has_permission('manage_operations', sr.organization_id) or rj.assigned_profile_id = public.current_profile_id())))
with check (exists (select 1 from public.repair_jobs rj join public.service_requests sr on sr.id = rj.service_request_id where rj.id = repair_parts.repair_job_id and (public.has_permission('manage_operations', sr.organization_id) or rj.assigned_profile_id = public.current_profile_id())));

create policy suppliers_owner_manage on public.suppliers for all to authenticated
using (public.has_permission('view_raw_costs', organization_id))
with check (public.has_permission('view_raw_costs', organization_id));
create policy purchase_orders_owner_manage on public.purchase_orders for all to authenticated
using (public.has_permission('view_raw_costs', organization_id))
with check (public.has_permission('view_raw_costs', organization_id));

create policy tasks_staff_manage on public.tasks for all to authenticated
using (public.has_permission('internal_access', organization_id) and (assigned_profile_id = public.current_profile_id() or created_by_profile_id = public.current_profile_id() or public.has_permission('manage_operations', organization_id)))
with check (public.has_permission('internal_access', organization_id));
create policy tasks_pm_select on public.tasks for select to authenticated
using (visible_to_property_manager and property_management_company_id is not null and public.can_access_property_company(property_management_company_id));
create policy task_comments_staff_manage on public.task_comments for all to authenticated
using (exists (select 1 from public.tasks t where t.id = task_comments.task_id and public.has_permission('internal_access', t.organization_id)))
with check (exists (select 1 from public.tasks t where t.id = task_comments.task_id and public.has_permission('internal_access', t.organization_id)));
create policy task_comments_pm_select on public.task_comments for select to authenticated
using (visible_to_property_manager and exists (select 1 from public.tasks t where t.id = task_comments.task_id and t.property_management_company_id is not null and public.can_access_property_company(t.property_management_company_id)));

-- Integrations/imports are owner-only. Import metadata must already be redacted.
create policy integrations_owner_manage on public.integration_connections for all to authenticated
using (public.has_permission('manage_integrations', organization_id))
with check (public.has_permission('manage_integrations', organization_id));
create policy webhook_events_owner_manage on public.webhook_events for all to authenticated
using (integration_connection_id is null or exists (select 1 from public.integration_connections ic where ic.id = webhook_events.integration_connection_id and public.has_permission('manage_integrations', ic.organization_id)))
with check (integration_connection_id is null or exists (select 1 from public.integration_connections ic where ic.id = webhook_events.integration_connection_id and public.has_permission('manage_integrations', ic.organization_id)));
create policy import_batches_owner_manage on public.import_batches for all to authenticated
using (public.has_permission('manage_integrations', organization_id))
with check (public.has_permission('manage_integrations', organization_id));
create policy legacy_mappings_owner_manage on public.legacy_record_mappings for all to authenticated
using (import_batch_id is not null and exists (select 1 from public.import_batches ib where ib.id = legacy_record_mappings.import_batch_id and public.has_permission('manage_integrations', ib.organization_id)))
with check (import_batch_id is not null and exists (select 1 from public.import_batches ib where ib.id = legacy_record_mappings.import_batch_id and public.has_permission('manage_integrations', ib.organization_id)));
create policy import_errors_owner_manage on public.import_errors for all to authenticated
using (exists (select 1 from public.import_batches ib where ib.id = import_errors.import_batch_id and public.has_permission('manage_integrations', ib.organization_id)))
with check (exists (select 1 from public.import_batches ib where ib.id = import_errors.import_batch_id and public.has_permission('manage_integrations', ib.organization_id)));

create policy stored_files_internal_manage on public.stored_files for all to authenticated
using (organization_id is not null and public.has_permission('internal_access', organization_id))
with check (organization_id is not null and public.has_permission('internal_access', organization_id));
create policy stored_files_company_access on public.stored_files for select to authenticated
using (property_management_company_id is not null and public.can_access_property_company(property_management_company_id));
create policy stored_files_owner_access on public.stored_files for all to authenticated
using (owner_profile_id = public.current_profile_id())
with check (owner_profile_id = public.current_profile_id());

-- Invitation acceptance is the only onboarding path. The caller must already
-- hold a Supabase session created from the emailed invite and the emails match.
create or replace function public.accept_invitation(invitation_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_row public.invitations%rowtype;
  profile_uuid uuid;
  member_uuid uuid;
  authenticated_email text := auth.jwt() ->> 'email';
begin
  if auth.uid() is null or authenticated_email is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into invitation_row
  from public.invitations
  where token_hash = invitation_token_hash
  for update;

  if invitation_row.id is null or invitation_row.status <> 'pending' then
    raise exception 'invitation is invalid' using errcode = '22023';
  end if;
  if invitation_row.expires_at <= now() then
    update public.invitations set status = 'expired' where id = invitation_row.id;
    raise exception 'invitation has expired' using errcode = '22023';
  end if;
  if lower(invitation_row.email::text) <> lower(authenticated_email) then
    raise exception 'invitation email mismatch' using errcode = '42501';
  end if;

  profile_uuid := invitation_row.pending_profile_id;
  if profile_uuid is null then
    insert into public.profiles (auth_user_id, display_name, status)
    values (auth.uid(), split_part(authenticated_email, '@', 1), 'active')
    returning id into profile_uuid;
  else
    update public.profiles
    set auth_user_id = auth.uid(), status = 'active', disabled_at = null, disabled_reason = null
    where id = profile_uuid and status = 'pending';
    if not found then
      raise exception 'pending profile cannot be activated' using errcode = '22023';
    end if;
  end if;

  insert into public.organization_members (organization_id, profile_id, member_kind, status, started_at)
  values (
    invitation_row.organization_id,
    profile_uuid,
    case when invitation_row.intended_role = 'investor_viewer' then 'investor' else 'employee' end,
    'active',
    now()
  )
  on conflict (organization_id, profile_id) do update
    set status = 'active', started_at = coalesce(public.organization_members.started_at, now())
  returning id into member_uuid;

  if invitation_row.property_management_company_id is not null then
    insert into public.property_manager_members (property_management_company_id, profile_id, status, invited_by_profile_id)
    values (invitation_row.property_management_company_id, profile_uuid, 'active', invitation_row.invited_by_profile_id)
    on conflict (property_management_company_id, profile_id) do update set status = 'active';
  end if;

  insert into public.role_assignments (
    organization_member_id,
    role,
    property_management_company_id,
    granted_by_profile_id
  ) values (
    member_uuid,
    invitation_row.intended_role,
    invitation_row.property_management_company_id,
    invitation_row.invited_by_profile_id
  );

  update public.invitations
  set status = 'accepted', accepted_at = now(), accepted_by_profile_id = profile_uuid
  where id = invitation_row.id;

  insert into public.activity_log (
    actor_profile_id, action, entity_type, entity_id, organization_id,
    property_management_company_id, after_metadata
  ) values (
    profile_uuid, 'invitation.accepted', 'invitation', invitation_row.id,
    invitation_row.organization_id, invitation_row.property_management_company_id,
    jsonb_build_object('role', invitation_row.intended_role)
  );

  return profile_uuid;
end;
$$;

revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;

create or replace function public.expire_invitations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_count integer;
begin
  update public.invitations
  set status = 'expired'
  where status = 'pending' and expires_at <= now();
  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

revoke all on function public.expire_invitations() from public, anon, authenticated;
grant execute on function public.expire_invitations() to service_role;

-- A deliberately narrow public inventory contract. No serial, notes, acquisition
-- source, minimum price, legacy metadata, location details, or costs are returned.
create or replace function public.list_public_appliances()
returns table (
  id uuid,
  inventory_number text,
  qr_lookup_id text,
  category text,
  brand text,
  model text,
  color text,
  finish text,
  width_inches numeric,
  fuel_type text,
  condition text,
  public_description text,
  public_price_cents bigint,
  currency text,
  available_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id, a.inventory_number, a.qr_lookup_id, a.category, a.brand, a.model,
    a.color, a.finish, a.width_inches, a.fuel_type, a.condition,
    a.public_description, a.public_price_cents, a.currency, a.available_at
  from public.appliances a
  where a.status = 'available'
    and a.public_visibility = true
    and a.archived_at is null
  order by a.available_at desc nulls last, a.created_at desc
$$;

grant execute on function public.list_public_appliances() to anon, authenticated;

-- Assigned workers get contact details only through this scoped function, never
-- through direct CRM-table access.
create or replace function public.list_my_assigned_work_contacts()
returns table (
  work_type text,
  work_id uuid,
  contact_name text,
  contact_phone text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  scheduled_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    'delivery'::text,
    d.id,
    d.customer_contact_name,
    d.customer_contact_phone,
    coalesce(ca.address_line_1, p.address_line_1),
    coalesce(ca.address_line_2, p.address_line_2),
    coalesce(ca.city, p.city),
    coalesce(ca.state, p.state),
    coalesce(ca.postal_code, p.postal_code),
    d.scheduled_start
  from public.deliveries d
  left join public.customer_addresses ca on ca.id = d.delivery_address_id
  left join public.properties p on p.id = d.property_id
  where d.assigned_profile_id = public.current_profile_id()
    and d.archived_at is null
    and public.has_permission('view_assigned_work', d.organization_id)
  union all
  select
    'repair'::text,
    rj.id,
    sr.tenant_contact_name,
    sr.tenant_contact_phone,
    p.address_line_1,
    p.address_line_2,
    p.city,
    p.state,
    p.postal_code,
    rj.scheduled_at
  from public.repair_jobs rj
  join public.service_requests sr on sr.id = rj.service_request_id
  left join public.properties p on p.id = sr.property_id
  where rj.assigned_profile_id = public.current_profile_id()
    and rj.archived_at is null
    and public.has_permission('view_assigned_work', sr.organization_id)
$$;

revoke all on function public.list_my_assigned_work_contacts() from public, anon;
grant execute on function public.list_my_assigned_work_contacts() to authenticated;

create or replace function public.get_investor_summary(target_organization_id uuid)
returns table (
  confirmed_revenue_cents bigint,
  estimated_gross_profit_cents bigint,
  gross_margin_percent numeric,
  inventory_value_cents bigint,
  available_inventory_units bigint,
  units_sold bigint,
  average_transaction_cents bigint,
  retail_revenue_cents bigint,
  property_manager_revenue_cents bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('view_investor_summary', target_organization_id) then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  return query
  with revenue as (
    select
      coalesce(sum(s.total_cents) filter (where s.status in ('confirmed', 'completed')), 0)::bigint as total,
      count(*) filter (where s.status in ('confirmed', 'completed'))::bigint as transactions,
      coalesce(sum(s.total_cents) filter (where s.status in ('confirmed', 'completed') and s.property_management_company_id is null), 0)::bigint as retail,
      coalesce(sum(s.total_cents) filter (where s.status in ('confirmed', 'completed') and s.property_management_company_id is not null), 0)::bigint as pm
    from public.sales s
    where s.organization_id = target_organization_id and s.archived_at is null
  ), costs as (
    select coalesce(sum(ac.amount_cents), 0)::bigint as total
    from public.appliance_costs ac
    join public.appliances a on a.id = ac.appliance_id
    where a.organization_id = target_organization_id and ac.archived_at is null
  ), inventory as (
    select
      coalesce(sum(a.public_price_cents) filter (where a.status = 'available'), 0)::bigint as value,
      count(*) filter (where a.status = 'available')::bigint as available,
      count(*) filter (where a.status = 'sold')::bigint as sold
    from public.appliances a
    where a.organization_id = target_organization_id and a.archived_at is null
  )
  select
    revenue.total,
    (revenue.total - costs.total)::bigint,
    case when revenue.total = 0 then 0::numeric else round(((revenue.total - costs.total)::numeric / revenue.total::numeric) * 100, 2) end,
    inventory.value,
    inventory.available,
    inventory.sold,
    case when revenue.transactions = 0 then 0 else (revenue.total / revenue.transactions)::bigint end,
    revenue.retail,
    revenue.pm
  from revenue, costs, inventory;
end;
$$;

revoke all on function public.get_investor_summary(uuid) from public, anon;
grant execute on function public.get_investor_summary(uuid) to authenticated;

-- Audit selected high-risk changes without copying sensitive rows wholesale.
create or replace function public.audit_sensitive_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_uuid uuid := public.current_profile_id();
  entity_uuid uuid;
  org_uuid uuid;
  safe_before jsonb := '{}'::jsonb;
  safe_after jsonb := '{}'::jsonb;
begin
  entity_uuid := coalesce(new.id, old.id);
  if tg_table_name = 'appliances' then
    org_uuid := coalesce(new.organization_id, old.organization_id);
    safe_before := case when tg_op = 'INSERT' then '{}'::jsonb else jsonb_build_object('status', old.status, 'public_price_cents', old.public_price_cents, 'location_id', old.inventory_location_id) end;
    safe_after := case when tg_op = 'DELETE' then '{}'::jsonb else jsonb_build_object('status', new.status, 'public_price_cents', new.public_price_cents, 'location_id', new.inventory_location_id) end;
  elsif tg_table_name = 'appliance_costs' then
    select a.organization_id into org_uuid from public.appliances a where a.id = coalesce(new.appliance_id, old.appliance_id);
    safe_before := case when tg_op = 'INSERT' then '{}'::jsonb else jsonb_build_object('cost_type', old.cost_type, 'amount_cents', old.amount_cents) end;
    safe_after := case when tg_op = 'DELETE' then '{}'::jsonb else jsonb_build_object('cost_type', new.cost_type, 'amount_cents', new.amount_cents) end;
  elsif tg_table_name = 'invitations' then
    org_uuid := coalesce(new.organization_id, old.organization_id);
    safe_before := case when tg_op = 'INSERT' then '{}'::jsonb else jsonb_build_object('status', old.status, 'role', old.intended_role) end;
    safe_after := case when tg_op = 'DELETE' then '{}'::jsonb else jsonb_build_object('status', new.status, 'role', new.intended_role) end;
  elsif tg_table_name = 'role_assignments' then
    select om.organization_id into org_uuid from public.organization_members om where om.id = coalesce(new.organization_member_id, old.organization_member_id);
    safe_before := case when tg_op = 'INSERT' then '{}'::jsonb else jsonb_build_object('role', old.role, 'revoked', old.revoked_at is not null) end;
    safe_after := case when tg_op = 'DELETE' then '{}'::jsonb else jsonb_build_object('role', new.role, 'revoked', new.revoked_at is not null) end;
  end if;

  insert into public.activity_log (
    actor_profile_id, action, entity_type, entity_id, organization_id,
    before_metadata, after_metadata
  ) values (
    profile_uuid, lower(tg_table_name || '.' || tg_op), tg_table_name,
    entity_uuid, org_uuid, safe_before, safe_after
  );

  return coalesce(new, old);
end;
$$;

create trigger appliances_audit after insert or update or delete on public.appliances
for each row execute function public.audit_sensitive_change();
create trigger appliance_costs_audit after insert or update or delete on public.appliance_costs
for each row execute function public.audit_sensitive_change();
create trigger invitations_audit after insert or update or delete on public.invitations
for each row execute function public.audit_sensitive_change();
create trigger role_assignments_audit after insert or update or delete on public.role_assignments
for each row execute function public.audit_sensitive_change();

-- Storage is private by default. Public reads are limited to eligible photos for
-- currently available appliances. Operational buckets require linked metadata.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('appliance-photos', 'appliance-photos', false, 20971520, array['image/jpeg', 'image/png', 'image/webp']),
  ('service-request-photos', 'service-request-photos', false, 20971520, array['image/jpeg', 'image/png', 'image/webp']),
  ('repair-photos', 'repair-photos', false, 20971520, array['image/jpeg', 'image/png', 'image/webp']),
  ('delivery-proof', 'delivery-proof', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('user-avatars', 'user-avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('company-documents', 'company-documents', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

grant usage on schema storage to anon, authenticated;
grant select on storage.objects to anon, authenticated;
grant insert, update, delete on storage.objects to authenticated;

create or replace function public.is_public_appliance_photo(target_object_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.appliance_photos ap
    join public.appliances a on a.id = ap.appliance_id
    where ap.object_path = target_object_path
      and ap.public_eligible = true
      and ap.archived_at is null
      and a.status = 'available'
      and a.public_visibility = true
      and a.archived_at is null
  )
$$;

grant execute on function public.is_public_appliance_photo(text) to anon, authenticated;

create policy appliance_photos_public_read on storage.objects for select to anon, authenticated
using (
  bucket_id = 'appliance-photos'
  and public.is_public_appliance_photo(storage.objects.name)
);

create policy storage_internal_read on storage.objects for select to authenticated
using (exists (
  select 1 from public.stored_files sf
  where sf.bucket_id = storage.objects.bucket_id
    and sf.object_path = storage.objects.name
    and sf.archived_at is null
    and sf.organization_id is not null
    and public.has_permission('internal_access', sf.organization_id)
));

create policy storage_company_read on storage.objects for select to authenticated
using (exists (
  select 1 from public.stored_files sf
  where sf.bucket_id = storage.objects.bucket_id
    and sf.object_path = storage.objects.name
    and sf.archived_at is null
    and sf.property_management_company_id is not null
    and public.can_access_property_company(sf.property_management_company_id)
));

create policy storage_owner_avatar_manage on storage.objects for all to authenticated
using (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = 'profile'
  and (storage.foldername(name))[2] = public.current_profile_id()::text
)
with check (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = 'profile'
  and (storage.foldername(name))[2] = public.current_profile_id()::text
);

create policy storage_internal_upload on storage.objects for insert to authenticated
with check (
  bucket_id in ('appliance-photos', 'service-request-photos', 'repair-photos', 'delivery-proof', 'company-documents')
  and (storage.foldername(name))[1] = 'organization'
  and exists (
    select 1 from public.organizations o
    where o.id::text = (storage.foldername(name))[2]
      and public.has_permission('internal_access', o.id)
  )
);

create policy storage_company_upload on storage.objects for insert to authenticated
with check (
  bucket_id in ('service-request-photos', 'company-documents')
  and (storage.foldername(name))[1] = 'company'
  and exists (
    select 1 from public.property_management_companies c
    where c.id::text = (storage.foldername(name))[2]
      and public.can_access_property_company(c.id)
  )
);
