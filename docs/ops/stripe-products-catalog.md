# Catálogo Stripe y Play: productos a crear

Referencia única para crear **Products / Prices** en Stripe y **suscripciones / in-app** en Google Play. Los IDs de precio se mapean en `backend/src/main/resources/application.properties` (variables `STRIPE_*`).

## Regiones de facturación (backend)

| Región | Moneda típica (Stripe) | Sufijo precios Pro/Vendor |
|--------|-------------------------|---------------------------|
| US | USD | `_US` |
| CA | CAD | `_CA` |
| MX | MXN | `_MX` |
| CO | COP | `_CO` |

El **listing boost** usa el país del anuncio (`MarketplaceListing.country`) para elegir el `price` de Stripe; si falta el id regional, se hace fallback a US y luego al id legacy `STRIPE_PRICE_ID_LISTING_BOOST`.

## Stripe: TarantulApp Pro (B2C)

**Producto sugerido (nombre):** `TarantulApp Pro` (un solo producto lógico; varios precios por región e intervalo).

Crea **8 Prices** (recurring), tipo subscription:

| Price (concepto) | Variable de entorno | Intervalo |
|------------------|---------------------|-----------|
| Pro monthly US | `STRIPE_PRICE_ID_MONTHLY_US` | monthly |
| Pro yearly US | `STRIPE_PRICE_ID_YEARLY_US` | yearly |
| Pro monthly CA | `STRIPE_PRICE_ID_MONTHLY_CA` | monthly |
| Pro yearly CA | `STRIPE_PRICE_ID_YEARLY_CA` | yearly |
| Pro monthly MX | `STRIPE_PRICE_ID_MONTHLY_MX` | monthly |
| Pro yearly MX | `STRIPE_PRICE_ID_YEARLY_MX` | yearly |
| Pro monthly CO | `STRIPE_PRICE_ID_MONTHLY_CO` | monthly |
| Pro yearly CO | `STRIPE_PRICE_ID_YEARLY_CO` | yearly |

**Fallback legacy (opcional, un solo mercado):**

- `STRIPE_PRICE_ID_MONTHLY`
- `STRIPE_PRICE_ID_YEARLY`

## Stripe: Vendor / tier para vendedores

**Producto sugerido:** `TarantulApp Vendor` (o el nombre comercial del vendedor).

Otras **8 Prices** (recurring):

| Price | Variable | Intervalo |
|-------|----------|-----------|
| Vendor monthly US | `STRIPE_PRICE_ID_VENDOR_MONTHLY_US` | monthly |
| Vendor yearly US | `STRIPE_PRICE_ID_VENDOR_YEARLY_US` | yearly |
| Vendor monthly CA | `STRIPE_PRICE_ID_VENDOR_MONTHLY_CA` | monthly |
| Vendor yearly CA | `STRIPE_PRICE_ID_VENDOR_YEARLY_CA` | yearly |
| Vendor monthly MX | `STRIPE_PRICE_ID_VENDOR_MONTHLY_MX` | monthly |
| Vendor yearly MX | `STRIPE_PRICE_ID_VENDOR_YEARLY_MX` | yearly |
| Vendor monthly CO | `STRIPE_PRICE_ID_VENDOR_MONTHLY_CO` | monthly |
| Vendor yearly CO | `STRIPE_PRICE_ID_VENDOR_YEARLY_CO` | yearly |

## Stripe: Listing boost (one-time)

**Producto sugerido:** `TarantulApp Listing Boost` — pago único, **no** subscription.

Punto de partida: **~2,00 USD** en US. En otros países crea un **Price** en la moneda local con importe aproximadamente equivalente (revisa redondeos y políticas de Stripe por país).

| Región | Variable | Tipo | Guía de importe (orientativa) |
|--------|----------|------|-------------------------------|
| US | `STRIPE_PRICE_ID_LISTING_BOOST_US` | one_time | 2,00 USD |
| CA | `STRIPE_PRICE_ID_LISTING_BOOST_CA` | one_time | equivalente ~2 USD (ej. 2,75–3,25 CAD según tipo de cambio) |
| MX | `STRIPE_PRICE_ID_LISTING_BOOST_MX` | one_time | equivalente ~2 USD (ej. 35–45 MXN) |
| CO | `STRIPE_PRICE_ID_LISTING_BOOST_CO` | one_time | equivalente ~2 USD (ej. 7000–10000 COP) |

**Legacy (un solo precio para todos):** `STRIPE_PRICE_ID_LISTING_BOOST` — se usa como último fallback si un regional falta.

El backend exige `STRIPE_SECRET_KEY` y **al menos un** id de boost (legacy o cualquier regional) para habilitar checkout de boost.

## Resumen: conteo de Prices en Stripe

| Línea | Cantidad de Prices |
|-------|---------------------|
| Pro | 8 (+ 2 legacy opcionales) |
| Vendor | 8 |
| Listing boost | hasta 4 regionales + 1 legacy |
| **Total mínimo útil** | **17** (8+8+1 boost) si usas solo un boost; **21** si configuras los 4 boosts regionales |

*(No cuenta `stripe.price-id` deprecated legado de una sola suscripción, si aún lo mantenés.)*

## Google Play (actual y futuro)

### Ya alineado con backend / frontend

| Elemento | ID / notas |
|----------|------------|
| Suscripción Pro (mensual) | `tarantulapp_pro_monthly` — default `GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_ID` y `VITE_ANDROID_PLAY_PRODUCT_ID` |

### Futuro recomendado (crear cuando toque monetizar igual que web)

| Elemento | ID sugerido | Notas |
|----------|-------------|--------|
| Suscripción Pro (anual) | `tarantulapp_pro_yearly` | Nuevo producto en Play Console; requiere soporte en app y backend si validás por `productId`. |
| Tier Vendor (mensual / anual) | `tarantulapp_vendor_monthly`, `tarantulapp_vendor_yearly` | Solo si vendés ese tier por Play además de Stripe. |
| Boost de listado | producto **in-app** consumible, ej. `tarantulapp_listing_boost` | Solo si querés cobrar boost vía Play; hoy el flujo principal de boost es Stripe Checkout desde web/API. |

Hasta que existan productos extra en Play, el backend sigue centrado en **`tarantulapp_pro_monthly`** para validación de compras Android.

## Referencias en código

- Variables Stripe: `application.properties` (`stripe.price-id-*`).
- Variables Play: `billing.google-play.subscription-product-id` y documentación en `docs/ops/billing-hardening.md`, `PLAY_BILLING_SETUP.md`.
