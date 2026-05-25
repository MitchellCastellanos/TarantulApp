# Monarch Reptiles — founding partner catalog

## Partner record

- Slug: `monarch-reptiles`
- Tier: `FOUNDING_PARTNER` (legacy `STRATEGIC_FOUNDER` still read)
- Migrations: `V95__monarch_founding_partner.sql`, `V110__partner_vendor_ecosystem_contract.sql` (`feed_config` template)
- Config: category mapping, blocked slugs, boost, `cartHandoffMode` in `official_vendors.feed_config` — not slug-specific Java

## Sync (WooCommerce Store API)

- Adapter: `WooCommerceStrategicPartnerListingAdapter` (requires `feedType=woocommerce` + `feedBaseUrl`)
- Public read: `GET {feedBaseUrl}/wp-json/wc/store/v1/products` (Monarch: `https://monarchreptiles.com`)
- On startup (optional): `PARTNER_SYNC_RUN_ON_STARTUP=true` (default **false** in prod to avoid boot-time load)
- Manual: Admin → **Run partner sync** (all) or **Test sync** on Monarch row

**Production note:** Flyway **V95** must run before sync (adds `partner_listings.promoted`). Each listing upsert uses its own DB transaction so one bad row does not poison the whole Monarch import.

Env vars:

| Variable | Default |
|----------|---------|
| `PARTNER_SYNC_RUN_ON_STARTUP` | `false` |
| `PARTNER_SYNC_ADAPTER_WOOCOMMERCE_ENABLED` | `true` |
| `feedBaseUrl` on vendor row | `https://monarchreptiles.com` (replaces legacy `PARTNER_SYNC_MONARCH_BASE_URL` env for new partners) |
| `MARKETPLACE_PARTNER_FEED_HARD_CAP` | `500` |

## UI

- Banner strip: founding partner badge + **Abrir vitrina** → `/partner/monarch-reptiles`
- Legacy URL `/marketplace?vendor=monarch-reptiles` redirects to the partner storefront
- In-app catalog with gold founding styling; **Visit Monarch website** bar stays pinned at the bottom
- Tarantula Cribs filter: promoted listings (`promoted=true` in DB)
- Mini cart → `POST /api/public/marketplace/partner-cart/handoff` → stepped product-page flow until Monarch allows batch add-to-cart URLs (**403** today). Email template: [`../ops/monarch-cart-handoff-email-to-partner.md`](../ops/monarch-cart-handoff-email-to-partner.md)

## Preview checklist

1. Run backend (Flyway applies V95).
2. Wait for startup sync or Admin → partner sync.
3. Open `/marketplace` — Monarch in top strip.
4. Open `/marketplace?vendor=monarch-reptiles` — full catalog by category.
5. Add items → **Completar en Monarch Reptiles**.
