# Monarch outreach screenshots

Drop **real app captures** here (not AI mockups). They are served at:

`https://tarantulapp.com/outreach/monarch/<filename>`

and embedded in the **partner outreach intro** email by default.

## Required files (use these exact names)

| File | What to capture |
|------|-----------------|
| `01-storefront-wide.webp` | `/partner/monarch-reptiles` — full storefront (desktop width ~1200px) |
| `02-marketplace-card.webp` | Marketplace feed — one Monarch listing/card with partner badge visible |

## Optional

| File | What to capture |
|------|-----------------|
| `03-cart-handoff.webp` | Partner cart bar + “checkout on their site” (mobile or desktop) |

## Format

- **WebP** preferred (`.webp`); `.jpg` / `.png` also work if you rename in code.
- Width **1200px** max (emails scale to ~560px).
- No personal data / test emails in screenshots.

## Locale

One set is enough (Monarch UI is the same in ES/EN/FR). Do **not** add `-es` / `-en` unless we later ship localized captures.

## After adding files

1. Deploy frontend (static assets under `public/`).
2. Open `https://tarantulapp.com/outreach/monarch/01-storefront-wide.webp` in a browser to confirm 200.
3. Send a test intro from **Admin → Partner outreach**.
