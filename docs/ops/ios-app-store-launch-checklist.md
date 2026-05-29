# Checklist de lanzamiento — Apple App Store (iOS)

Estado: el proyecto iOS de Capacitor ya existe en `frontend/ios/` y el código de la app
está preparado para iOS (IAP de Apple, Sign in with Apple, permisos, privacy manifest).
Lo que queda requiere **macOS + Xcode** y trámites en las consolas de Apple.

Equivalente iOS del flujo de Play en el README. Bundle id: `com.tarantulapp.app`.

---

## 0. Requisitos previos (tu lado)

- [ ] Cuenta **Apple Developer Program** activa (99 USD/año).
- [ ] Un Mac con **Xcode** reciente + **CocoaPods** (`sudo gem install cocoapods`).
- [ ] App creada en **App Store Connect** con el bundle id `com.tarantulapp.app`.

## 1. Generar / abrir el proyecto iOS (en Mac)

El proyecto ya está versionado. Tras clonar y compilar el frontend:

```bash
cd frontend
npm ci
npm run build
npx cap sync ios      # copia dist/ + instala pods
npx cap open ios      # abre App.xcworkspace en Xcode
```

> El proyecto se generó con `npx cap add ios`. `pod install` solo corre en macOS;
> en CI/Linux basta con `cap sync` para copiar assets y plugins.

## 2. Firma y capacidades (Xcode → target App → Signing & Capabilities)

- [ ] Selecciona tu **Team** y deja "Automatically manage signing".
- [ ] Verifica que **`App.entitlements`** está enlazado (Build Settings → *Code Signing Entitlements* = `App/App.entitlements`).
- [ ] Capability **Push Notifications** (usa `aps-environment`; cámbialo a `production` para release).
- [ ] Capability **Sign in with Apple**.
- [ ] Añade **`PrivacyInfo.xcprivacy`** al target (Build Phases → *Copy Bundle Resources*) si no aparece.

## 3. App ID en el Apple Developer portal

- [ ] App ID `com.tarantulapp.app` con **Push Notifications** y **Sign in with Apple** habilitados.
- [ ] Sube la **APNs Auth Key (.p8)** a Firebase (FCM) o configúrala en tu proveedor de push.
- [ ] Crea un **Services ID** para Sign in with Apple en web/WebView y registra el *Return URL*
      (ej. `https://tarantulapp.com/login`). Ese Services ID va en `VITE_APPLE_CLIENT_ID`
      y la URL en `VITE_APPLE_REDIRECT_URI` del build del frontend.
- [x] **Backend:** `POST /api/auth/oauth/apple` implementado (`AppleSignInVerifier`, verifica el
      identity token contra el JWKS de Apple). **Falta tu config:** `APP_AUTH_APPLE_CLIENT_IDS`
      (CSV con el bundle id `com.tarantulapp.app` y el Services ID web) en Railway.

## 4. In-App Purchase (BLOQUEADOR — Guideline 3.1.1)

El código ya enruta la compra de **Pro** por StoreKit en iOS
(`ProPage.jsx` → `handleNativePurchase` con `Platform.APPLE_APPSTORE`).

- [ ] En App Store Connect crea la **suscripción auto-renovable** con product id
      `tarantulapp_pro_monthly` (o el que pongas en `VITE_IOS_APPSTORE_PRODUCT_ID`).
- [ ] Crea el grupo de suscripción, precios por territorio y la pantalla de revisión.
- [x] **Backend:** `POST /api/billing/apple/verify` implementado
      (`BillingService.verifyAppStoreSubscription` + `AppStoreServerClient`, espejo de Google Play
      con modo `stub`/`real` y guardas de producción). **Falta tu config:**
  - [ ] `APPLE_BILLING_ENABLED=true`, `APPLE_BILLING_MODE=real` en Railway.
  - [ ] `APPLE_SERVER_API_KEY_ID`, `APPLE_SERVER_API_ISSUER_ID`, `APPLE_SERVER_API_PRIVATE_KEY_PATH` (.p8), `APPLE_BUNDLE_ID`.
- [ ] Configurar **App Store Server Notifications V2** (URL de webhook) para renovaciones/cancelaciones
      (endpoint aún por crear; la verificación puntual ya funciona).
- [ ] Probar compra en **Sandbox** con un Sandbox Apple ID.

> Importante: en iOS los checkouts web de Stripe (Pro y Vendor) quedan ocultos
> (`isNativeStore`); Apple prohíbe redirigir a pago externo para bienes digitales.

## 5. Iconos, splash y assets

- [ ] App icon iOS (1024×1024 sin alfa) en `Assets.xcassets/AppIcon.appiconset`.
      `cap add ios` dejó un placeholder; reemplázalo (puedes extender `scripts/generate-app-icons.mjs`).
- [ ] Revisar `LaunchScreen.storyboard`.

## 6. App Privacy + cumplimiento (App Store Connect)

- [ ] Rellenar la **App Privacy "nutrition label"** acorde a `frontend/ios/App/App/PrivacyInfo.xcprivacy`
      y a `/privacy`: email, fotos/vídeos, contenido de usuario, device/push token (funcionalidad),
      crash data (Sentry, diagnóstico, no vinculado, sin tracking).
- [ ] **Export Compliance**: la app usa solo HTTPS estándar → `ITSAppUsesNonExemptEncryption=false`
      ya está en `Info.plist` (exención estándar).
- [ ] **Account deletion**: ya existe en la app (menú → Account → Delete) y en `/account-deletion`. ✔
- [ ] Clasificación por edad / contenido (marketplace + chat con moderación).
- [ ] **Demo account** para el equipo de revisión de Apple (usuario + contraseña en App Review Information).

## 7. Capturas y metadatos

- [ ] Capturas por tamaño requerido (6.7", 6.5", 5.5", iPad 12.9" si soportas iPad).
- [ ] Descripción, keywords, URL de soporte, URL de privacidad (`/privacy`), URL de marketing.

## 8. Subida y revisión

- [ ] Archive en Xcode → **Distribute App** → App Store Connect (o `xcodebuild`/Fastlane).
- [ ] Procesar build, asignar a TestFlight, smoke test, y enviar a **App Review**.

---

## Resumen de lo ya hecho en el repo

| Área | Estado |
|------|--------|
| Proyecto iOS Capacitor (`frontend/ios`) | ✔ generado |
| `Info.plist`: NSCamera/NSPhotoLibrary(+Add), UIBackgroundModes, ITSAppUsesNonExemptEncryption | ✔ |
| `App.entitlements`: aps-environment + Sign in with Apple | ✔ |
| `PrivacyInfo.xcprivacy` (privacy manifest) | ✔ |
| IAP Apple en `ProPage.jsx` + `billingService.verifyAppStorePurchase` | ✔ |
| Sign in with Apple en `LoginPage.jsx` + `authService.oauthApple` | ✔ |
| Vars de entorno (`VITE_APPLE_*`, `VITE_IOS_APPSTORE_PRODUCT_ID`) | ✔ documentadas en `.env.example` |
| `capacitor.config.ts` bloque iOS | ✔ |
| Backend `POST /api/billing/apple/verify` (`verifyAppStoreSubscription` + `AppStoreServerClient`) | ✔ (falta config ops) |
| Backend `POST /api/auth/oauth/apple` (`AppleSignInVerifier`) | ✔ (falta config ops) |

### Pendientes que aún requieren código backend
- **App Store Server Notifications V2** (webhook de renovaciones/cancelaciones): por crear.
  La verificación puntual de compra y el login con Apple ya están implementados.
