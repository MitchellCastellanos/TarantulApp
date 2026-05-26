# Official Partner outreach kit (ES / EN / FR)

Internal playbook for inviting WooCommerce shops as **Official Partners** (free, catalog sync, checkout on their site).

## Admin panel (Phase 2)

**Route:** `/admin/partner-outreach` (after Phase 2 frontend)

**API (Phase 1 — available now):**

| Action | Method | Path |
|--------|--------|------|
| List leads | GET | `/api/admin/official-vendor-leads` |
| Create/update candidate | POST | `/api/admin/official-vendor-leads/outreach` |
| Save checklist + notes | PATCH | `/api/admin/official-vendor-leads/{id}/outreach` |
| Probe Woo (no save) | POST | `/api/admin/official-vendor-leads/probe-woocommerce` |
| Probe Woo + save on lead | POST | `/api/admin/official-vendor-leads/{id}/probe-woocommerce` |
| Send email | POST | `/api/admin/official-vendor-leads/{id}/send-outreach-email` |

**Send email body:**

```json
{
  "template": "partner_outreach_intro",
  "locale": "es",
  "attachOnePager": true
}
```

Templates: `partner_outreach_intro` (cold invite), `partner_catalog_live` (after go-live, lead should be `converted`).

## Qualification checklist (JSON on lead)

| Key | Meaning |
|-----|---------|
| `wooCommerce` | Store API reachable (`/wp-json/wc/store/v1/products`) |
| `catalogRelevant` | Tarantulas / feeders / substrates / enclosures |
| `shippingFit` | Ships to your target regions |
| `legalSent` | Authorization one-pager sent/signed |
| `demoSent` | Monarch example + call done |
| `readyToPromote` | OK to promote → vendor row |

## One-pagers (email attachment)

**PDF attachments** (emailed when `attachOnePager: true`):

| File on disk | Recipient sees |
|--------------|----------------|
| `backend/src/main/resources/outreach/official-partner-onepager-es.pdf` | `TarantulApp-Official-Partner-es.pdf` |
| `backend/src/main/resources/outreach/official-partner-onepager-en.pdf` | `TarantulApp-Official-Partner-en.pdf` |
| `backend/src/main/resources/outreach/official-partner-onepager-fr.pdf` | `TarantulApp-Official-Partner-fr.pdf` |

**Markdown source** (edit copy / ChatGPT; not attached to email):

- `official-partner-onepager-es.md`, `-en.md`, `-fr.md` in the same folder

## Monarch screenshots (intro email)

Save real captures under:

`frontend/public/outreach/monarch/`

| File | Capture |
|------|---------|
| `01-storefront-wide.webp` | `/partner/monarch-reptiles` (desktop) |
| `02-marketplace-card.webp` | Marketplace listing with partner badge |
| `03-cart-handoff.webp` | (optional) Partner cart bar |

Public URLs: `https://tarantulapp.com/outreach/monarch/<filename>`

See [`frontend/public/outreach/monarch/README.md`](../../frontend/public/outreach/monarch/README.md).

## Legal

- [`../legal/strategic-partner-listing-authorization-onepager-es-en.md`](../legal/strategic-partner-listing-authorization-onepager-es-en.md)

## Live demo links

- Founding example: https://tarantulapp.com/partner/monarch-reptiles  
- Primary CTA: **reply to outreach email**. Optional self-serve: https://tarantulapp.com/partners  

## After they say yes

1. Promote lead → Official Partner (`/admin/marketplace`).  
2. `listing_import_enabled` + test sync.  
3. `enabled` + email `partner_catalog_live`.  
4. Optional: cart handoff email [`partner-cart-handoff-email-template.md`](partner-cart-handoff-email-template.md).
