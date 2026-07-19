# Proposed Data Model

This model is implemented as four incremental development migrations under
`supabase/migrations`. It remains unapproved for production until the legacy D1
schema is available and reconciliation mappings are reviewed. Existing D1 and
local portal schemas are migration inputs, not presumed truth.

## Conventions

- UUID primary keys are immutable. Human inventory numbers and QR tokens are
  separate unique identifiers and never reused.
- Money uses integer cents plus ISO currency; timestamps use `timestamptz`.
- Financial/customer/history tables use `archived_at` or lifecycle states, not
  hard deletion. `created_at`, `updated_at`, and actor IDs are standard.
- Organization/location/company foreign keys are non-null wherever they define a
  security boundary. RLS starts deny-all.
- Public views include only deliberately safe columns.

## Identity and tenancy

| Table                  | Purpose and key relationships                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `organizations`        | Afrodita operating entity; future-safe without speculative multi-brand UI                                                       |
| `locations`            | store, warehouse, vehicle, repair area; belongs to organization                                                                 |
| `profiles`             | safe extension of `auth.users`; nullable email until invited account exists is avoided by keeping pending people in invitations |
| `organization_members` | profile-to-organization membership, active state, title                                                                         |
| `role_assignments`     | one or more approved roles for a membership; replaces mutable role text                                                         |
| `permission_overrides` | explicit allow/deny, scope, reason, expiration, grantor                                                                         |
| `invitations`          | email, intended role/membership, token hash, expiry/status; no real account before acceptance                                   |

## Property-management domain

| Table                           | Purpose and key relationships                                |
| ------------------------------- | ------------------------------------------------------------ |
| `property_management_companies` | tenant boundary, pricing/account status                      |
| `property_manager_contacts`     | multiple billing/delivery/authorized contacts                |
| `properties`                    | company portfolio property, door count and address reference |
| `property_units`                | unit/door within property; unique property + unit label      |
| `property_manager_members`      | portal profile membership and active status                  |

## Customers and addresses

| Table                       | Purpose and key relationships                                                  |
| --------------------------- | ------------------------------------------------------------------------------ |
| `customers`                 | retail CRM identity, normalized contact fields, archive/merge state            |
| `customer_addresses`        | typed delivery/billing/service addresses; no destructive cascade from customer |
| `customer_merge_candidates` | duplicate detection evidence and reviewed merge outcome                        |

Customers may own many appliances; a future `customer_appliances` or ownership
history table should link sold/imported assets without overloading inventory state.

## Inventory

| Table                      | Purpose and key relationships                                                                                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `appliances`               | UUID, inventory number, QR token hash, category, brand/model/serial, appearance/dimensions/fuel/condition, descriptions, acquisition source/date, public/PM/minimum prices, status, location, lifecycle dates, visibility/archive/version |
| `appliance_photos`         | appliance, private object path, public derivative, ordering, purpose, uploader                                                                                                                                                            |
| `appliance_status_history` | immutable from/to state, reason, actor, timestamp                                                                                                                                                                                         |
| `appliance_costs`          | restricted acquisition/repair/other cost rows; never joined into broad appliance selects                                                                                                                                                  |
| `inventory_locations`      | configurable physical locations under an organization/location                                                                                                                                                                            |

Allowed appliance states: `intake`, `inspection`, `repair`, `cleaning`, `ready`,
`available`, `reservation_pending`, `reserved`, `sold`, `parts`, `scrapped`,
`returned`, `unavailable`, `archived`.
A temporary unconfirmed reservation is modeled on `reservations`, not as a second
claimable appliance. The public projection requires `available`, public visible,
and not archived.

## Reservations, sales, and payments

| Table                           | Purpose and key relationships                                                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `reservations`                  | customer/company, appliance, request/review/confirmation/expiry/withdrawal/conversion state, pickup/delivery preference; partial unique constraint prevents concurrent active claims |
| `customer_duplicate_candidates` | uncertain normalized-contact matches held for staff review rather than silently merged                                                                                               |
| `internal_notifications`        | provider-neutral adapter queue for reservation and inquiry follow-up                                                                                                                 |
| `contact_inquiries`             | persisted public retail, PM, repair, delivery, and warranty inquiries                                                                                                                |
| `sales`                         | customer or PM company, location, seller, totals/status, archive state                                                                                                               |
| `sale_items`                    | sale line and appliance; immutable snapshot of description/price                                                                                                                     |
| `payments`                      | sale/reservation/company references plus provider IDs, amount/status/type; no card data                                                                                              |
| `payment_reconciliation_queue`  | unmatched provider objects with review state and evidence                                                                                                                            |

Sale conversion is one database transaction: validate reservation/version,
create sale/items/payment status, set appliances sold, create optional warranties
and delivery/pickup, and append audit/status events.

## Delivery, warranty, and service

| Table                     | Purpose and key relationships                                                        |
| ------------------------- | ------------------------------------------------------------------------------------ |
| `deliveries`              | sale/company/customer address, assignees, schedule/window, pickup/removal, status    |
| `delivery_status_history` | immutable transitions and completion evidence                                        |
| `warranties`              | sale item/appliance/owner, terms/version, dates, status                              |
| `warranty_events`         | claim, approval, repair, replacement, cancellation history                           |
| `service_requests`        | retail or PM requester, property/unit, asset/warranty, problem/urgency/access/photos |
| `repair_jobs`             | service request, assigned technician, diagnosis/status/labor/cost visibility         |
| `repair_parts`            | repair job part usage; optional controlled CNC integration reference                 |

## Purchasing and work management

| Table                  | Purpose and key relationships                                 |
| ---------------------- | ------------------------------------------------------------- |
| `suppliers`            | source identity, contacts, archive status                     |
| `purchase_orders`      | supplier, location, status, totals, receiving metadata        |
| `purchase_order_items` | appliance/category line and received appliance link           |
| `tasks`                | assignee/team, related entity, due/status/priority/visibility |
| `task_comments`        | task discussion with role/company visibility rules            |

## Integrations and audit

| Table                     | Purpose and key relationships                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `activity_log`            | append-only sensitive action record with actor/scope/target/correlation and redacted changes            |
| `integration_connections` | provider/account identifiers and status; secrets live in environment/vault, not rows                    |
| `webhook_events`          | provider event ID, type, received/processed state, retry-safe error summary; payload minimized/redacted |
| `legacy_id_mappings`      | source system/table/ID to new UUID, import version, confidence/review state                             |
| `import_runs`             | dry-run/checkpoint/count/error/reconciliation metadata                                                  |

## Required indexes and constraints

- unique inventory number and QR token; normalized customer email/phone indexes;
- partial unique active reservation per appliance;
- compound company/property/unit uniqueness and tenant-scope indexes;
- status/date indexes for inventory, reservations, deliveries, repairs, tasks;
- unique provider + event/object IDs for idempotency;
- checks for nonnegative money, allowed states, date order, and required ownership;
- foreign-key deletion behavior defaults to restrict/set-null; cascade is limited to
  non-record children such as replaceable photo metadata, never financial history.

## Public and restricted projections

- `public_available_appliances`: only public fields, never serial/cost/notes.
- `staff_appliances`: operational fields without restricted costs for ordinary staff.
- `authorized_appliance_financials`: costs/margins only for super/owner roles.
- `investor_executive_summary`: aggregate, read-only, no PII or serial numbers.
- tenant-scoped property-manager views for purchases, warranties, invoices,
  payments, deliveries, requests, properties/units, and company contacts.
