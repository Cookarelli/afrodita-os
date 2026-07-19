# Role Permissions

This matrix is the proposed baseline. A blank means denied. Navigation visibility
does not grant access; server checks and RLS must enforce every cell. Permission
overrides are explicit, audited, and cannot bypass hard privacy boundaries.

Legend: **M** manage, **W** operational write, **R** read, **S** own-company scope,
**A** aggregate-only read.

| Area                    | super admin | owner admin | sales manager | sales staff | warehouse | delivery tech | technician | PM admin  | PM staff | investor |
| ----------------------- | ----------- | ----------- | ------------- | ----------- | --------- | ------------- | ---------- | --------- | -------- | -------- |
| Operations dashboard    | M           | M           | R             | R           | R         | assigned      | assigned   |           |          |          |
| Executive dashboard     | M           | M           |               |             |           |               |            |           |          | A        |
| Inventory public fields | M           | M           | M             | W           | W         | R             | R          | S         | S        |          |
| Inventory cost/profit   | M           | M           |               |             |           |               |            |           |          | A        |
| Reservations            | M           | M           | M             | W           | R         | assigned      | assigned   | S         | S        |          |
| Retail customers/CRM    | M           | M           | M             | W           |           |               |            |           |          |          |
| Sales and sale items    | M           | M           | M             | W           | R         | assigned      |            | S         | S        |          |
| Payments/refunds        | M           | M           | status        | status      |           |               |            | S         | S        |          |
| Deliveries              | M           | M           | M             | W           | W         | assigned W    | assigned R | S         | S        |          |
| Repairs/service         | M           | M           | M             | W           | W         | assigned W    | assigned W | S         | S        |          |
| Warranties              | M           | M           | M             | W           | R         | assigned R    | assigned W | S         | S        |          |
| Property companies      | M           | M           | R             | R           |           | assigned      | assigned   | S M       | S        |          |
| Purchasing/suppliers    | M           | M           |               |             |           |               |            |           |          |          |
| Tasks/comments          | M           | M           | M             | W           | W         | assigned W    | assigned W | S         | S        |          |
| Operational reports     | M           | M           | limited       | limited     | limited   | assigned      | assigned   | S         | S        |          |
| Settings                | M           | M           |               |             |           |               |            | company S |          |          |
| Users/roles/invites     | M           | M           |               |             |           |               |            | company S |          |          |
| Stripe configuration    | M           | M           |               |             |           |               |            |           |          |          |
| Audit log               | M           | R           |               |             |           |               |            |           |          |          |

## Hard restrictions

- `sales_manager`, `sales_staff`, `warehouse`, `delivery_technician`, and
  `technician` cannot select acquisition costs, repair costs used for margin,
  minimum authorized price, per-machine profit, or company profitability.
- `investor_viewer` is read-only and receives only high-level aggregate views:
  revenue, estimated gross profit/margin, inventory value/aging, units, average
  ticket, retail-versus-property-manager mix, target progress, and trends.
- Investor results exclude customer PII, addresses, employee notes, serial
  numbers, editable records, Stripe settings, and task discussions.
- Delivery/technician roles see customer contact/address only for work assigned
  to them and only for the time needed to perform it.
- Property-manager users can access only their own company, properties, units,
  requests, purchases, appliances, warranties, deliveries, invoices, payments,
  contacts, notes, and files.
- Property-manager staff permissions are a deny-by-default subset granted by
  their company admin and bounded by Afrodita's policy.
- Payment-card data is never stored. Payment views show safe references/status.

## Named internal-user setup

No real Auth account is created without an email. The development seed creates
pending profiles and separate fictional role fixtures for:

| Person                     | Position                     | Proposed role         | Notes                                                                 |
| -------------------------- | ---------------------------- | --------------------- | --------------------------------------------------------------------- |
| Steven Cook                | Business Development Manager | `super_admin`         | complete system, integrations, reporting, PM relationships, users     |
| Erika Cedillo              | Owner                        | `owner_admin`         | operating and executive access; email unknown and must not be guessed |
| Mikey Jones                | Sales Manager                | `sales_manager`       | no cost, profitability, Stripe config, or role administration         |
| Carlo (last name nullable) | Delivery and Repair          | `delivery_technician` | assigned work/contact only; no financial/config/user administration   |

Invitations must expire, be single-use, identify inviter and intended role, and
require an authorized admin to confirm organization membership.
