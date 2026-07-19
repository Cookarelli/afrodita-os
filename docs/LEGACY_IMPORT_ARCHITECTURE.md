# Legacy Import Architecture

Production imports are intentionally not implemented. The unavailable D1 schema
must not be guessed. This foundation provides idempotent mapping and review
surfaces for a future read-only importer.

## Tables

- `import_batches`: organization, source system, dry-run flag, status,
  checkpoint, counts, timestamps, and creator.
- `legacy_record_mappings`: source system/entity/record ID, new entity/UUID,
  batch, status, imported timestamp, redacted metadata, and reconciliation notes.
- `import_errors`: batch/source identity, safe error code/summary, redacted source
  metadata, resolution actor/time, and notes.

Migration-sensitive domain tables also carry optional `legacy_source_system` and
`legacy_record_id`. Appliances add limited `source_metadata`; unrestricted
legacy payloads are prohibited.

## Import contract

1. Obtain authoritative read-only exports and exact schema/version information.
2. Store source files outside Git in encrypted, access-controlled staging.
3. Create a dry-run batch and process deterministic pages with checkpoints.
4. Normalize and validate with explicit source-to-target mappings.
5. Write a mapping for each inventory, customer, sale, warranty, repair,
   delivery, property-manager, photo, or history record.
6. Put ambiguous matches into `needs_review`; never infer appliance sales from a
   payment amount alone.
7. Retain only safe reconciliation metadata—never passwords, secrets, card data,
   complete webhooks, or unnecessary PII.
8. Re-run to prove idempotency and obtain owner approval before production writes.

Required reports include source/target totals, unmapped records, duplicates,
status/value translations, missing parents, photos, financial totals, and reviewed
exceptions. Two identical dry runs, tested backup/restore, and rollback are
required before cutover. Only super/owner roles may access import records.
