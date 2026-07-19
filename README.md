# Afrodita OS

Afrodita OS is the planned mobile-first operations platform for **Afrodita White
Goods LLC**, publicly known as **Afrodita Appliances**. It will unify inventory,
reservations, customers, sales, delivery, repair, warranty, reporting, and a
tenant-isolated property-manager portal without deleting the current website or
staff inventory application.

This repository contains the Phase 2 database and authorization foundation plus
the **Phase 3 public website and reservation workflow**. It has no production
database, real user accounts, payment processing, or production deployment.

## Business reference

- Store: Afrodita Appliances
- Address: 5205 N. 2nd St., Loves Park, IL 61111
- Phone: 815-222-3679
- Email: AfroditaAppliances@gmail.com
- Hours: Monday-Saturday 11:00 AM-8:00 PM; Sunday 11:00 AM-5:00 PM
- Public site: <https://afroditaappliances.com>
- Existing staff app: <https://afrodita-inventory.pages.dev/>

## Stack

- Next.js 16 App Router and React 19
- strict TypeScript
- Tailwind CSS 4
- Supabase PostgreSQL, Auth, RLS, and Storage (planned; not provisioned)
- Stripe SDK (adapter foundation only; no payment route yet)
- Zod and React Hook Form
- ESLint and Prettier
- Vitest and Playwright
- npm with a committed lockfile

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Supabase-backed routes will intentionally fail with a clear configuration error
until valid development values are supplied. Afrodita OS never substitutes an
authenticated demo user when configuration is absent.

Public pages use fictional seed-mirroring inventory during `next dev` when
Supabase is absent. That preview fallback is disabled in production builds.

## Checks

```bash
npm run lint
npm run typecheck
npm run format:check
npm test
npm run build
npm run test:e2e
```

Playwright requires its Chromium browser binary (`npx playwright install
chromium`) before the first end-to-end run.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Current system audit](docs/CURRENT_SYSTEM_AUDIT.md)
- [Migration plan](docs/MIGRATION_PLAN.md)
- [Role permissions](docs/ROLE_PERMISSIONS.md)
- [Proposed data model](docs/DATA_MODEL.md)
- [Authentication](docs/AUTHENTICATION.md)
- [RLS and storage security](docs/RLS_SECURITY.md)
- [User invitations](docs/USER_INVITATIONS.md)
- [Legacy import architecture](docs/LEGACY_IMPORT_ARCHITECTURE.md)
- [Public website and reservations](docs/PUBLIC_WEBSITE.md)
- [Preview deployment](docs/PREVIEW_DEPLOYMENT.md)

## Safety rules

- Never commit `.env` or credentials.
- Never expose the Supabase service-role key or Stripe secret key to browser code.
- Never run migrations or imports against production without an approved backup,
  dry run, reconciliation report, and rollback plan.
- Keep the existing public site and inventory application operational until
  acceptance tests and a deliberate cutover are complete.
- Authorization belongs in RLS and server-side code, not only in navigation.
- Customer and financial records are archived rather than hard-deleted.

## Status and next step

Phase 3 adds the replacement public website, safe public inventory projections,
CRM-backed reservation requests, concurrency protection, inquiry persistence,
SEO, analytics adapters, and preview instructions. The next implementation step
is the internal inventory, CRM, QR-code, reservation-management, and staff
dashboard interface. Production imports, notifications, payments, deployment,
and domain cutover remain disabled.
