# Migration Plan

The migration is incremental and reversible. Existing Afrodita applications
remain live until an owner-approved cutover. Production data is never used for
development testing.

## Phase 0: obtain missing evidence

- Obtain read-only access or exports for `afrodita-api`, `afrodita-inventory`, the
  exact production D1 schema, R2 bucket layout, Pages build settings, and Worker
  environment-variable names.
- Produce the required Stripe integration audit before changing payment logic.
- Inventory authoritative row counts and status/value vocabularies without
  copying secrets or card data.
- Confirm hosting choice, environments, backup ownership, and release promotion.
- Resolve the questions at the end of this document.

Exit gate: every legacy source and owner is named; production backups and restore
steps have been tested; no source system remains inferred from documentation.

## Phase 1: foundation (this repository)

- Establish Next.js, strict TypeScript, Tailwind, Supabase/Stripe dependencies,
  validation, formatting, lint, Vitest, and Playwright.
- Record architecture, audit, roles, data model, and migration gates.
- Keep all production integration disabled.

Exit gate: clean local checks and architecture approval.

## Phase 2: database, authentication, and authorization

- Create small timestamped Supabase migrations for organizations, locations,
  profiles/memberships, roles, overrides, and invitations first.
- Add domain tables in dependency order, generated TypeScript database types,
  indexes, constraints, archive states, audit logging, and private storage buckets.
- Implement invite, accept-invite, login, logout, and forgot-password flows.
- Create no real account without an explicit email. Use fictional test users and
  pending staff invitation templates for the four named employees.
- Implement RLS and server authorization together; add denial/tenant-isolation/
  cost-visibility tests before feature UI.

Exit gate: a fresh local Supabase database can be rebuilt only from migrations;
all cross-role negative tests pass.

## Phase 3: read-only legacy import and reconciliation

- Export legacy data into encrypted, access-controlled staging; never commit it.
- Define explicit mappings from D1/portal fields and statuses to Afrodita OS.
- Import organizations, locations, staff references, customers, properties,
  appliances/photos, warranties, repairs, deliveries, and history in dry-run mode.
- Preserve legacy IDs in a dedicated mapping table; do not reuse them as new UUIDs
  or infer appliance matches from payment amount.
- Produce per-table totals, rejected rows, duplicate candidates, and referential
  integrity reports. Human-review ambiguous customers/appliances/payments.

Exit gate: two repeatable dry runs yield identical results and owner-approved
reconciliation totals.

## Phase 4: public read path and reservations

- Build public-safe inventory views and a versioned feed/API.
- Rebuild public routes with correct store data and redirects for legacy URLs.
- Implement atomic reservation requests, staff approval/decline/expiry, status
  history, and automated release. Do not collect card data.
- Test homepage-to-reservation, concurrent reservation attempts, sold visibility,
  accessibility, mobile layout, SEO, and performance.
- Initially shadow traffic or compare old/new inventory output without changing
  the current public site.

Exit gate: zero public leakage of serial/cost/internal fields, sold items vanish,
and inventory reconciliation remains exact.

## Phase 5: internal operations

- Add inventory intake/status/photo/QR, CRM, reservation-to-sale conversion,
  delivery/repair/warranty workflows, tasks, and role-aware dashboards.
- Port proven dispatch, warranty timeline, import, and notification concepts from
  the local portal after schema review.
- Ensure financial metrics label actual, estimated, and incomplete data.
- Preview daily reports; do not enable production email until credentials and
  recipients are approved.

Exit gate: staff acceptance on phones; transaction/concurrency and authorization
tests pass; legacy staff app remains the rollback path.

## Phase 6: property-manager portal

- Migrate one fictional and then one approved pilot company.
- Add company admin/staff invitations, properties/units/assets, requests,
  service, deliveries, warranties, purchases, contacts, and billing read views.
- Test every tenant table, storage path, and aggregate for cross-company denial.
- Keep customer retail data and other companies entirely inaccessible.

Exit gate: automated tenant-isolation suite plus pilot acceptance and export.

## Phase 7: Stripe adapter and historical reconciliation

- First create `docs/STRIPE_INTEGRATION_AUDIT.md` from source and dashboard
  discovery; do not print keys or payloads.
- Add server-only adapters, configuration validation, raw-body signature
  verification, idempotent events, payment/refund/dispute records, and an
  unmatched-payment review queue.
- Import test-mode history read-only with checkpoints, pagination, dry runs,
  idempotency, rate-limit handling, and reconciliation.
- Enable only approved event types. Keep appliance checkout as Reserve Now.

Exit gate: signed test events and replay tests pass; authorized humans approve
unmatched mappings and the production setup checklist.

## Phase 8: controlled cutover

- Freeze relevant legacy writes for a short, announced window or use a proven
  incremental sync.
- Take backups, run final import/reconciliation, smoke-test critical flows, and
  switch one surface at a time.
- Monitor errors, reservation conflicts, inventory freshness, login success,
  webhook health, and row counts.
- Keep documented rollback routes and do not delete legacy systems after launch.

## Reuse, migrate, retire

Reuse after review: public brand assets/content, categories and redirects;
Supabase SSR/RLS patterns; property, appliance, dispatch, warranty, timeline,
CSV-import, and notification concepts.

Migrate with explicit mappings: inventory and photos, status history, customers,
sales/payments references, warranties/Repair Club, claims/repairs, deliveries,
property-manager companies/properties/assets, and audit history.

Retire only after acceptance: stale promotions/hours, committed fallback
inventory, duplicate detail routes, general lead-based holds, implicit demo auth,
monolithic schema snapshots as the deployment mechanism, and duplicated Worker
URL/fetch/form logic.

## Unresolved questions

1. Where are the current `afrodita-api` and `afrodita-inventory` sources, and who
   can provide read-only access plus their `AGENTS.md` files?
2. Is the local `afrodita-appliance-pm-portal` an Afrodita-owned product, an
   experiment, or a separate Optimize Local product? Which data is authoritative?
3. Which host should run Next.js, and must the established Cloudflare `release`
   branch promotion convention apply to this new repository?
4. What inventory-number format and QR label dimensions should be used?
5. How long should an unconfirmed reservation hold inventory?
6. Which store location(s), inventory locations, tax rules, delivery zones/fees,
   warranty terms, and minimum-price approval rules are authoritative?
7. Which public claims, reviews, Repair/Warranty Club names, prices, and benefits
   are approved? The deployed site conflicts with the supplied hours and contains
   expired/unverified content.
8. What email should be used for Steven's invitation? Erika's email must remain
   unknown until supplied; Mikey's and Carlo's are also required.
9. Which historical Squarespace/Stripe memberships remain active, and should they
   remain externally billed rather than migrated?
10. What data, if any, may be shared with CNC Appliance Parts, and through which
    approved contract?
