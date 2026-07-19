create type public.appliance_status as enum (
  'intake',
  'inspection',
  'repair',
  'cleaning',
  'ready',
  'available',
  'reservation_pending',
  'reserved',
  'sold',
  'parts',
  'scrapped',
  'returned',
  'unavailable',
  'archived'
);

create type public.reservation_status as enum ('requested', 'approved', 'declined', 'expired', 'cancelled', 'converted');
create type public.sale_status as enum ('draft', 'confirmed', 'completed', 'cancelled', 'refunded');
create type public.payment_status as enum ('pending', 'authorized', 'succeeded', 'failed', 'partially_refunded', 'refunded', 'disputed', 'cancelled');
create type public.delivery_status as enum ('unscheduled', 'scheduled', 'assigned', 'in_progress', 'completed', 'failed', 'cancelled');
create type public.warranty_status as enum ('pending', 'active', 'expired', 'cancelled', 'replaced');
create type public.service_request_status as enum ('new', 'triaged', 'scheduled', 'in_progress', 'waiting', 'completed', 'cancelled');
create type public.repair_job_status as enum ('new', 'assigned', 'diagnosing', 'waiting_parts', 'repairing', 'testing', 'completed', 'cancelled');
create type public.task_status as enum ('open', 'in_progress', 'blocked', 'completed', 'cancelled');

create table public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  code text not null,
  name text not null,
  location_type text not null default 'floor' check (location_type in ('intake', 'floor', 'repair', 'cleaning', 'storage', 'vehicle', 'sold_hold', 'other')),
  active boolean not null default true,
  legacy_source_system text,
  legacy_record_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (legacy_source_system, legacy_record_id)
);

create table public.appliances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  inventory_location_id uuid references public.inventory_locations(id) on delete restrict,
  inventory_number text not null,
  qr_lookup_id text not null unique check (length(qr_lookup_id) >= 20),
  category text not null,
  brand text,
  model text,
  serial_number text,
  color text,
  finish text,
  width_inches numeric(6, 2) check (width_inches is null or width_inches > 0),
  fuel_type text check (fuel_type is null or fuel_type in ('gas', 'electric', 'dual_fuel', 'none', 'other')),
  condition text,
  public_description text,
  internal_notes text,
  acquisition_source text,
  purchase_date date,
  public_price_cents bigint check (public_price_cents is null or public_price_cents >= 0),
  property_manager_price_cents bigint check (property_manager_price_cents is null or property_manager_price_cents >= 0),
  minimum_authorized_price_cents bigint check (minimum_authorized_price_cents is null or minimum_authorized_price_cents >= 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  status public.appliance_status not null default 'intake',
  public_visibility boolean not null default false,
  available_at timestamptz,
  reserved_at timestamptz,
  sold_at timestamptz,
  archived_at timestamptz,
  version integer not null default 1 check (version > 0),
  legacy_source_system text,
  legacy_record_id text,
  source_metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, inventory_number),
  unique (legacy_source_system, legacy_record_id),
  check (jsonb_typeof(source_metadata) = 'object'),
  check (status <> 'archived' or archived_at is not null)
);

create table public.appliance_photos (
  id uuid primary key default gen_random_uuid(),
  appliance_id uuid not null references public.appliances(id) on delete restrict,
  object_path text not null unique,
  alt_text text,
  sort_order integer not null default 0,
  public_eligible boolean not null default false,
  legacy_source_system text,
  legacy_record_id text,
  uploaded_by_profile_id uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (legacy_source_system, legacy_record_id)
);

create table public.appliance_status_history (
  id uuid primary key default gen_random_uuid(),
  appliance_id uuid not null references public.appliances(id) on delete restrict,
  from_status public.appliance_status,
  to_status public.appliance_status not null,
  reason text,
  changed_by_profile_id uuid references public.profiles(id) on delete set null,
  legacy_source_system text,
  legacy_record_id text,
  created_at timestamptz not null default now(),
  unique (legacy_source_system, legacy_record_id)
);

-- All raw invested costs live here, away from generally selectable appliance rows.
create table public.appliance_costs (
  id uuid primary key default gen_random_uuid(),
  appliance_id uuid not null references public.appliances(id) on delete restrict,
  cost_type text not null check (cost_type in ('acquisition', 'repair_part', 'labor', 'transportation', 'tax', 'fee', 'other')),
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  incurred_on date,
  description text,
  source_reference text,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  legacy_source_system text,
  legacy_record_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (legacy_source_system, legacy_record_id)
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  appliance_id uuid not null references public.appliances(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete restrict,
  property_management_company_id uuid references public.property_management_companies(id) on delete restrict,
  property_id uuid references public.properties(id) on delete restrict,
  property_unit_id uuid references public.property_units(id) on delete restrict,
  status public.reservation_status not null default 'requested',
  fulfillment_preference text check (fulfillment_preference is null or fulfillment_preference in ('pickup', 'delivery')),
  preferred_at timestamptz,
  expires_at timestamptz not null,
  approved_at timestamptz,
  converted_at timestamptz,
  notes text,
  version integer not null default 1 check (version > 0),
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  legacy_source_system text,
  legacy_record_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (customer_id is not null or property_management_company_id is not null),
  check (expires_at > created_at),
  unique (legacy_source_system, legacy_record_id)
);

create unique index reservations_one_active_appliance_idx
  on public.reservations(appliance_id)
  where status in ('requested', 'approved') and archived_at is null;

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  location_id uuid references public.locations(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete restrict,
  property_management_company_id uuid references public.property_management_companies(id) on delete restrict,
  reservation_id uuid references public.reservations(id) on delete restrict,
  sale_number text not null,
  status public.sale_status not null default 'draft',
  subtotal_cents bigint not null default 0 check (subtotal_cents >= 0),
  tax_cents bigint not null default 0 check (tax_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  total_cents bigint not null default 0 check (total_cents >= 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  sold_by_profile_id uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  completed_at timestamptz,
  legacy_source_system text,
  legacy_record_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sale_number),
  unique (legacy_source_system, legacy_record_id),
  check (customer_id is not null or property_management_company_id is not null)
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  appliance_id uuid references public.appliances(id) on delete restrict,
  description_snapshot text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  line_total_cents bigint not null check (line_total_cents >= 0),
  warranty_offered boolean not null default false,
  legacy_source_system text,
  legacy_record_id text,
  created_at timestamptz not null default now(),
  unique (sale_id, appliance_id),
  unique (legacy_source_system, legacy_record_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  sale_id uuid references public.sales(id) on delete restrict,
  reservation_id uuid references public.reservations(id) on delete restrict,
  property_management_company_id uuid references public.property_management_companies(id) on delete restrict,
  provider text not null default 'manual' check (provider in ('cash', 'stripe', 'check', 'ach', 'manual', 'other')),
  provider_payment_id text,
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  status public.payment_status not null default 'pending',
  payment_method_summary text,
  received_at timestamptz,
  reconciled_at timestamptz,
  reconciled_by_profile_id uuid references public.profiles(id) on delete set null,
  legacy_source_system text,
  legacy_record_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id),
  unique (legacy_source_system, legacy_record_id),
  check (sale_id is not null or reservation_id is not null or property_management_company_id is not null)
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  provider_refund_id text,
  amount_cents bigint not null check (amount_cents > 0),
  reason text,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'cancelled')),
  processed_by_profile_id uuid references public.profiles(id) on delete set null,
  processed_at timestamptz,
  legacy_source_system text,
  legacy_record_id text,
  created_at timestamptz not null default now(),
  unique (provider_refund_id),
  unique (legacy_source_system, legacy_record_id)
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  sale_id uuid references public.sales(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete restrict,
  property_management_company_id uuid references public.property_management_companies(id) on delete restrict,
  property_id uuid references public.properties(id) on delete restrict,
  property_unit_id uuid references public.property_units(id) on delete restrict,
  delivery_address_id uuid references public.customer_addresses(id) on delete restrict,
  assigned_profile_id uuid references public.profiles(id) on delete set null,
  status public.delivery_status not null default 'unscheduled',
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  pickup_required boolean not null default false,
  removal_required boolean not null default false,
  customer_contact_name text,
  customer_contact_phone text,
  access_notes text,
  completion_notes text,
  legacy_source_system text,
  legacy_record_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (legacy_source_system, legacy_record_id),
  check (scheduled_end is null or scheduled_start is null or scheduled_end > scheduled_start)
);

create table public.delivery_status_history (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete restrict,
  from_status public.delivery_status,
  to_status public.delivery_status not null,
  reason text,
  changed_by_profile_id uuid references public.profiles(id) on delete set null,
  legacy_source_system text,
  legacy_record_id text,
  created_at timestamptz not null default now(),
  unique (legacy_source_system, legacy_record_id)
);

create table public.warranties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  appliance_id uuid not null references public.appliances(id) on delete restrict,
  sale_item_id uuid references public.sale_items(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete restrict,
  property_management_company_id uuid references public.property_management_companies(id) on delete restrict,
  property_id uuid references public.properties(id) on delete restrict,
  property_unit_id uuid references public.property_units(id) on delete restrict,
  status public.warranty_status not null default 'pending',
  plan_name text not null,
  terms_version text not null,
  starts_on date,
  ends_on date,
  legacy_source_system text,
  legacy_record_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (legacy_source_system, legacy_record_id),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.warranty_events (
  id uuid primary key default gen_random_uuid(),
  warranty_id uuid not null references public.warranties(id) on delete restrict,
  event_type text not null,
  summary text not null,
  internal_notes text,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  legacy_source_system text,
  legacy_record_id text,
  created_at timestamptz not null default now(),
  unique (legacy_source_system, legacy_record_id)
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete restrict,
  property_management_company_id uuid references public.property_management_companies(id) on delete restrict,
  property_id uuid references public.properties(id) on delete restrict,
  property_unit_id uuid references public.property_units(id) on delete restrict,
  appliance_id uuid references public.appliances(id) on delete restrict,
  warranty_id uuid references public.warranties(id) on delete restrict,
  status public.service_request_status not null default 'new',
  appliance_type text not null,
  problem_description text not null,
  urgency text not null default 'normal' check (urgency in ('normal', 'urgent', 'emergency')),
  tenant_contact_name text,
  tenant_contact_phone text,
  tenant_contact_email extensions.citext,
  access_instructions text,
  preferred_access_at timestamptz,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  legacy_source_system text,
  legacy_record_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (legacy_source_system, legacy_record_id),
  check (customer_id is not null or property_management_company_id is not null)
);

create table public.repair_jobs (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete restrict,
  appliance_id uuid references public.appliances(id) on delete restrict,
  assigned_profile_id uuid references public.profiles(id) on delete set null,
  status public.repair_job_status not null default 'new',
  diagnosis text,
  work_performed text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  internal_notes text,
  legacy_source_system text,
  legacy_record_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (legacy_source_system, legacy_record_id)
);

create table public.repair_parts (
  id uuid primary key default gen_random_uuid(),
  repair_job_id uuid not null references public.repair_jobs(id) on delete restrict,
  part_name text not null,
  part_number text,
  quantity integer not null default 1 check (quantity > 0),
  source_reference text,
  installed_at timestamptz,
  legacy_source_system text,
  legacy_record_id text,
  created_at timestamptz not null default now(),
  unique (legacy_source_system, legacy_record_id)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  contact_name text,
  email extensions.citext,
  phone text,
  notes text,
  legacy_source_system text,
  legacy_record_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (legacy_source_system, legacy_record_id)
);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  location_id uuid references public.locations(id) on delete restrict,
  purchase_order_number text not null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'partially_received', 'received', 'cancelled')),
  total_cents bigint check (total_cents is null or total_cents >= 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  ordered_at timestamptz,
  received_at timestamptz,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  legacy_source_system text,
  legacy_record_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, purchase_order_number),
  unique (legacy_source_system, legacy_record_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  property_management_company_id uuid references public.property_management_companies(id) on delete restrict,
  title text not null,
  description text,
  status public.task_status not null default 'open',
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  assigned_profile_id uuid references public.profiles(id) on delete set null,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  completed_at timestamptz,
  related_entity_type text,
  related_entity_id uuid,
  visible_to_property_manager boolean not null default false,
  legacy_source_system text,
  legacy_record_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (legacy_source_system, legacy_record_id)
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  author_profile_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  visible_to_property_manager boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  provider text not null,
  external_account_id text,
  status text not null default 'disabled' check (status in ('disabled', 'test', 'active', 'error', 'revoked')),
  configuration_metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, external_account_id),
  check (jsonb_typeof(configuration_metadata) = 'object')
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  integration_connection_id uuid references public.integration_connections(id) on delete restrict,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  processing_status text not null default 'received' check (processing_status in ('received', 'processing', 'processed', 'ignored', 'failed')),
  safe_metadata jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  retry_count integer not null default 0 check (retry_count >= 0),
  error_summary text,
  unique (provider, provider_event_id),
  check (jsonb_typeof(safe_metadata) = 'object')
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  source_system text not null,
  status public.import_status not null default 'pending',
  dry_run boolean not null default true,
  checkpoint jsonb not null default '{}'::jsonb,
  source_record_count integer check (source_record_count is null or source_record_count >= 0),
  imported_record_count integer not null default 0 check (imported_record_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(checkpoint) = 'object')
);

create table public.legacy_record_mappings (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid references public.import_batches(id) on delete restrict,
  source_system text not null,
  legacy_entity_name text not null,
  legacy_record_id text not null,
  new_entity_name text not null,
  new_record_id uuid,
  mapping_status text not null default 'pending' check (mapping_status in ('pending', 'mapped', 'needs_review', 'rejected', 'superseded')),
  imported_at timestamptz,
  source_metadata jsonb not null default '{}'::jsonb,
  reconciliation_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_system, legacy_entity_name, legacy_record_id),
  check (jsonb_typeof(source_metadata) = 'object')
);

create table public.import_errors (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete restrict,
  source_system text not null,
  legacy_entity_name text,
  legacy_record_id text,
  error_code text not null,
  error_summary text not null,
  safe_source_metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by_profile_id uuid references public.profiles(id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(safe_source_metadata) = 'object')
);

-- Metadata for storage objects. Private object policies use organization/company
-- ownership; public appliance photos additionally require an eligible photo row.
create table public.stored_files (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  object_path text not null,
  organization_id uuid references public.organizations(id) on delete restrict,
  property_management_company_id uuid references public.property_management_companies(id) on delete restrict,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  entity_type text,
  entity_id uuid,
  visibility text not null default 'private' check (visibility in ('private', 'company', 'public')),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (bucket_id, object_path),
  check (organization_id is not null or property_management_company_id is not null or owner_profile_id is not null)
);

create index appliances_public_idx on public.appliances(status, public_visibility, available_at desc) where archived_at is null;
create index appliances_location_status_idx on public.appliances(inventory_location_id, status) where archived_at is null;
create index appliance_costs_appliance_idx on public.appliance_costs(appliance_id) where archived_at is null;
create index appliance_history_idx on public.appliance_status_history(appliance_id, created_at desc);
create index reservations_company_idx on public.reservations(property_management_company_id, status, created_at desc) where archived_at is null;
create index sales_org_date_idx on public.sales(organization_id, created_at desc) where archived_at is null;
create index payments_sale_idx on public.payments(sale_id, status) where archived_at is null;
create index deliveries_assignee_idx on public.deliveries(assigned_profile_id, scheduled_start) where archived_at is null;
create index deliveries_company_idx on public.deliveries(property_management_company_id, scheduled_start) where archived_at is null;
create index warranties_company_idx on public.warranties(property_management_company_id, status) where archived_at is null;
create index service_requests_company_idx on public.service_requests(property_management_company_id, status) where archived_at is null;
create index repair_jobs_assignee_idx on public.repair_jobs(assigned_profile_id, status) where archived_at is null;
create index tasks_assignee_idx on public.tasks(assigned_profile_id, status, due_at) where archived_at is null;
create index legacy_mappings_new_idx on public.legacy_record_mappings(new_entity_name, new_record_id);
create index import_errors_batch_idx on public.import_errors(import_batch_id, created_at);
