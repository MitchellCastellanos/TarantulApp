# Partner / Vendor Ecosystem Refactor Plan

This plan turns the Monarch proof point into a config-driven partner ecosystem while keeping community sellers as the marketplace core.

## Product Model

| Layer | Data owner | Sync | Monetization | Notes |
| --- | --- | --- | --- | --- |
| Community Seller | `users` + peer `marketplace_listings` | No | Free or low-cost Vendor | Manual listings, community-first marketplace supply. |
| Verified Vendor | `users.verified_breeder` + verification submissions | No | Vendor subscription | Trust badge and manual listings. Verification already uses uploaded proof. |
| Official Partner | `official_vendors` + `partner_listings` | Approved only | Initially free/invite | External storefront, synced catalog, checkout handoff. |
| Founding Partner | `official_vendors` + `partner_listings` | Approved only | Custom strategic relationship | Limited slots, premium placement, co-marketing. Monarch is the first template. |

Automatic sync is not a Vendor subscription feature. It is gated by `official_vendors.listing_import_enabled` plus an official/founding partner tier.

## Phase 1: Ecosystem Contract

Status: implementation phase.

- Add canonical partner tiers: `OFFICIAL_PARTNER` and `FOUNDING_PARTNER`.
- Keep legacy `STRATEGIC_PARTNER` and `STRATEGIC_FOUNDER` readable during migration.
- Add `official_vendors.feed_config JSONB` for per-partner rules.
- Store Monarch's current behavior as config: tier, boost level, allowed categories, blocked Woo category slugs, category mapping, and handoff mode.
- Expand admin APIs so lead promotion and vendor updates can receive `partnerProgramTier`, `feedType`, `feedBaseUrl`, and `feedConfig`.
- Keep existing community seller and verified vendor paths untouched.

Exit criteria:

- Monarch still appears as a founding partner.
- Existing strategic partner rows migrate to canonical tiers.
- Admin responses expose `partnerTier` and `feedConfig`.
- Sync eligibility still requires official/founding tier plus import enabled.

## Phase 2: Parallel Implementation

These tracks can run in parallel after Phase 1.

### Track A: Generic Sync Rules

- Replace `MonarchWooCommerceCategoryMapper` with `GenericCategoryMapper`.
- Move category mapping, blocked category slugs, allowed marketplace categories, and boost level into `feedConfig`.
- Remove `LEGACY_WOO_SLUGS`.
- Keep Monarch tests as parity fixtures.
- Add vendor-specific stale cleanup based on config, not vendor slug.

### Track B: Admin Partner Onboarding

- Add admin fields for partner tier, feed type, feed base URL, allowed categories, blocked categories, category mapping, and boost level.
- Add per-vendor "test sync" action.
- Let admin activate storefront only after config and sync test pass.
- Keep lead conversion manual and curated.

### Track C: Generic Cart Handoff

- Rename frontend cart flow from Monarch-specific to partner-generic.
- Build labels from `vendorName` and backend handoff response.
- Use `feedBaseUrl`/`feedConfig.cartHandoffMode` for WooCommerce handoff strategy.
- Preserve Monarch fallback behavior through config.

### Track D: Marketplace Terminology And Feed Balance

- Use Seller, Verified Vendor, Official Partner, and Founding Partner consistently.
- Keep peer listings visually and algorithmically central.
- Use existing dynamic partner cap, with config-backed founding boost instead of slug-specific logic.
- Keep Monarch as proof/social proof, not as a special code path.

### Track E: Partner Operations And Analytics

- Extend existing handoff analytics to per-vendor admin summaries.
- Add sync health to admin partner rows: latest run, status, processed/upserted/skipped/stale.
- Keep public partner analytics minimal until there are enough partners to make a dashboard valuable.

## Phase 3: Rollout And Cleanup

- Run Monarch before/after parity: listing count, categories, promoted rows, cart handoff URLs, storefront rendering.
- Add one non-Monarch WooCommerce partner in disabled mode and run test sync.
- Remove remaining Monarch-specific code once parity passes.
- Update runbooks and outreach copy to reflect the new ecosystem language.
- Keep marketplace launch messaging anchored on community first, partners as density and proof.

## Deferred Until Needed

These are intentionally deferred because they depend on partner volume, traffic, or non-WooCommerce demand.

- Shopify adapter.
- HTML scraper adapter.
- Full dynamic rule engine.
- Paid partner analytics dashboards.
- Ads, affiliate tools, sponsored products, and premium storefront monetization.
