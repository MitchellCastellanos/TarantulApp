# TarantulApp — Vendor / store welcome email (Mexico)

**When to send it:** After talking with the prospect, getting their email, and **enabling them in admin** (`verifiedBreeder` + storefront). This email is the "you can publish now — here's what you have and what's still pending for your badge".

**Variables:** `{{name}}`, `{{businessName}}`, `{{appUrl}}`, `{{email}}`, `{{password}}` (only if you generated a temporary password), `{{shopUrl}}`, `{{sellUrl}}`, `{{date}}`, `{{verificationBookingUrl}}` (optional public booking link; if empty, ask them to reply with time windows).

**Current billing model:** Dynamic tier reassigned monthly based on reported sales. Starter $0 MXN, scales automatically. TarantulApp **does not custody payments** — the vendor collects directly from their customer.

**Backend:** set `app.vendor-verification-booking-url` or env `TARANTULAPP_VENDOR_VERIFICATION_BOOKING_URL` for the link embedded in `BetaMailBodies` (`vendor_welcome_mx`).

---

Hi {{name}},

Message date: {{date}}

Thanks for bringing **{{businessName}}** to **TarantulApp**. We've activated your **vendor / store account** in the marketplace — this email walks you through **what's already active, what's still pending, and how to earn it**.

### What's ACTIVE from day one (no upfront cost)

- **Storefront** at `{{shopUrl}}` with your brand, shipping policies, and contact details.
- **Publish in every category**: tarantulas, breeding projects, live food, substrates, terrariums, and accessories.
- **Up to 250 active listings** + listing boost.
- **Buyer inbox** inside the app with history.
- **Dynamic tier**: you start on **Vendor Starter ($0 MXN / month)** — scales up or down with your sales, no contracts, no minimums.

### How billing works (no custody, no escrow)

TarantulApp **never handles your sales money** — you collect directly from your customer (bank transfer, MercadoPago, whatever you already use). Your monthly subscription self-adjusts based on how many listings you mark as sold each month:

| Tier | Sales reported / month | Monthly cost |
|------|------------------------|--------------|
| Vendor Starter | 0–3 | **$0 MXN** |
| Vendor Activo | 4–12 | $199 MXN |
| Vendor Plus | 13–30 | $499 MXN |
| Vendor Pro Shop | 31+ | $999 MXN |

Every time you close a sale, **mark the listing as sold** in the app — that's our only counter. If you sell zero in a month, you pay nothing and keep your full storefront. No penalty for dropping a tier.

**Activity labels (on top of verification):** depending on your tier for the month, your storefront may show extra trust labels (for example “Active shop”, “Plus shop”, “Pro Shop”). **They don't replace** the live video verification with our team — they reward honest volume.

### One thing pending: your **"Verified Shop"** badge

The badge isn't given out for paying — you earn it in a **live video call** with our team. **Do not email photos of your ID**; government ID is shown **on camera** when we ask.

**Scheduling**

{{#verificationBookingUrl}}
- Book here: `{{verificationBookingUrl}}`
{{/verificationBookingUrl}}
{{^verificationBookingUrl}}
- Reply to this email with your shop name, your TarantulApp `@handle`, and **2–3 time windows** that work for you (include your **time zone**). We'll send the video link.
{{/verificationBookingUrl}}

**Before the call, please prepare**

- Government-issued ID at hand (camera only — **no** email attachments).
- Space and enclosures ready for a short on-camera walkthrough.
- Representative inventory; handwritten `@handle` note nearby if we ask to show it next to an animal.
- Shop WhatsApp/Instagram ready to show on screen if relevant.
- Stable internet, camera, and reasonable lighting.
- If you sell **CITES** animals: UMA/permit ready to show on camera.
- Optional to speed review: tax ID, references, wholesale invoices — you can show these during the call.

**Recording:** by default we **do not record** the session. If we ever needed a recording for internal review, we would ask **separate consent** first.

**Timing:** ~15–20 minutes. After the call, we follow up on whether the badge is granted — typically **24–72 business hours**. You can publish in the meantime; without the badge, your storefront shows **"New shop"**.

### Your access

- **Web / app:** `{{appUrl}}`
- **Email:** `{{email}}`
{{#password}}
- **Temporary password:** `{{password}}` (change it in account after signing in)
{{/password}}

### First steps (15–30 min)

1. Sign in at `{{appUrl}}` (early access / beta if applicable).
2. Go to **Marketplace → Sell** (`{{sellUrl}}`).
3. **Set up your storefront:** commercial name, tagline, shipping policy (national / by state), delivery times, and WhatsApp or Instagram contact.
4. **Publish your first listing:** clear photo, price in **MXN**, honest description (size, sex, origin if applicable).
5. Repeat with your strongest inventory (tarantulas + supplies if you stock them).
6. **Book the verification call** (link above if set) **or** reply with time windows so we can schedule.

### Quick rules (Mexico)

- Follow **local regulations** on wildlife, shipping, and permits when selling specimens (UMA / CITES if applicable).
- TarantulApp **does not custody payments**: close the deal in the app chat and settle payment between you and the buyer using a method you already trust (transfer, MercadoPago, etc.).
- Real photos, current stock; once sold, **mark the listing as sold** — that's the only signal that counts toward your monthly tier.

### Need help?

Reply to this email with category questions or your `@handle`. If something doesn't load in the app, use **"Report a bug"** (screen, device, version).

Welcome to the marketplace — we love watching the catalog grow.

— The TarantulApp team
