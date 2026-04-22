# Google Play Billing Setup (Web + Android)

This project now supports:

- Web checkout via Stripe (existing flow).
- Android purchase sync placeholder via Google Play endpoint (stub mode).

Use this guide to move from placeholders to real Play Billing.

## 1) Current behavior

- Web (`Browser`) keeps using Stripe checkout.
- Android native app shows a temporary "sync purchase" flow in `Pro` page.
- Backend endpoint `POST /api/billing/google-play/verify` accepts test tokens in stub mode.

## 2) Backend env vars

Add these variables in your backend environment:

- `GOOGLE_PLAY_BILLING_ENABLED=true`
- `GOOGLE_PLAY_BILLING_MODE=stub`
- `GOOGLE_PLAY_BILLING_ALLOW_TEST_TOKENS=true`
- `GOOGLE_PLAY_PACKAGE_NAME=com.tarantulapp.app`
- `GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_ID=tarantulapp_pro_monthly`

### Stub test token format

In stub mode, purchase tokens are accepted only if they start with:

- `test_`
- `sandbox_`
- `fake_`

Example token:

- `test_first_android_purchase_001`

## 3) Android placeholder test flow

1. Log into Android app with a valid user.
2. Open `Pro` page.
3. Enter product id (example: `tarantulapp_pro_monthly`).
4. Enter token (example: `test_first_android_purchase_001`).
5. Click `Sync Android purchase`.
6. Account should switch to `PRO`.

## 4) Real Google Play integration checklist

When you are ready for production:

1. Create subscription products in Play Console.
2. Create a service account with Android Publisher API access.
3. Share app access in Play Console to that service account.
4. Implement real verification in backend by replacing stub branch in:
   - `BillingService.verifyGooglePlaySubscription(...)`
5. Validate purchase tokens against Google Play Developer API.
6. Map renewal/cancel webhooks (RTDN) to update `subscriptions` and `users.plan`.
7. Set:
   - `GOOGLE_PLAY_BILLING_MODE=real`
   - `GOOGLE_PLAY_BILLING_ALLOW_TEST_TOKENS=false`

## 5) Notes

- Endpoint returns explicit error codes like:
  - `GOOGLE_PLAY_BILLING_DISABLED`
  - `GOOGLE_PLAY_PRODUCT_ID_REQUIRED`
  - `GOOGLE_PLAY_STUB_TOKEN_REJECTED`
  - `GOOGLE_PLAY_REAL_MODE_NOT_IMPLEMENTED`
- These are surfaced in frontend on `Pro` page for debugging.
