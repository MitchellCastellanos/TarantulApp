# 🕷️ TarantulApp — Specimen Passport Pre-Build Audit

**Prepared as:** Senior Product Architect + Senior Software Engineer
**Date:** 2026-05-29 · **Branch:** `claude/specimen-passport-audit-eDsha`
**Scope:** Read-only inventory. No code written, no files modified.

**Stack:** Spring Boot (Java/Maven) backend at `backend/src/main/java/com/tarantulapp` · React 18 + Vite + Capacitor (Android/iOS) frontend at `frontend/src` · PostgreSQL via Flyway migrations (currently ~V107+).

> **Headline finding:** ~70% of the Specimen Passport vision already exists in some form. The two genuinely missing pieces are (1) a **pre-printable, unclaimed identifier** (today every QR points to an *already-owned* specimen or a generic species page) and (2) a **claim/ownership-transfer flow** (zero transfer logic exists anywhere). Everything else — QR generation, bulk DOCX printing, public pages, species data, vendor origin identity, and programmatic Pro-day grants — is built and reusable.

---

## 1. Existing QR Architecture

QR codes are **generated entirely client-side**. There is no backend QR-image endpoint; the backend only serves the *data* that the frontend encodes into a URL.

### Libraries
| Library | Version | Role | Where |
|---|---|---|---|
| `react-qr-code` | 2.0.12 | Live SVG QR in UI previews | `QrToolPage.jsx:5`, `QrBulkPrintPage.jsx:10`, `QRModal.jsx:2` |
| `qrcode` | 1.5.4 | PNG QR for printing (canvas) | `frontend/src/utils/qrBrandComposite.js:1,343` |
| `html5-qrcode` | 2.3.8 | Camera scanning (Android/web) | `QrToolPage.jsx:382` (dynamic import) |
| `@capacitor/barcode-scanner` | 3.0.2 | Native iOS/Android scanning | `QrToolPage.jsx:486` |

### QR types that exist (only **two**)
URL resolution logic lives in `frontend/src/utils/qrLabelOptions.js:42` (`resolveQrUrl`) and `frontend/src/utils/publicFrontBaseUrl.js:23,30`:

| QR type | Encoded URL | Resolves to | Backend data source |
|---|---|---|---|
| **Specimen QR** | `{origin}/t/{shortId}` | `/t/:shortId` → `PublicProfilePage` | `GET /api/public/t/{shortId}` (`PublicController.java:40`) |
| **Species QR** | `{origin}/discover/species/{speciesId}` | `/discover/species/:id` → `DiscoverSpeciesDetailPage` | `GET /api/public/discover/species/{id}` (`PublicDiscoverController.java:81`) |

There is **no** dedicated vendor/storefront QR, marketplace-listing QR, or public-profile (keeper) QR. The "vendor QR" concept does not exist yet.

### What is encoded
Just a URL string (origin resolved from `VITE_PUBLIC_SITE_URL`, fallback `https://tarantulapp.com`). The specimen QR requires a `shortId` that **already exists** on a Tarantula row owned by a user — this is the central blocker for vendor pre-printing.

### Scanning
`QrToolPage.jsx` supports camera scanning. `resolveAppPathFromScan()` (`QrToolPage.jsx:43`) only recognizes `/t/...` paths and navigates internally; anything else shows "unrecognized."

### Usage tracking
`POST /api/marketplace/engagement/qr-print` (`MarketplaceController.java:160`) increments `user.qrPrintExports` (a Keeper-Reputation gamification axis). Called from both QR pages after a download.

---

## 2. Existing Public Pages

**Router:** `frontend/src/App.jsx`. Guards: `PrivateRoute` (87–111), `AdminRoute` (113), `AdminOnlyRoute` (121). **No SSR/prerendering** — pure SPA with runtime meta updates via `usePageSeo` hook (`frontend/src/hooks/usePageSeo.js`). Sitemap + robots.txt generated at build time by `frontend/vite-plugin-site-seo.js`.

### Public (unauthenticated) routes
| Route | Component | Purpose | Data source | SEO indexed |
|---|---|---|---|---|
| `/t/:shortId` | `PublicProfilePage` | **Individual specimen profile** | `GET /api/public/t/{shortId}` | ⚠️ Public but **not in sitemap**, no `usePageSeo` |
| `/discover/species/:id` | `DiscoverSpeciesDetailPage` | Species care + marketplace listings | `GET /api/public/discover/species/{id}` | ✅ Yes — meta + JSON-LD (WebPage/Taxon/ItemList) |
| `/discover` `/discover/catalog` `/discover/compare` `/discover/taxon/:gbifKey` | Discover suite | Species browse/compare | `PublicDiscoverController` | ✅ Yes |
| `/u/:handle` | `PublicKeeperProfilePage` | Keeper profile + reputation | `GET /api/public/users/by-handle/{handle}` | ⚠️ Public, not in sitemap |
| `/marketplace` `/marketplace/listing/:id` | Marketplace | Listings browse/detail | `PublicMarketplaceController` | ✅ Yes |
| `/shop/:handle` | `MarketplaceStorefrontPage` | Keeper storefront | `GET /api/public/marketplace/storefronts/{handle}` | ✅ Yes |
| `/partner/:slug` | `PartnerStorefrontPage` | Official partner storefront | `GET /api/public/marketplace/partners/{slug}` | ✅ Yes |
| `/tools/qr` | `QrToolPage` | QR label generator | client | ✅ in sitemap |
| `/sex-id` `/sex-id/:caseId` | Sex-ID | Community sexing cases | `PublicSexIdCaseController` | partial |
| `/pro` `/about` `/contact` `/privacy` `/terms` `/partners` `/launch` `/beta/apply` `/vendor-invite` | Static/marketing | various | mixed | mostly yes |

### Backend public surface
`SecurityConfig.java` + `PublicSurfaceSecurityConfig.java`. The blanket rule is `permitAll` on `/api/public/**` (`SecurityConfig.java:166`), plus `/api/species/**`, `/api/gbif/**`, `/api/auth/*` login/register, `/api/billing/webhook`, `/actuator/health`.

**SEO note for Passport:** Since the app is a client-rendered SPA, public Passport pages would need the same `usePageSeo` + sitemap treatment that species pages already have. `PublicSpeciesController` already exposes `GET /api/public/species/{id}/seo-snapshot` and `GET /api/public/species/sitemap-entries` — a reusable SEO pattern.

---

## 3. Existing Specimen System

The "specimen" **is** the `Tarantula` entity.

**Entity:** `backend/src/main/java/com/tarantulapp/entity/Tarantula.java` · **Migration:** `V4__create_tarantulas.sql`

| Concept | Implementation |
|---|---|
| Primary key | `UUID id` (`GenerationType.UUID`) |
| **Public identifier** | **`shortId`** — `VARCHAR(10) UNIQUE NOT NULL`, an 8-char hex string generated in `TarantulaService.java:844`. Drives `/t/{shortId}` and all QR codes. **This is effectively a per-specimen permanent ID already.** |
| Owner | `userId` UUID FK → `users.id`, **`ON DELETE CASCADE`** |
| Species | `speciesId` INT FK → `species.id`, `ON DELETE SET NULL` |
| Visibility | `isPublic` boolean (default TRUE since V105); user-level default `users.default_tarantula_public` (V104) |
| Other | `name, stage, sex, currentSizeCm, purchaseDate, profilePhoto, notes, deceasedAt, spotlightAt` |

**Service/Controller:** `TarantulaService.java` / `TarantulaController.java` — full CRUD at `/api/tarantulas`, plus `PATCH .../visibility`, `PATCH /bulk-visibility`, `PATCH .../deceased`, photos, timeline. Ownership is enforced everywhere via `getOwned(id, userId)` (`TarantulaService.java:622`).

**Public view:** `TarantulaService.getPublicProfile(shortId)` (line 324) — returns name/stage/sex/size/photo, species info, status, last fed/molt, spood (like) count, keeper handle. Owners (authenticated) bypass the `isPublic` check.

**Collections:** There is **no Collection entity**. A "collection" = *all Tarantula rows where `userId = me`*.

**Ownership/transfer:** Owner is a simple FK equality check. There is **no way to change owner**.

---

## 4. Existing Vendor Functionality

**Two vendor models exist:**

1. **Verified Breeder (peer vendor)** — `users.verified_breeder` flag (V74). Activated via:
   - Admin invite → `VendorInviteService.accept()` (V94, 14-day token)
   - México free starter → `BillingController.activateVendorMxStarter()`
   - Paid Stripe subscription → `BillingService.activateVendorAfterPaidSubscription()`
   - Verification submission: `POST /api/marketplace/vendor-verification` → `VendorVerificationSubmission`

2. **Official Vendor / Partner (institutional)** — `entity/OfficialVendor.java` with `slug`, `feedType` (woocommerce/shopify/lightspeed/csv/mock), `partnerProgramTier` (FOUNDING_PARTNER, etc.). Catalog auto-synced via `service/vendors/sync/PartnerListingSyncService.java` into `PartnerListing` rows.

| Capability | Where |
|---|---|
| Listing creation | `POST /api/marketplace/listings` → `MarketplaceService.createListing()` (caps: FREE 5 / PRO 25 / VENDOR 250) |
| Storefront profile | `PUT /api/marketplace/keeper-profile` (V73: storefront name/tagline/shipping/lag policy) |
| Storefront pages | `/shop/:handle`, `/partner/:slug` |
| Seller analytics | `GET /api/marketplace/seller/analytics` + `ListingEvent` (V96) |
| Listing boost | one-time ~$2 Stripe, or `VendorBoostCredit` (7-day boosts, V103) |
| Inventory mgmt | partner feed sync (`stock_quantity`, `availability`); peer listings are manual |
| **Bulk operations** | ❌ none for listings; the only "bulk" is the QR DOCX (§5) |
| **Vendor dashboard** | `MarketplaceSellerPage.jsx` (the "Seller Hub") — listings, analytics, boost ROI |

There is **no link** between a marketplace listing and an actual `Tarantula` specimen — listings are free-text (`species_name`, `stage`, `price`), not specimen records.

---

## 5. Existing Label Printing Capabilities

**Primary file:** `frontend/src/pages/QrBulkPrintPage.jsx` + `frontend/src/utils/buildQrBulkDocx.js` + `frontend/src/utils/qrBrandComposite.js`.

- **Output format:** `.docx` (Word) via the `docx` library — *not PDF*. (`jspdf` is used only for single-specimen **care sheets** in `pdfExportService.js`, which carry no QR.)
- **Bulk cap:** `QR_BULK_MAX = 60` QRs per document (`buildQrBulkDocx.js:16`).
- **Page:** US Letter, 0.3" margins. Layouts: **Fixed** (2-col, QR size 2–6 cm) and **Flex** (4-col without care facts, 2-col with).
- **Label content:** brand-composited QR PNG + specimen name + scientific name + optional ~8 care-fact lines (temperament, world/habitat, ventilation, temp, humidity, size, growth, substrate, origin) from `careFacts.js`.
- **Source of items:** the **current user's own specimens** — each QR encodes an existing `shortId` or the species URL.

### ❓ Can a vendor print 10 / 50 / 100 / 500 labels efficiently?
**No.** Three hard limits:
1. **60-QR cap** per document → can't do 100 or 500 in one pass.
2. **Every label requires a pre-existing specimen owned by the vendor.** A vendor cannot print labels for 500 slings they're about to sell, because there are no specimen rows for them (and creating 500 dummy Tarantulas would blow past free/Pro quota and pollute their collection).
3. **DOCX, not print-ready PDF** with label-sheet calibration (e.g., Avery templates) — workable but not optimized for label stock.

**Missing for the vision:** a way to mint *unclaimed* passport IDs in bulk (decoupled from specimen rows), a higher/uncapped batch size, and ideally a PDF label-sheet template.

---

## 6. Existing Claiming / Ownership Concepts

Exhaustive search across backend + frontend for `claim`, `ownership`, `transfer`, `adopt`, `adoption`, `register/attach/import specimen`, `handoff`, `provenance`, `origin`, `reassign`:

| Term | Found? | What it actually is |
|---|---|---|
| `handoff` | ✅ | **Marketplace cart handoff** to partner WooCommerce stores (`PartnerCartHandoffService.java`) — unrelated to specimens |
| `origin` / `originRegion` | ✅ | **Species** biogeographic origin (`Species.java:22`) — not specimen provenance |
| `provenance` | ⚠️ | Only in care/species comments |
| `claim`, `transfer`, `adopt`, `register/attach/import specimen`, `reassign`, ownership history | ❌ | **Nothing exists** |

**Reusable bones for a claim flow:** the ownership-enforcement pattern (`getOwned`), `create()` (which already stamps `userId` + generates `shortId`), and the public-profile owner-vs-visitor detection (`isQrProfileOwner`, `tryGetCurrentUserId`). But the act of moving/assigning ownership must be built from scratch.

---

## 7. Existing Subscription Hooks

This is the **strongest** reusable asset.

- **Trial model:** `users.plan` (FREE/PRO) + `users.trial_ends_at` (V18). New users get a trial on signup.
- **Pro-day ledger:** `ProDayGrant` entity + `pro_day_grants` table (V92). Sources enum (`ProDayGrantSource`): `REFERRAL_SIGNUP`, `REFERRAL_MILESTONE`, `ADMIN`, `LEGACY_MIGRATION`.
- **The reusable method:**

```java
// ProDayGrantService.java:53
@Transactional
public ProDayGrant recordGrant(User user, int days, ProDayGrantSource source,
                               String reason, UUID grantedByAdminId)
```
This **extends `trial_ends_at` by N days, writes a ledger row, and emails the user** automatically. Already called by the referral system.

- **Referral system:** `ReferralCode` / `ReferralRedemption`. Signup grants +3 days to both parties; milestones at 1/3/5/10/25 referrals grant 7/14/30/90/badge days. Vendor codes grant `VendorBoostCredit` instead. API: `GET /api/referrals/me`.
- **Coupon/promo codes:** ❌ **none.** Referral codes are the closest analog.
- **Billing:** Stripe (web Checkout + webhook) and Google Play (`cordova-plugin-purchase` → `BillingService.verifyGooglePlaySubscription()`) both write the `Subscription` entity.

### ❓ Could a QR scan grant "1 month Pro"?
**Yes — trivially, via the existing ledger.** The exact reuse:

```java
proDayGrantService.recordGrant(
    user,
    30,                              // 1 month
    ProDayGrantSource.PASSPORT_CLAIM,// add one enum value (optional 1-line column-widen migration)
    "Specimen Passport claim",
    null                             // no admin
);
```
No new subscription plumbing is required. The only new pieces are (a) an enum value for attribution and (b) an anti-abuse guard (one grant per user, or per passport) — which is exactly the pattern the referral `referral_milestone_mask` and unique `referee_user_id` already model.

---

## 8. Gap Analysis vs. Specimen Passport Vision

| # | Requirement | Status | Why |
|---|---|---|---|
| 1 | Vendor prints QR label | 🟡 **Partial** | Bulk DOCX QR printing exists, but capped at 60 and every label needs a pre-existing specimen the vendor owns. No "unclaimed" labels. |
| 2 | Customer scans QR | ✅ **Exists** | Camera scanning (`QrToolPage`) + public route resolution. Would extend `resolveAppPathFromScan` to a new `/p/...` path. |
| 3 | QR shows species information | ✅ **Exists** | `/discover/species/:id` is a rich, SEO-indexed public species page. Species QR already does exactly this. |
| 4 | Customer can claim specimen | 🔴 **Missing** | Zero claim/transfer logic anywhere in the repo. |
| 5 | Claim creates specimen in collection | 🟡 **Partial** | `TarantulaService.create()` already mints a specimen + `shortId` for a user — but there's no trigger that does this *from a scanned passport* rather than a manual form. |
| 6 | Claim grants free trial | ✅ **Exists (mechanism)** | `ProDayGrantService.recordGrant(...)` does precisely this; only needs a caller + abuse guard. |
| 7 | Specimen gets permanent passport ID | 🟡 **Partial** | `shortId` is already a permanent unique per-specimen ID — but it's *created at specimen-creation time by the owner*, not pre-minted by a vendor before a customer exists. Needs to exist **before** ownership. |
| 8 | Origin vendor recorded | 🔴 **Missing** | Tarantula has no `origin_vendor_id`. Vendor identity (`OfficialVendor`, `verified_breeder`) exists, but no link to a specimen. |
| 9 | Ownership history (future) | 🔴 **Missing** | No history table; FK is single-valued with cascade delete. |

**Net:** The data-display half (QR → species page → public specimen page) and the reward half (Pro grant) are done. The missing core is a **pre-minted, unclaimed identifier** + a **claim transaction** that binds it to a user and records the origin vendor.

---

## 9. Recommended Architecture (design only — not implemented)

**Guiding principle:** the `shortId` is *already* a permanent public specimen identifier with a working public page (`/t/{shortId}`) and QR pipeline. The cleanest design makes a **Passport the pre-birth state of a specimen's `shortId`**, so claiming simply "hydrates" an existing identifier into a real `Tarantula`.

### Option A — Minimal new table (recommended)
Add **one** lightweight table, reuse everything else:

```
specimen_passport
  passport_id        VARCHAR(10) PK   -- minted with the SAME generator as shortId
  species_id         INT FK  (nullable)        -- what the label/QR shows
  origin_vendor_id   UUID/INT FK              -- verified_breeder user OR official_vendor
  status             ENUM(UNCLAIMED, CLAIMED, VOID)
  claimed_by_user_id UUID FK  (nullable)
  claimed_tarantula  UUID FK  (nullable)      -- the Tarantula created on claim
  created_at / claimed_at
```

**Flows, all reusing existing code:**
- **Bulk mint + print:** new vendor endpoint mints N `UNCLAIMED` passports (raise/remove the 60 cap for vendors); QR encodes `/p/{passport_id}`. Reuse `buildQrBulkDocx.js` by adding a `passport` QR-target mode alongside the existing `species`/`specimen` modes in `qrLabelOptions.js`.
- **Public scan page `/p/{passport_id}`:** reuse the species public page rendering for the "shows species info" requirement + a "Claim this specimen" CTA. Reuse the `usePageSeo`/sitemap pattern.
- **Claim:** authenticated `POST /api/passports/{id}/claim` →
  1. `TarantulaService.create()` for the user, **setting the new specimen's `shortId = passport_id`** (so `/t/{passport_id}` works immediately and the printed QR keeps resolving),
  2. set passport `status=CLAIMED`, link `claimed_by_user_id` + `claimed_tarantula`,
  3. `proDayGrantService.recordGrant(user, 30, PASSPORT_CLAIM, ...)` for the trial,
  4. record origin via a new nullable `Tarantula.origin_vendor_id` column (small alter, no new table).
- **Anti-abuse:** passport can only be claimed once (`status` guard); one Pro grant per passport.
- **Future ownership transfers:** a thin `specimen_ownership_event` append-only log can be added later without touching the above; the passport row is the stable anchor.

### Option B — No new table (extend Tarantula)
Pre-create `Tarantula` rows owned by the vendor with a `claimable` flag + `origin_vendor_id`, and "transfer" on claim by reassigning `userId`. **Reuses the most code but** pollutes vendor collections, fights the free/Pro quota counters, and the cascade-delete + single-owner FK make transfer semantics awkward. **Not recommended** vs. Option A's clean separation.

**Reuse summary (Option A):** `shortId` generator, `/t/{shortId}` + `PublicProfilePage`, species public page, `QrBulkPrintPage`/`buildQrBulkDocx`, `ProDayGrantService.recordGrant`, vendor identity (`verified_breeder`/`OfficialVendor`), `usePageSeo`/sitemap. **New:** 1 table, 1 `Tarantula` column, 1 enum value, ~3 endpoints (mint, public-view, claim), 1 QR-target mode, 1 public route.

---

## 10. Mermaid Diagram (current architecture + Passport overlay)

Solid = exists today; **red/dashed** = the gaps to build.

```mermaid
flowchart TD
    subgraph VENDOR["Vendor"]
        V1["Verified Breeder / Official Vendor<br/>users.verified_breeder · OfficialVendor"]
        V2["Seller Hub<br/>MarketplaceSellerPage.jsx"]
    end

    subgraph QRGEN["QR Generation (client-side)"]
        Q1["QrBulkPrintPage.jsx<br/>buildQrBulkDocx.js · max 60 · DOCX"]
        Q2["qrBrandComposite.js<br/>qrcode PNG + brand"]
    end

    subgraph PUBLIC["Public Pages (SPA, permitAll)"]
        P1["/t/:shortId<br/>PublicProfilePage<br/>GET /api/public/t/{shortId}"]
        P2["/discover/species/:id<br/>DiscoverSpeciesDetailPage<br/>GET /api/public/discover/species/{id}"]
    end

    subgraph DATA["Specimen System"]
        D1["Tarantula entity<br/>UUID id · shortId(unique) · userId · speciesId · isPublic"]
        D2["TarantulaService.create()<br/>stamps userId + mints shortId"]
        D3["Species entity"]
    end

    subgraph SUB["Subscription / Rewards"]
        S1["ProDayGrantService.recordGrant()<br/>+N days → trial_ends_at + ledger + email"]
        S2["pro_day_grants (V92)<br/>ReferralService callers"]
    end

    %% ---- Existing wiring (solid) ----
    V1 --> V2
    V2 --> Q1
    Q1 --> Q2
    Q2 -->|encodes /t/{shortId}| P1
    Q2 -->|encodes /discover/species/id| P2
    P1 --> D1
    P2 --> D3
    D2 --> D1
    S1 --> S2
    ReferralService -. existing caller .-> S1

    %% ---- Customer scan (existing) ----
    C1["Customer scans QR<br/>QrToolPage camera"]
    C1 --> P1
    C1 --> P2

    %% ---- MISSING: Passport + Claim (dashed = to build) ----
    NP["specimen_passport (NEW)<br/>passport_id · species_id · origin_vendor_id · status"]:::gap
    NC["POST /api/passports/{id}/claim (NEW)"]:::gap
    NV["/p/:passportId public page (NEW)<br/>species info + Claim CTA"]:::gap

    V2 -.bulk mint NEW.-> NP
    Q2 -.encode /p/{passport_id} NEW.-> NV
    C1 -.scan passport NEW.-> NV
    NV -.claim NEW.-> NC
    NC -.reuse create(), shortId = passport_id.-> D2
    NC -.set origin_vendor_id on Tarantula NEW col.-> D1
    NC -.grant 1mo Pro reuse.-> S1
    NP -.status CLAIMED + link.-> D1

    classDef gap fill:#fde2e2,stroke:#c0392b,stroke-width:2px,color:#000;
```

**Legend:** solid arrows/boxes = exists today; **red/dashed** = the four things to build (passport table, public `/p/` page, claim endpoint, and the one `origin_vendor_id` column) — all of which plug into existing `create()`, `shortId`, public-page, and `recordGrant()` infrastructure.

---

## Quick answers
- **Can vendors print 500 labels today?** No — capped at 60/doc, DOCX only, and every label needs a pre-owned specimen.
- **Could a QR scan grant 1 month Pro?** Yes — `ProDayGrantService.recordGrant(user, 30, …)` already does exactly this; just needs a caller + a one-claim guard.
- **Is there any claim/transfer/ownership-history today?** None. The only `handoff`/`origin`/`provenance` hits are unrelated (cart handoff, species biogeography).
- **Best identifier to reuse as the Passport ID?** The existing `shortId` — it's already permanent, unique, public-routable, and QR-encoded.

*No files were modified and nothing was implemented. Audit only.*
