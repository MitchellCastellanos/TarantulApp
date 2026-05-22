# Monarch Reptiles — founding partner catalog

## Partner record

- Slug: `monarch-reptiles`
- Tier: `STRATEGIC_FOUNDER`
- Migration: `V95__monarch_founding_partner.sql`

## Sync (WooCommerce Store API)

- Adapter: `WooCommerceStrategicPartnerListingAdapter`
- Public read: `GET https://monarchreptiles.com/wp-json/wc/store/v1/products`
- On startup (local preview): `PARTNER_SYNC_RUN_ON_STARTUP=true`
- Manual: Admin → **Run partner sync**

Env vars:

| Variable | Default |
|----------|---------|
| `PARTNER_SYNC_RUN_ON_STARTUP` | `true` |
| `PARTNER_SYNC_ADAPTER_WOOCOMMERCE_ENABLED` | `true` |
| `PARTNER_SYNC_MONARCH_BASE_URL` | `https://monarchreptiles.com` |
| `MARKETPLACE_PARTNER_FEED_HARD_CAP` | `500` |

## UI

- Banner strip: founding partner badge + **Ver catálogo completo**
- Full browse: `/marketplace?vendor=monarch-reptiles`
- Tarantula Cribs filter: promoted listings (`promoted=true` in DB)
- Mini cart → `POST /api/public/marketplace/partner-cart/handoff` → opens Monarch with `add-to-cart` URL + UTM

## Preview checklist

1. Run backend (Flyway applies V95).
2. Wait for startup sync or Admin → partner sync.
3. Open `/marketplace` — Monarch in top strip.
4. Open `/marketplace?vendor=monarch-reptiles` — full catalog by category.
5. Add items → **Completar en Monarch Reptiles**.
