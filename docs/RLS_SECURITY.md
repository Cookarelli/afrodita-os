# Row-Level and Storage Security

All application tables enable and force RLS. Anonymous users receive no private
table grants, and authenticated users must satisfy an explicit policy. Browser-
supplied organization, company, profile, role, and route IDs are never trusted.

## Authorization functions

- `current_profile_id()` returns only an active profile linked to `auth.uid()`.
- `is_active_organization_member()` checks active Afrodita membership.
- `is_active_property_manager_member()` checks active company membership.
- `has_role()` requires active profile, organization membership, non-revoked role,
  and company membership when applicable.
- `has_permission()` centralizes role permissions and expiring overrides.
- `can_access_property_company()` requires the complete organization + company +
  role chain and is used by tenant policies.

Raw-cost, role-administration, and integration-administration permissions cannot
be granted by overrides. Explicit deny overrides take precedence.

## Policy groups

- Identity policies allow self reads and super/owner administration of profiles,
  memberships, roles, overrides, and invitations. Activity logs are append-only
  to application users and readable only by super/owner roles.
- Property-manager policies scope companies, contacts, members, properties,
  units, reservations, purchases, deliveries, warranties, requests, tasks, and
  files through `can_access_property_company`.
- CRM policies are limited to super, owner, and sales roles. Assigned workers
  receive necessary contact fields only through
  `list_my_assigned_work_contacts()`.
- Inventory policies separate staff management, tenant-visible available stock,
  and the anonymous `list_public_appliances()` projection.
- Commerce and operations policies provide distinct staff, assigned-worker, and
  tenant paths. Investors receive no base-table policy.
- Integration, webhook, import, mapping, and error policies are owner-only.

## Cost protection

Acquisition, repair-part, labor, transportation, tax, fee, and other invested
costs live only in `appliance_costs`. The table is accessible only when
`view_raw_costs` succeeds, which is hard-limited to `super_admin` and
`owner_admin`. Repair-part rows contain no cost fields.

`get_investor_summary()` checks `view_investor_summary` and returns approved
aggregates only. It returns no raw appliance cost, PII, serial number, internal
note, task comment, or edit path.

## Storage

Private buckets: `appliance-photos`, `service-request-photos`, `repair-photos`,
`delivery-proof`, `user-avatars`, and `company-documents`. MIME types and size
limits are defined in migration.

Public appliance objects are readable only when the linked photo is eligible and
the appliance is available, public, and unarchived. Private objects require
linked `stored_files` metadata and organization/company ownership. Avatar writes
are restricted to `profile/<current-profile-id>/...`.

## Audit trail

Triggers record safe summaries for appliance status/price/location, costs,
invitations, and role changes. Invitation acceptance records an explicit event.
Future reservation, sale, payment, warranty, and company-access services must add
activity entries transactionally.

Logs contain actor, action, entity, organization/company, redacted before/after
metadata, optional correlation ID, and timestamp. Passwords, secrets, full
payment payloads, and unnecessary PII are prohibited.

## Tests

`supabase/tests/authorization.sql` covers anonymous denial, public projection,
storage visibility, tenant isolation, malicious IDs, sales/delivery cost denial,
delivery CRM denial, investor read-only aggregate access, owner/super cost access,
invitation acceptance/expiration, and disabled memberships.

Run against local Supabase with `npm run db:reset && npm run db:test`.
