# Partner / Vendor Ecosystem Refactor Plan

Config-driven official/founding partners on top of community sellers and verified vendors. Monarch remains the first founding-partner template (data in `feed_config`, not hardcoded sync paths).

## Product Model

| Layer | Data owner | Sync | Monetization | Notes |
| --- | --- | --- | --- | --- |
| Community Seller | `users` + peer `marketplace_listings` | No | Free or low-cost Vendor | Manual listings, community-first marketplace supply. |
| Verified Vendor | `users.verified_breeder` + `vendor_verification_submissions` | No | Vendor subscription | Trust badge (`storefront_verified_at`) after admin review of uploaded proof. |
| Official Partner | `official_vendors` + `partner_listings` | Approved only | Initially free/invite | External storefront, synced catalog, checkout handoff. |
| Founding Partner | `official_vendors` + `partner_listings` | Approved only | Custom strategic relationship | Limited slots, premium placement, co-marketing. |

Automatic sync is gated by `official_vendors.listing_import_enabled` plus official/founding tier (`OFFICIAL_PARTNER` / `FOUNDING_PARTNER`). Legacy `STRATEGIC_*` tiers still read during migration.

## Implementation Status (2026-05)

| Track | Status | Notes |
| --- | --- | --- |
| Ecosystem contract (V110, tiers, `feed_config`) | Done | PR #50 |
| Admin outreach / lead promote | Done | PR #51 |
| Generic WooCommerce sync | Done | PR #52 — `GenericWooCommerceCategoryMapper`, `PartnerListingCatalogRules` |
| Generic handoff + share cards | Done | PR #53 |
| Verification emails + admin queue | Done | PR #54 |
| Partner ops summary (handoffs + sync) | Done | PR #55 |
| Per-vendor test sync (admin) | Done | `POST /admin/partner-sync/run/{vendorId}` |
| Admin badges panel (`/admin/marketplace`) | Done | PR #57 — Verified Shop queue, seller toggles, partner tier/badge, sync |
| Monarch parity runbook | Ops | See checklist below |

## Admin Ops Quick Reference

- **All partners sync:** Admin → Marketplace → Run partner sync
- **One partner:** Official vendors table → **Test sync** (requires import enabled + Woo `feedType` + `feedBaseUrl`)
- **Verified vendor queue:** Admin → Marketplace → Vendor verification queue
- **Partner config:** Edit badge/feed on vendor row; Monarch template in migration `V110__partner_vendor_ecosystem_contract.sql`

## Monarch Parity Checklist (ops)

Run after deploy or feed config change:

1. `GET /api/public/marketplace/partners` — Monarch slug present, founding tier
2. `/partner/monarch-reptiles` — storefront renders, categories populated
3. Marketplace partner strip — Monarch listed, not dominating peer listings
4. Add 2+ items to partner cart → handoff URL opens monarchreptiles.com (403 on batch add may still need partner Woo fix — see [`../ops/monarch-cart-handoff-email-to-partner.md`](../ops/monarch-cart-handoff-email-to-partner.md))
5. Admin → Ops column: handoffs 30d + latest sync `success` with reasonable upserted/processed counts

## Remaining for closure (ops + product)

Architecture and admin tooling for the four-layer model are in **main** (PRs #50–#57). To call the transformation **operationally closed**:

1. Ops uses **`/admin/marketplace`** only for badges, tiers, and sync (Admin Home links there; no duplicate vendor table).
2. **Flyway V110** applied in production (`STRATEGIC_*` rows migrated to `OFFICIAL_*` / `FOUNDING_*`).
3. At least one **official partner** besides Monarch with green test sync in admin.
4. **Monarch cart handoff** works in prod (partner Woo may need `add-to-cart` whitelist — see ops email template).

**Phase 2 (not blocking):** `feed_config` UI, Shopify/scrape adapters, partner analytics, monetization.

## Deferred Until Needed

- Shopify / HTML scraper adapters
- Full dynamic rule engine UI for `feed_config`
- Paid partner analytics dashboards
- Ads, affiliate tools, sponsored products, premium storefront monetization
