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

## 4) Real Google Play integration (step by step)

Backend now supports `GOOGLE_PLAY_BILLING_MODE=real` using **subscriptionsv2.get** (`GooglePlayBillingClient` → `BillingService.verifyGooglePlaySubscription`).

### A) Play Console — productos

1. Crear suscripción(es) y anotar el **product id** (ej. `tarantulapp_pro_monthly`). Debe coincidir con lo que envía el cliente en `productId` y con `GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_ID` si el cliente no lo manda.

### B) Google Cloud — API y cuenta de servicio

1. En [Google Cloud Console](https://console.cloud.google.com/), elige el proyecto enlazado a tu app Play (o crea uno y luego enlázalo desde Play Console → **Setup → API access**).
2. **APIs & Services → Enable APIs** → activar **Google Play Android Developer API**.
3. **IAM → Service Accounts → Create** → crear cuenta de servicio (ej. `tarantulapp-play-verify`).
4. **Keys → Add key → JSON** → descarga el archivo; **no lo subas a git**. En el servidor aparecerá como `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH` (ruta al archivo montado como secreto).

### C) Play Console — permisos para la cuenta de servicio

1. Play Console → **Users and permissions** (o **API access** según UI).
2. Invita la cuenta de servicio (`...@...gserviceaccount.com`) con rol que permita ver pedidos/finanzas de la app (**View financial data** / acceso similar según tu consola).
3. Confirma que la app y el paquete son el de producción (`GOOGLE_PLAY_PACKAGE_NAME`, ej. `com.tarantulapp.app`).

### D) Variables de entorno (producción)

```env
GOOGLE_PLAY_BILLING_ENABLED=true
GOOGLE_PLAY_BILLING_MODE=real
GOOGLE_PLAY_PACKAGE_NAME=com.tarantulapp.app
GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_ID=tarantulapp_pro_monthly
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH=/run/secrets/google-play-sa.json
GOOGLE_PLAY_BILLING_ALLOW_TEST_TOKENS=false
# Opcional: si necesitas license testers contra API de prod, pon false con cuidado:
# GOOGLE_PLAY_REJECT_TEST_PURCHASES_IN_PROD=false
APP_ENVIRONMENT=production
```

Redeploy tras montar el JSON en la ruta indicada.

### E) Smoke test

Desde un dispositivo con compra **real** (o cuenta de prueba según política de Google), llama `POST /api/billing/google-play/verify` con el `purchaseToken` y `productId` devueltos por Play Billing.

### F) Siguiente fase (recomendado)

- **RTDN / Real-time developer notifications** para renovaciones, cancelaciones y expiración, y actualizar `subscriptions` + `users.plan` sin depender solo de “sync” manual.

## 5) Notes

- Endpoint returns explicit error codes like:
  - `GOOGLE_PLAY_BILLING_DISABLED`
  - `GOOGLE_PLAY_PRODUCT_ID_REQUIRED`
  - `GOOGLE_PLAY_STUB_TOKEN_REJECTED`
  - `GOOGLE_PLAY_STUB_DISABLED_IN_PRODUCTION`
  - `GOOGLE_PLAY_SERVICE_ACCOUNT_NOT_CONFIGURED`
  - `GOOGLE_PLAY_PURCHASE_NOT_FOUND`
  - `GOOGLE_PLAY_SUBSCRIPTION_NOT_ACTIVE`
  - `GOOGLE_PLAY_PRODUCT_MISMATCH`
  - `GOOGLE_PLAY_TEST_PURCHASE_REJECTED`
  - `GOOGLE_PLAY_API_ERROR` / `GOOGLE_PLAY_VERIFY_UNAVAILABLE`
  - `GOOGLE_PLAY_UNSUPPORTED_MODE`
- These are surfaced in frontend on `Pro` page for debugging.
