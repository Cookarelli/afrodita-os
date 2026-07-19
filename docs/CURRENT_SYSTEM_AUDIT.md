# Current System Audit

Audit date: 2026-07-18. This is a read-only repository and public-endpoint audit;
no production data, Stripe account, Cloudflare dashboard, Supabase project, or
secret was accessed.

## Scope and evidence limits

Available source:

- `/Users/stevencook/dev/afrodita-site`: public Astro repository.
- `/Users/stevencook/dev/afrodita-appliance-pm-portal`: local Next/Supabase
  property-manager application inside a heavily modified shared worktree.
- the deployed public website and response headers from the deployed staff app.

Not available locally or through the connected GitHub account:

- `afrodita-api` Worker source and authoritative D1 schema;
- `afrodita-inventory` Vite staff-app source;
- live Cloudflare bindings, Pages build settings, D1 data, R2 settings, secrets;
- Stripe dashboard objects and webhooks.

The missing source is a blocker for a complete implementation audit. Existing
repo documentation describes those apps, but that description is not treated as
verified code.

## System inventory

### Public website: `afrodita-site`

- Framework: Astro `^6.0.8`, static output, plain JavaScript/Astro, PhotoSwipe.
- Package manager: npm (`package-lock.json`). Node requirement `>=22.12.0`.
- Hosting: documented as Cloudflare Pages; the live site is Cloudflare-served.
- Data: build-time public inventory JSON from a public R2 URL with a committed
  fallback JSON file.
- Backend: browser forms call a hardcoded Cloudflare Worker URL.
- Auth/admin: no public-site authentication; `/staff` is an entry/link surface,
  not the staff application itself.
- Tests/quality: no test runner, lint script, formatting check, or repository CI
  workflow was found. The only root scripts are dev/build/preview/Astro.

Observed public routes include home, shop/category/item variants, parts,
wholesale, Repair Club and terms, appliance rescue/repairs, delivery, cleaning,
recycling/removal, warranty, register, claim, checkout/success, about, contact,
promo, and staff.

Stripe behavior observable in source:

- Repair Club posts to a Worker checkout endpoint and redirects to Stripe;
- Stripe-hosted billing portal links are embedded publicly;
- parts checkout posts IDs to the Worker and redirects to Checkout;
- appliances and delivery/removal remain an in-store list/hold flow;
- no Stripe secret exists in the public repository, which is correct;
- webhook implementation and secret handling are in unavailable Worker source.

Inventory/reservation behavior observable in source:

- inventory is duplicated across multiple build-time fetch implementations;
- a committed fallback feed can show stale data if R2 fetch fails;
- hold forms post to the general `/leads` endpoint from several routes;
- sold/prep visibility is partly derived in Astro components, but authoritative
  filtering in the Worker/feed could not be verified;
- machine identifiers and separate legacy route patterns (`stock_id`, `short_id`,
  and catch-all short ID) should be preserved through redirects during migration.

### Existing deployed staff inventory app

- The supplied URL returns HTTP 200 through Cloudflare Pages with a strict
  referrer policy and `X-Content-Type-Options: nosniff`.
- Repository guidance describes React 19 + Vite 8, a Cloudflare Worker API, D1,
  R2 photos, Resend email, and a `VITE_API_URL` build-time variable.
- Source, package lock, tests, routes, auth implementation, and current database
  schema were not available, so their versions and security cannot be verified.

### Local property-manager portal

- Framework: Next.js 16.2.10 App Router, React 19.2.4, strict TypeScript.
- Package manager: npm. Tailwind 4, Supabase SSR/JS, Zod, React Hook Form,
  Papa Parse, and Resend.
- Hosting: no deployment configuration was found in the project directory.
- Auth: Supabase Auth with profiles when configured; otherwise an authenticated
  demo-profile cookie path.
- Database: a large `supabase/schema.sql` plus one timestamped migration. Tables
  cover property managers, technicians, profiles, service categories/vendors,
  properties, installed appliances, repair requests, inventory, appliance
  orders, warranty agreements, settings, and timeline events.
- Storage: schema and UI are “storage-ready,” but no verified bucket migrations
  or storage-object policies were found.
- Stripe: no Stripe SDK or payment implementation was found.
- Dispatch: technician records, assignment/status fields, admin dispatch UI,
  technician UI, status API, and scoped RLS are present.
- Warranty: per-property Warranty Club state, covered-appliance arrays,
  agreements, pricing settings, update/accept functions, analytics, and timeline
  triggers are present.
- Tests/CI: no unit/e2e test files, test scripts, Playwright/Vitest/Jest config,
  or local GitHub Actions workflow was found.

Local portal routes include manager dashboards/properties/inventory/orders/
repairs/settings; admin property-manager, property, inventory, dispatch,
technician, warranty, and service-category screens; owner executive, revenue,
inventory, warranty, opportunities, settings, and user screens; technician jobs;
and API routes supporting those mutations.

## What can be reused

- Public copy themes, store imagery/logo assets, category mapping, legacy URL
  redirects, inventory presentation patterns, and validated customer journeys.
- The public site's Worker endpoint contracts as migration fixtures, after the
  unavailable backend is audited.
- Property portal concepts: protected layouts, permission naming, Supabase SSR
  client pattern, RLS helper functions, tenant-scoped query shape, reservation
  function concept, dispatch workflow, timeline events, warranty agreement model,
  CSV import UX, mobile dashboard components, and notification adapter pattern.
- Business logic documented in active GitHub project plans, after reconciliation
  with production behavior and owner approval.

Reuse means porting reviewed concepts and tests, not copying the current schema
or seed wholesale.

## Security and integrity concerns

Priority findings:

1. **Fail-open demo auth in the local portal.** Missing Supabase configuration
   produces authenticated demo profiles. Safe for an explicit local demo build,
   unsafe as an implicit production fallback. Afrodita OS fails closed.
2. **Incomplete source visibility.** The production Worker/D1/R2 and staff auth
   cannot be assessed; no migration should write production data until obtained.
3. **No automated authorization tests.** The portal has meaningful RLS and server
   permission checks, but tenant isolation and cost restrictions lack tests.
4. **Schema drift risk.** A monolithic `schema.sql` and only one incremental
   migration make environment reconstruction and drift review difficult.
5. **Destructive cascades.** Several property/customer-adjacent foreign keys use
   `on delete cascade`; financial and history records need archive semantics.
6. **Financial separation absent.** The portal inventory model has price but no
   restricted acquisition-cost/profitability model or investor-safe aggregate.
7. **Public stale-data fallback.** R2 failure can silently render committed
   inventory, potentially advertising unavailable appliances.
8. **Duplicated public integration code.** R2 fetches, Worker URLs, and hold-form
   submission logic occur in multiple pages, increasing contract drift risk.
9. **Stale public content.** The live site displayed an expired Mother's Day
   promotion, old hours, a differently cased email address, repeated review
   blocks, and unverified numeric claims on the audit date.
10. **Sensitive local artifacts.** Untracked invoice drafts exist in the public
    site worktree. They were not opened or changed; repository hygiene and PII
    handling should be reviewed before any broad add/commit operation.

Additional concerns to validate later include CSP/HSTS, CORS allowlists, upload
validation, rate limiting, session refresh, webhook idempotency, audit-log
immutability, QR token entropy, backup/restore drills, and service-role usage.

## New foundation dependency note

`npm audit --omit=dev` reports two moderate findings for PostCSS bundled beneath
Next.js 16.2.10 (GHSA-qx2v-qp2m-jg93). npm's offered forced resolution would
downgrade Next.js to 9.3.3 and is not safe. Track the advisory and upgrade to a
patched stable Next.js release when available; do not apply the forced downgrade.

## Stale, duplicated, or retirement candidates

- Retire expired campaign pages/banners and obsolete hours only through an
  owner-reviewed public-site change.
- Consolidate duplicate machine detail routes after permanent redirect coverage
  and analytics review.
- Replace general lead-based holds with transactional reservations only after
  concurrency and release behavior are proven.
- Retire the fallback inventory feed once a monitored, last-known-good strategy
  can clearly label freshness and prevent sold listings.
- Do not carry forward generic vendor-coalition scope from the local PropertyOS
  portal unless Afrodita explicitly approves it.
- Never retire the Worker, D1, R2 feed, public site, or staff app until data
  reconciliation, rollback, and production acceptance gates pass.
