# Manual completo: Stripe + Play + pagos desde la app (paso a paso)

Guía única para crear productos, precios, variables de entorno, webhooks y comportamiento **desde Android** (Vendor / Boost vía Stripe sin esperar SKUs de Play). Precios orientativos **medios** (ni regalo ni premium); ajustá ±10 % según redondeos y tipo de cambio.

**Regiones backend:** US, CA, MX, CO, INT (resto del mundo, USD).

---

## 0. Antes de empezar

1. En **Stripe**: trabajá primero en modo **Test**; repetí todo en **Live** antes de cobrar real.
2. Anotá cada **Price ID** (`price_...`) al crearlo; lo vas a pegar en Railway (u otro host).
3. **No commitees** nunca `sk_live_`, `whsec_`, ni JSON de cuentas de servicio.

---

## 1. Productos y precios en Stripe

**Ruta:** Stripe Dashboard → **Product catalog** → **Add product**.

Para precios recurrentes: **Pricing model** → Standard pricing → **Recurring**.  
Para boost: **One time**.

### A) TarantulApp Pro

| Campo pantalla | Valor sugerido |
|----------------|----------------|
| **Name** | `TarantulApp Pro` |
| **Description** | Suscripción Pro: límites ampliados, exportaciones avanzadas y funciones premium. Renovable; cancelás cuando quieras. |

**8 precios** (recurring):

| Billing | Moneda | Importe | Nombre interno sugerido (Stripe) |
|---------|--------|---------|----------------------------------|
| Monthly | USD | **4.99** | Pro — US mensual |
| Yearly | USD | **49.99** | Pro — US anual |
| Monthly | CAD | **6.99** | Pro — CA mensual |
| Yearly | CAD | **69.99** | Pro — CA anual |
| Monthly | MXN | **79.00** | Pro — MX mensual |
| Yearly | MXN | **790.00** | Pro — MX anual |
| Monthly | COP | **14 900** | Pro — CO mensual |
| Yearly | COP | **149 000** | Pro — CO anual |
| Monthly | USD | **4.99** | Pro — INT / resto del mundo |
| Yearly | USD | **49.99** | Pro — INT anual |

*(Si COP debe ser múltiplo de 100 en tu cuenta, redondeá manteniendo proporción.)*

### B) TarantulApp Vendor

| Campo pantalla | Valor sugerido |
|----------------|----------------|
| **Name** | `TarantulApp Vendor` |
| **Description** | Suscripción para vendedores: presencia en marketplace y herramientas según plan. Facturación recurrente. |

**8 precios** (recurring):

| Billing | Moneda | Importe | Nombre sugerido |
|---------|--------|---------|-----------------|
| Monthly | USD | **9.99** | Vendor — US mensual |
| Yearly | USD | **99.99** | Vendor — US anual |
| Monthly | CAD | **15.99** | Vendor — CA mensual |
| Yearly | CAD | **159.99** | Vendor — CA anual |
| Monthly | MXN | **249.00** | Vendor — MX mensual |
| Yearly | MXN | **2 399.00** | Vendor — MX anual |
| Monthly | COP | **39 900** | Vendor — CO mensual |
| Yearly | COP | **379 000** | Vendor — CO anual |

### C) TarantulApp Listing Boost (one-time)

| Campo pantalla | Valor sugerido |
|----------------|----------------|
| **Name** | `TarantulApp Listing Boost` |
| **Description** | Destacá tu publicación en el marketplace (pago único, no es suscripción). |

**4 precios** (one time):

| Moneda | Importe | Nombre sugerido |
|--------|---------|-----------------|
| USD | **1.99** | Boost — US |
| CAD | **2.99** | Boost — CA |
| MXN | **39.00** | Boost — MX |
| COP | **7 990** | Boost — CO |

Opcional: un **quinto** precio one-time en tu moneda principal como respaldo único (mismo producto).

---

## 2. Variables de entorno (backend / Railway)

Usá **test keys** y **price_** de test hasta validar checkout y webhooks.

```text
# ─── Stripe core ───
STRIPE_SECRET_KEY=sk_test_...        # o sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ─── Pro (8) ───
STRIPE_PRICE_ID_MONTHLY_US=price_...
STRIPE_PRICE_ID_YEARLY_US=price_...
STRIPE_PRICE_ID_MONTHLY_CA=price_...
STRIPE_PRICE_ID_YEARLY_CA=price_...
STRIPE_PRICE_ID_MONTHLY_MX=price_...
STRIPE_PRICE_ID_YEARLY_MX=price_...
STRIPE_PRICE_ID_MONTHLY_CO=price_...
STRIPE_PRICE_ID_YEARLY_CO=price_...
STRIPE_PRICE_ID_MONTHLY_INT=price_...
STRIPE_PRICE_ID_YEARLY_INT=price_...

# ─── Vendor (8) ───
STRIPE_PRICE_ID_VENDOR_MONTHLY_US=price_...
STRIPE_PRICE_ID_VENDOR_YEARLY_US=price_...
STRIPE_PRICE_ID_VENDOR_MONTHLY_CA=price_...
STRIPE_PRICE_ID_VENDOR_YEARLY_CA=price_...
STRIPE_PRICE_ID_VENDOR_MONTHLY_MX=price_...
STRIPE_PRICE_ID_VENDOR_YEARLY_MX=price_...
STRIPE_PRICE_ID_VENDOR_MONTHLY_CO=price_...
STRIPE_PRICE_ID_VENDOR_YEARLY_CO=price_...

# ─── Listing boost (al menos uno obligatorio para habilitar boost) ───
STRIPE_PRICE_ID_LISTING_BOOST=price_...          # fallback global (opcional pero útil)
STRIPE_PRICE_ID_LISTING_BOOST_US=price_...
STRIPE_PRICE_ID_LISTING_BOOST_CA=price_...
STRIPE_PRICE_ID_LISTING_BOOST_MX=price_...
STRIPE_PRICE_ID_LISTING_BOOST_CO=price_...

# ─── Legacy Pro (opcional; si un regional está vacío en deploys viejos) ───
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...
```

Mapeo en código: `backend/src/main/resources/application.properties` (`stripe.price-id-*`).

---

## 3. Webhook de Stripe

1. **Developers → Webhooks → Add endpoint**
2. **Endpoint URL** (ajustá al dominio público del API):

   `https://TU_DOMINIO_PUBLICO/api/billing/webhook`

3. Eventos: los que ya tengas documentados en [`billing-hardening.md`](./billing-hardening.md) (típicamente `checkout.session.completed`, eventos de `customer.subscription`, facturación pagada/fallida según tu `BillingService`).
4. Copiá el **Signing secret** → `STRIPE_WEBHOOK_SECRET`.
5. Probalo con **Send test event** o una compra en test.

---

## 4. Customer Portal (gestión de suscripción / quejas con menos fricción)

**Settings → Billing → Customer portal**

- Permitir cancelar / actualizar método de pago / ver facturas según tu política.
- **Return URL:** la URL pública de la app + ruta de cuenta (alineado con `app.base-url` y ruta tipo `/account` en web).

---

## 5. Google Play (Pro desde la tienda)

1. **Play Console** → tu app → **Monetize → Subscriptions**
2. Product ID exacto: **`tarantulapp_pro_monthly`** (debe coincidir con backend y `VITE_ANDROID_PLAY_PRODUCT_ID` si lo seteás en build).
3. Configurá precios base y regionalización en la consola.

**Backend (producción real con validación Google):**

```text
GOOGLE_PLAY_BILLING_ENABLED=true
GOOGLE_PLAY_BILLING_MODE=real
GOOGLE_PLAY_PACKAGE_NAME=com.tarantulapp.app
GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_ID=tarantulapp_pro_monthly
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH=/ruta/segura/al-sa.json
```

**Frontend build:** `VITE_ANDROID_PLAY_PRODUCT_ID=tarantulapp_pro_monthly` (si no usás el default del código).

Más detalle: [`billing-hardening.md`](./billing-hardening.md), `PLAY_BILLING_SETUP.md`.

---

## 6. Pagos desde la app Android: Vendor y Boost (sin SKU Play todavía)

Desde la pantalla de **Vendor** o **Boost** en Android, abrís el **mismo Stripe Checkout** que ya arma el backend (la **URL de la sesión**), bien en **Chrome Custom Tab** o en el **navegador**. Es el mismo cobro, mismos webhooks, mismos precios.

Lo importante es el **regreso a la app**: **deep link** / **App Link** en el `success_url` (o **polling** al volver vía `onResume`) para refrescar el **plan** o el **estado del listing**.

No hace falta SKU de Play para este cobro mientras usés Checkout con esa URL; igual conviene **refrescar estado** al volver porque el webhook puede llegar un instante después de cerrar el tab.

| Opción | Implementación | Notas |
|--------|----------------|-------|
| **A — Chrome Custom Tab** | El backend devuelve la URL de sesión Checkout; la app abre esa URL en Custom Tab. | Reutiliza precios y webhooks actuales. Pasá sesión JWT si el checkout requiere usuario logueado (header/cookie según diseño). |
| **B — Navegador externo** | `Intent` a la misma URL en Chrome/Samsung Internet. | Menos problemas de compatibilidad que WebView embebida antigua. |
| **C — Futuro Play Billing** | SKUs tipo `tarantulapp_vendor_monthly` / consumible de boost + verificación en backend como Pro. | Experiencia 100 % nativa; más código y dos vías (Stripe + Google). |

**UX mínima recomendada (A o B):**

1. Botón claro: “Pagar con tarjeta” / “Continuar al pago”.
2. Abrir la URL de sesión que devuelve el checkout (Vendor o Boost), igual que en web.
3. En Stripe: `success_url` (y `cancel_url`) deben volver a la app vía **App Link** o esquema (`tarantulapp://…`), o preparar **polling** en `onResume` si el retorno es solo “volver atrás” del tab.
4. Tras deep link o al resumir: llamar a **estado de billing** o **detalle del listing** para reflejar Vendor activo o boost aplicado.

**Política Play:** Google suele exigir Play Billing para **bienes digitales** usados dentro de la app. Conviene revisar la política vigente; si aplica, **C** es el camino a mediano plazo. Lo anterior no es asesoría legal.

Catálogo de IDs futuros en Play: [`stripe-products-catalog.md`](./stripe-products-catalog.md) (sección Google Play).

---

## 7. Checklist “ya está jalando”

- [ ] Productos y precios creados en Stripe (Test y luego Live).
- [ ] Todas las `STRIPE_PRICE_ID_*` cargadas en el host del backend.
- [ ] `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` correctos para el modo elegido.
- [ ] Webhook apuntando a `POST /api/billing/webhook` y eventos probados.
- [ ] Customer Portal configurado y return URL coherente con la app web.
- [ ] Compra test end-to-end (Pro checkout web si aplica; vendor/boost si aplica).
- [ ] Play: suscripción `tarantulapp_pro_monthly` + backend `mode=real` cuando toque.
- [ ] App Android: Vendor/Boost con Custom Tab o browser + `success_url` con App Link/deep link **o** refresh en `onResume`.

---

## 8. Referencias

| Documento | Para qué |
|-----------|----------|
| [`stripe-products-catalog.md`](./stripe-products-catalog.md) | Resumen de variables, conteo de prices, tabla futuro Play |
| [`billing-hardening.md`](./billing-hardening.md) | Webhooks, Play Billing, pruebas |
| [`README.md`](./README.md) | Tabla maestra de variables de deploy |
| `backend/.../application.properties` | Nombres exactos `stripe.*` y `billing.google-play.*` |
