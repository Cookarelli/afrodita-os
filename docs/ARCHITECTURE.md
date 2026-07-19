# Afrodita OS Architecture

Status: proposed, Phase 1 foundation, 2026-07-18.

## Decision summary

Afrodita OS will be a single Next.js App Router application backed by one
Supabase PostgreSQL project. It will present three independently protected
surfaces: the public retail website, internal operations, and the property
manager portal. CNC Appliance Parts remains a separate application. Shared data
must flow through explicit, versioned integration contracts rather than direct
cross-application table access.

The existing Astro website, Cloudflare Worker/D1/R2 backend, staff inventory app,
and local Next/Supabase property portal remain unchanged during the migration.

## Runtime boundaries

| Boundary                  | Responsibilities                                                | Data exposure                                         |
| ------------------------- | --------------------------------------------------------------- | ----------------------------------------------------- |
| Public routes             | marketing, available inventory, reservation requests            | public-safe appliance projection only                 |
| Internal routes           | operations, executive reporting, staff workflows                | role- and location-scoped server queries              |
| Property-manager routes   | company portfolio, orders, service, delivery, warranty, billing | organization-tenant scoped rows only                  |
| Server actions/API routes | validation, authorization, transactions, integrations           | never trust browser-supplied role or organization IDs |
| Supabase                  | source of truth, auth, RLS, storage                             | policies are the final enforcement layer              |
| Stripe adapter            | payment references, webhook normalization, reconciliation       | IDs/status only; no card data                         |

## Proposed route namespaces

Public routes:

- `/`, `/shop`, `/shop/[inventoryNumber]`, `/reserve`
- `/warranty-club`, `/property-managers`, `/delivery`, `/repairs`
- `/about`, `/contact`, `/staff/login`, `/property-manager/login`

Internal routes under `/app`:

- dashboard and `/app/executive`
- inventory, reservations, customers, sales, deliveries, repairs, warranties
- property managers, purchasing, tasks, reports, settings, and users

Property-manager routes under `/property-manager`:

- dashboard, properties/units, current appliances, appliance requests
- service requests, deliveries, warranties, purchases, invoices/payments, contacts

These namespaces are documentation targets, not implemented modules in Phase 1.

## Application layering

1. Route components render authenticated, already-authorized view models.
2. Server actions and route handlers parse input with Zod and call application
   services with the authenticated profile context.
3. Application services enforce permissions, transactions, invariants, and audit
   logging.
4. Repositories expose narrow queries. Financial repositories and public
   projections are separate from ordinary appliance/customer queries.
5. PostgreSQL constraints, functions, and RLS enforce tenant and role boundaries
   even if an application check is missed.

Server-only modules own Supabase privileged clients and Stripe. The service-role
key is reserved for narrowly scoped administrative jobs and webhooks; ordinary
requests use the authenticated user's session so RLS remains effective.

## Authentication and authorization

Supabase Auth will provide email invitation, password reset, session refresh, and
sign-out. A profile is not authority by itself: active organization membership
and role assignments determine access. Staff with unknown emails receive pending
invitation records, never fabricated accounts.

Authorization is additive and deny-by-default:

- route layout checks provide user-friendly redirects;
- every mutation and sensitive query checks a named permission server-side;
- RLS scopes rows to the user's organization/property-management company;
- costs and profitability live behind restricted views/functions or a separate
  table, not in broadly selectable appliance rows;
- investor queries use read-only aggregate views that omit personal details;
- permission overrides are explicit, expiring where appropriate, and audited.

## Data and consistency

PostgreSQL is the operational source of truth. Appliance UUIDs are immutable;
human inventory numbers and opaque QR tokens are unique and never reused.
Reservation claims and sale conversion use database transactions and row locks
or equivalent atomic functions. Public inventory is a projection of rows that
are `available`, public, and not archived. Sold rows remain searchable internally.

Currency is stored in integer cents. Timestamps use `timestamptz`. Financial and
customer records use archive/status fields rather than destructive deletion.
Mutable records carry `updated_at` and an optimistic version or equivalent
concurrency token.

## Storage

Supabase Storage will use private buckets for internal appliance, repair,
delivery, and service-request photos. Public inventory photos are served through
an explicitly public derivative or signed transformation path. Object paths are
organization-aware and policies validate both ownership and file purpose.
Uploads require MIME, size, and extension validation; original filenames are not
trusted as storage keys.

## Integrations

Stripe will be wrapped by a server-only adapter. Afrodita OS stores Stripe object
IDs, amounts, currency, status, and reconciliation metadata but not payment-card
data. Webhooks will verify signatures from the raw body and deduplicate event IDs.
No public full-price appliance checkout is part of the initial scope.

The legacy Cloudflare systems will initially exchange immutable export files or
versioned API payloads. A reconciliation job will compare counts, statuses, and
identifiers during dual-read/dual-run periods. Direct production writes from the
new system are prohibited until a cutover gate is approved.

## Deployment and observability

Hosting is intentionally undecided until deployment requirements and the legacy
Cloudflare promotion rules are confirmed. The application can run on a Next.js
compatible host; choosing a host is a separate owner decision.

CI should run lint, typecheck, formatting, unit tests, authorization tests, build,
and essential Playwright paths on pull requests. Production releases require a
reviewed promotion step. Structured logs must avoid secrets, raw webhook bodies,
card data, unnecessary PII, and ad-blocker-sensitive browser endpoint names.
Audit events capture actor, organization, action, target, before/after summaries,
request correlation ID, and timestamp.

## Accessibility and mobile quality

The primary staff layouts are designed at phone width first, with minimum
44-pixel controls, visible focus, semantic landmarks, labeled inputs, useful
errors, reduced-motion support, and color contrast meeting WCAG AA targets.
Operational paths must work without hover and tolerate intermittent mobile
connectivity without duplicating writes.

## Architecture decision records to add

Before Phase 2 merges, record decisions for hosting, inventory-number format,
reservation expiration, cost-table/view isolation, storage bucket topology,
notification provider, and the migration source of truth for each legacy table.
