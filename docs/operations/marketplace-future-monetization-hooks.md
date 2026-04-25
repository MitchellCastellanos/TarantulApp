# Marketplace Future Monetization Hooks (Preparation Only)

This document tracks technical hooks prepared for future monetization without enabling payment flows for non-strategic vendors yet.

## Current flags (all disabled by default)

From `application.properties`:

- `app.marketplace.future-paid-storefront-enabled=false`
- `app.marketplace.future-paid-badges-enabled=false`
- `app.marketplace.strategic-bootstrap-mode=true`

Exposed to frontend/integrations via:

- `GET /api/public/marketplace/program-flags`

## Current separation that enables future monetization

- Peer listings: `marketplace_listings` (community P2P)
- Strategic partner listings: `partner_listings` (ingested, controlled)

This separation prevents strategic ingest logic from coupling to future paid storefront logic.

## Planned future extension points

1. Non-strategic vendor storefront package eligibility:
   - add vendor storefront plan table/fields
   - gate self-upload volume and feature set by plan
2. Paid badge program:
   - add badge entitlement table (time-bound)
   - publish badge metadata in listing API response
3. Billing linkage:
   - connect Stripe product IDs and entitlement sync
   - preserve existing strategic path as independent channel

## Guardrail

Do not enable paid storefront or paid badge flags until product, legal, and billing UX are complete.
