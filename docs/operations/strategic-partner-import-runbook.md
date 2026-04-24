# Strategic Partner Import Runbook

This runbook describes how to activate and operate strategic partner listing imports.

**Quick start (día 0):** see [strategic-partner-day-zero-playbook.md](strategic-partner-day-zero-playbook.md) for exact SQL, admin JWT, manual sync, and public feed verification.

## 0) Prerequisite: signed explicit authorization

Before enabling any import for a partner, confirm explicit signed consent is on file using:

- `docs/legal/strategic-partner-listing-authorization-template.md`
- `docs/legal/strategic-partner-listing-authorization-onepager-es-en.md`

This is an operational checklist only; legal review and signature workflow remains outside this repo.

## 1) Partner eligibility switches

A vendor is import-eligible only when both are true:

- `official_vendors.partner_program_tier = STRATEGIC_FOUNDER`
- `official_vendors.listing_import_enabled = true`

Optional additional safety:

- Keep `official_vendors.enabled = true` for public exposure.

## 2) Data source strategy while partners are not onboarded

Current bootstrap mode supports non-production sources:

- Static JSON files: `backend/src/main/resources/vendors/sources/<vendor-slug>.json`
- Mock adapter for test vendors with slug prefix `mock-`

Do not represent bootstrap/mock data as signed partner feed.

## 3) Sync controls

Properties:

- `PARTNER_SYNC_ENABLED` (default false)
- `PARTNER_SYNC_CRON` (default `0 */30 * * * *`)
- `PARTNER_SYNC_ADAPTER_STATIC_ENABLED` (default true)
- `PARTNER_SYNC_ADAPTER_MOCK_ENABLED` (default true)

Manual admin trigger:

- `POST /api/admin/partner-sync/run`

Inspect runs:

- `GET /api/admin/partner-sync/runs`
- `GET /api/admin/partner-sync/runs?vendorId=<uuid>`

## 4) Expected sync behaviors

- `(official_vendor_id, external_id)` upsert key
- `stockQuantity <= 0` => `availability=out_of_stock`, `status=hidden`
- Missing item in latest run => `status=stale`
- Failed items are isolated and counted; run can finish in `partial`

## 5) Production activation checklist

1. Signed authorization stored (see legal docs above).
2. Vendor row verified (`slug`, location, website, badge).
3. Tier + import flag enabled.
4. Adapter route confirmed (feed/API/static bridge).
5. Manual sync run executed from admin endpoint.
6. Validate:
   - `partner_listings` rows inserted/updated
   - run status metrics in `partner_listing_sync_runs`
   - listing appears with `source=partner` in `/api/public/marketplace/listings`
7. Enable scheduled sync if desired.

## 6) Rollback/containment

- Disable import immediately with `listing_import_enabled=false`.
- Keep historical snapshot: existing rows remain available as stale/hidden based on sync rules.
- If needed, set `enabled=false` on vendor to remove from public official surface.
