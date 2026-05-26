# Partner / vendor ecosystem — closure checklist

Use after deploy (Flyway through **V111**). The admin panel shows live status at **Admin → Marketplace & badges** (`/admin/marketplace`).

## Automated status API

`GET /api/admin/partner-ecosystem/closure-status` (admin auth)

Returns `checks[]` with `id`, `ok`, `detail` and `allChecksPass`.

## Manual verification

| # | Check | How |
| --- | --- | --- |
| 1 | No `STRATEGIC_*` in `official_vendors.partner_program_tier` | Closure API or SQL |
| 2 | Monarch `monarch-reptiles`: founding tier, import on, enabled | Admin marketplace partners table |
| 3 | Monarch test sync `success` | **Test sync** on Monarch row |
| 4 | `/partner/monarch-reptiles` loads with categories | Browser |
| 5 | Multi-item cart handoff uses `/cart/?add-to-cart=id:qty` | Add 2+ items → continue; URL should hit `/cart/` (colon format) |
| 6 | Second official partner (non-Monarch) with import on | Promote lead or create vendor; test sync |
| 7 | Verified Shop queue + vendor activation | Same admin page |

## Monarch cart (partner Woo)

If batch handoff still fails, forward [`../ops/monarch-cart-handoff-email-to-partner.md`](../ops/monarch-cart-handoff-email-to-partner.md). App now prefers colon cart URLs first.

## Code complete (main)

PRs #50–#57 + closure commit: generic sync, handoff, verification admin, badges panel, i18n, V111 migration, feed_config modal, closure checklist UI.
