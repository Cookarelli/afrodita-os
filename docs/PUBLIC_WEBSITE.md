# Public Website and Reservation Workflow

Status: preview-ready Phase 3 implementation. The legacy Astro website remains
unchanged and authoritative until a separate cutover is approved.

## Public inventory contract

The browser never queries `appliances` directly. `list_public_appliances()` and
`get_public_appliance(public_id)` are security-definer functions with fixed
return columns. A row is public only when all of these are true:

- the organization slug is `afrodita-appliances`;
- appliance status is `available`;
- `public_visibility` is true;
- `archived_at` is null;
- the inventory location and its parent Afrodita location are active.

The projection omits database UUIDs, serial numbers, acquisition and repair
costs, minimum/manager prices, margins, supplier and purchase source, internal
notes, legacy metadata, private history, and activity logs. Public routes use the
opaque `qr_lookup_id` as their identifier. Public photos require both a
public-eligible photo record and an eligible appliance.

When local Supabase values are absent, `next dev` uses fictional records that
mirror `supabase/seed.sql`. Production builds do not silently publish that
fixture; public inventory is empty until Supabase is configured.

## Reservation transaction

`create_public_reservation()` is the only anonymous write path. It validates
inputs again in PostgreSQL, locks the appliance row with `FOR UPDATE`, verifies
that the appliance is still public and available, and relies on a partial unique
index covering `requested`, `pending_review`, and `confirmed` reservations.

In the same transaction it:

1. normalizes email and phone;
2. reuses a customer only when both contacts match exactly;
3. creates a separate customer and duplicate-review candidate for uncertain
   one-contact matches;
4. stores a delivery address when requested;
5. creates a `pending_review` reservation with a human reference and expiry;
6. moves the appliance to `reservation_pending`;
7. appends appliance history and a redacted activity record;
8. queues a provider-neutral internal notification event.

Any failure rolls the entire transaction back. Two simultaneous claims serialize
on the appliance lock; the second cannot pass the availability check. The unique
partial index is an additional invariant.

Staff can use `manage_reservation()` to extend, confirm, decline, withdraw, or
mark a reservation converted to sale. Confirming moves the appliance to
`reserved`; declining or withdrawing releases it to `available`. Customer
withdrawal is currently staff-mediated by phone or contact inquiry so an opaque
public reference is never treated as authentication.

## Expiration

The request period defaults to 24 hours and is configurable with
`RESERVATION_EXPIRATION_HOURS` from 1 to 168. Run:

```bash
npm run reservations:expire
```

The command calls a service-role-only, `SKIP LOCKED` batch function. It marks due
reservations expired, releases their appliances, and records history. Configure
the eventual hosting scheduler to invoke this command or the RPC at least every
15 minutes. The scheduler and secrets are intentionally not provisioned here.

## CRM and inquiry behavior

Exact email-and-phone matches preserve customer history. One-contact matches do
not silently merge; they create `customer_duplicate_candidates` for staff review.
Contact inquiries persist through another narrow function and queue an adapter
event. No production email or SMS is sent without approved credentials.

## Content requiring approval

- Warranty Club eligibility, price, term, coverage, exclusions, and final terms.
- Delivery area, fees, connection/removal services, and scheduling promises.
- Property-manager pricing language beyond “contact us.”
- Verified reviews and any approved review-source attribution.
- Social profile URLs, temporary notices, and future promotions.
- Public photo assets and their final alt text.
