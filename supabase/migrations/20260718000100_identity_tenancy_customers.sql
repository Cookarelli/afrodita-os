create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create type public.system_role as enum (
  'super_admin',
  'owner_admin',
  'sales_manager',
  'sales_staff',
  'warehouse',
  'delivery_technician',
  'technician',
  'property_manager_admin',
  'property_manager_staff',
  'investor_viewer'
);

create type public.profile_status as enum ('pending', 'active', 'disabled', 'archived');
create type public.membership_status as enum ('pending', 'active', 'disabled', 'archived');
create type public.override_effect as enum ('allow', 'deny');
create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
create type public.company_status as enum ('prospect', 'active', 'suspended', 'archived');
create type public.import_status as enum ('pending', 'processing', 'completed', 'completed_with_errors', 'failed', 'cancelled');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  legal_name text not null,
  public_name text not null,
  status public.membership_status not null default 'active',
  timezone text not null default 'America/Chicago',
  legacy_source_system text,
  legacy_record_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (legacy_source_system, legacy_record_id)
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null,
  name text not null,
  location_type text not null default 'retail' check (location_type in ('retail', 'warehouse', 'repair', 'vehicle', 'other')),
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  phone text,
  active boolean not null default true,
  legacy_source_system text,
  legacy_record_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (legacy_source_system, legacy_record_id)
);

-- Profiles may exist before an Auth account so named staff can be invitation-ready
-- without inventing email addresses. Invitation acceptance links auth_user_id.
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null,
  first_name text,
  last_name text,
  title text,
  avatar_path text,
  status public.profile_status not null default 'pending',
  disabled_reason text,
  disabled_at timestamptz,
  legacy_source_system text,
  legacy_record_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'disabled') = (disabled_at is not null) or status <> 'disabled'),
  unique (legacy_source_system, legacy_record_id)
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  location_id uuid references public.locations(id) on delete set null,
  member_kind text not null default 'employee' check (member_kind in ('employee', 'owner', 'investor', 'contractor', 'customer')),
  status public.membership_status not null default 'pending',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_member_id uuid not null references public.organization_members(id) on delete cascade,
  role public.system_role not null,
  granted_by_profile_id uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  notes text,
  check (revoked_at is null or revoked_at >= granted_at)
);

create table public.permission_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_member_id uuid not null references public.organization_members(id) on delete cascade,
  permission_key text not null check (permission_key ~ '^[a-z0-9_]+$'),
  effect public.override_effect not null,
  resource_type text,
  resource_id uuid,
  reason text not null,
  granted_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (resource_type is not null or resource_id is null)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  pending_profile_id uuid references public.profiles(id) on delete restrict,
  email extensions.citext not null,
  intended_role public.system_role not null,
  token_hash text not null unique check (length(token_hash) = 64),
  status public.invitation_status not null default 'pending',
  invited_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by_profile_id uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check ((status = 'accepted') = (accepted_at is not null) or status <> 'accepted')
);

create table public.activity_log (
  id bigint generated always as identity primary key,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null check (action ~ '^[a-z0-9_.-]+$'),
  entity_type text not null,
  entity_id uuid,
  organization_id uuid references public.organizations(id) on delete restrict,
  property_management_company_id uuid,
  before_metadata jsonb not null default '{}'::jsonb,
  after_metadata jsonb not null default '{}'::jsonb,
  request_correlation_id uuid,
  created_at timestamptz not null default now()
);

create table public.property_management_companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  company_name text not null,
  status public.company_status not null default 'prospect',
  door_count integer not null default 0 check (door_count >= 0),
  account_notes text,
  legacy_source_system text,
  legacy_record_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, company_name),
  unique (legacy_source_system, legacy_record_id)
);

alter table public.activity_log
  add constraint activity_log_company_fk
  foreign key (property_management_company_id)
  references public.property_management_companies(id)
  on delete restrict;

alter table public.role_assignments
  add column property_management_company_id uuid references public.property_management_companies(id) on delete cascade;

alter table public.invitations
  add column property_management_company_id uuid references public.property_management_companies(id) on delete cascade;

create table public.property_manager_contacts (
  id uuid primary key default gen_random_uuid(),
  property_management_company_id uuid not null references public.property_management_companies(id) on delete restrict,
  contact_type text not null default 'general' check (contact_type in ('general', 'billing', 'delivery', 'service', 'authorized')),
  display_name text not null,
  email extensions.citext,
  phone text,
  active boolean not null default true,
  notes text,
  legacy_source_system text,
  legacy_record_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (legacy_source_system, legacy_record_id)
);

create table public.property_manager_members (
  id uuid primary key default gen_random_uuid(),
  property_management_company_id uuid not null references public.property_management_companies(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  status public.membership_status not null default 'pending',
  invited_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_management_company_id, profile_id)
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  property_management_company_id uuid not null references public.property_management_companies(id) on delete restrict,
  name text not null,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  state text not null default 'IL',
  postal_code text,
  door_count integer not null default 0 check (door_count >= 0),
  active boolean not null default true,
  internal_notes text,
  legacy_source_system text,
  legacy_record_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (legacy_source_system, legacy_record_id)
);

create table public.property_units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  unit_label text not null,
  floor_label text,
  active boolean not null default true,
  access_notes text,
  legacy_source_system text,
  legacy_record_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, unit_label),
  unique (legacy_source_system, legacy_record_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  display_name text not null,
  first_name text,
  last_name text,
  status text not null default 'active' check (status in ('active', 'merged', 'archived')),
  merged_into_customer_id uuid references public.customers(id) on delete restrict,
  legacy_source_system text,
  legacy_record_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (legacy_source_system, legacy_record_id),
  check (merged_into_customer_id is null or merged_into_customer_id <> id)
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  address_type text not null default 'delivery' check (address_type in ('home', 'delivery', 'billing', 'service', 'other')),
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  state text not null default 'IL',
  postal_code text,
  is_primary boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  contact_type text not null check (contact_type in ('email', 'phone')),
  contact_value extensions.citext not null,
  normalized_value text not null,
  is_primary boolean not null default false,
  consent_status text not null default 'unknown' check (consent_status in ('unknown', 'granted', 'revoked')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, contact_type, normalized_value)
);

create table public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  author_profile_id uuid not null references public.profiles(id) on delete restrict,
  note text not null,
  visibility text not null default 'internal' check (visibility in ('internal', 'customer_visible')),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.customer_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  color text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.customer_tag_assignments (
  customer_id uuid not null references public.customers(id) on delete cascade,
  customer_tag_id uuid not null references public.customer_tags(id) on delete cascade,
  assigned_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (customer_id, customer_tag_id)
);

create index organization_members_profile_idx on public.organization_members(profile_id, status);
create unique index role_assignments_one_active_role_idx
  on public.role_assignments(organization_member_id, role)
  where revoked_at is null;
create index role_assignments_member_idx on public.role_assignments(organization_member_id) where revoked_at is null;
create index permission_overrides_member_idx on public.permission_overrides(organization_member_id) where revoked_at is null;
create index invitations_email_status_idx on public.invitations(email, status);
create index activity_log_entity_idx on public.activity_log(entity_type, entity_id, created_at desc);
create index activity_log_org_idx on public.activity_log(organization_id, created_at desc);
create index pm_members_profile_idx on public.property_manager_members(profile_id, status);
create index properties_company_idx on public.properties(property_management_company_id) where archived_at is null;
create index property_units_property_idx on public.property_units(property_id) where archived_at is null;
create index customer_contacts_normalized_idx on public.customer_contacts(contact_type, normalized_value) where archived_at is null;
create index customer_addresses_customer_idx on public.customer_addresses(customer_id) where archived_at is null;
