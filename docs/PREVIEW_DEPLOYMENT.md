# Preview Deployment

This phase is for an isolated preview only. Do not attach the production domain,
change DNS, replace the Astro website, import production data, enable payments,
or configure real notification delivery.

## Required preview configuration

1. Create a non-production Supabase project or run the local stack.
2. Apply all migrations in timestamp order and run `supabase/seed.sql` only in a
   development project.
3. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and a
   preview-only `SUPABASE_SERVICE_ROLE_KEY` in the hosting provider.
4. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS preview URL. Until this is an
   HTTPS value, robots disallow indexing and no canonical sitemap is emitted.
5. Set `RESERVATION_EXPIRATION_HOURS` and schedule
   `npm run reservations:expire`. Keep notification delivery disabled.
6. Run `npm run check`, `npm run test:e2e`, and both SQL suites before sharing.

Build with `npm run build` and start with `npm run start`. Use a provider-generated
preview hostname. Domain cutover requires a separate approval, production data
reconciliation, redirects for legacy inventory routes, monitoring, and rollback.
