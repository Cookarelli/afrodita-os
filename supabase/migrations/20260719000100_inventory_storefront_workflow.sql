-- Lean inventory-to-storefront additions. Existing appliance, cost, photo, and
-- storage tables remain the source of truth.
alter type public.appliance_status add value if not exists 'delivered';
alter type public.appliance_status add value if not exists 'parts_only';

alter table public.appliances
  add column if not exists featured boolean not null default false;

drop function if exists public.list_public_appliances();
create function public.list_public_appliances()
returns table (
  public_id text, inventory_number text, category text, brand text, model text,
  color text, finish text, width_inches numeric, fuel_type text, condition text,
  public_description text, public_price_cents bigint, currency text,
  availability text, available_at timestamptz, photo_path text, photo_alt text
)
language sql stable security definer set search_path = ''
as $$
  select
    a.qr_lookup_id, a.inventory_number, a.category, a.brand, a.model, a.color,
    a.finish, a.width_inches, a.fuel_type, a.condition, a.public_description,
    a.public_price_cents, a.currency, a.status::text, a.available_at,
    photo.object_path, photo.alt_text
  from public.appliances a
  join public.organizations o on o.id = a.organization_id and o.slug = 'afrodita-appliances'
  left join lateral (
    select ap.object_path, ap.alt_text
    from public.appliance_photos ap
    where ap.appliance_id = a.id and ap.public_eligible and ap.archived_at is null
    order by ap.sort_order, ap.created_at
    limit 1
  ) photo on true
  where a.status in ('available', 'reserved')
    and a.public_visibility and a.archived_at is null
    and exists (
      select 1 from public.inventory_locations il join public.locations l on l.id = il.location_id
      where il.id = a.inventory_location_id and il.active and l.active
    )
  order by a.featured desc, a.available_at desc nulls last, a.created_at desc
$$;
grant execute on function public.list_public_appliances() to anon, authenticated;

drop function if exists public.get_public_appliance(text);
create function public.get_public_appliance(target_public_id text)
returns table (
  public_id text, inventory_number text, category text, brand text, model text,
  color text, finish text, width_inches numeric, fuel_type text, condition text,
  public_description text, public_price_cents bigint, currency text,
  availability text, available_at timestamptz, photos jsonb
)
language sql stable security definer set search_path = ''
as $$
  select
    a.qr_lookup_id, a.inventory_number, a.category, a.brand, a.model, a.color,
    a.finish, a.width_inches, a.fuel_type, a.condition, a.public_description,
    a.public_price_cents, a.currency, a.status::text, a.available_at,
    coalesce((
      select jsonb_agg(jsonb_build_object('path', ap.object_path, 'alt', ap.alt_text) order by ap.sort_order, ap.created_at)
      from public.appliance_photos ap
      where ap.appliance_id = a.id and ap.public_eligible and ap.archived_at is null
    ), '[]'::jsonb)
  from public.appliances a
  join public.organizations o on o.id = a.organization_id and o.slug = 'afrodita-appliances'
  where a.qr_lookup_id = target_public_id
    and a.status in ('available', 'reserved') and a.public_visibility and a.archived_at is null
    and exists (
      select 1 from public.inventory_locations il join public.locations l on l.id = il.location_id
      where il.id = a.inventory_location_id and il.active and l.active
    )
  limit 1
$$;
grant execute on function public.get_public_appliance(text) to anon, authenticated;

create or replace function public.is_public_appliance_photo(target_object_path text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.appliance_photos ap
    join public.appliances a on a.id = ap.appliance_id
    where ap.object_path = target_object_path and ap.public_eligible and ap.archived_at is null
      and a.status in ('available', 'reserved') and a.public_visibility and a.archived_at is null
  )
$$;
grant execute on function public.is_public_appliance_photo(text) to anon, authenticated;

drop policy if exists storage_appliance_photo_delete on storage.objects;
create policy storage_appliance_photo_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'appliance-photos'
  and (storage.foldername(name))[1] = 'organization'
  and exists (
    select 1 from public.organizations o
    where o.id::text = (storage.foldername(name))[2]
      and public.has_permission('manage_inventory', o.id)
  )
);
