# Checklist go-live: precios nuevos + partners (tu lado)

Qué debes hacer **fuera del repo** después de desplegar el código. El código alinea la UI con estos importes; **Stripe cobra lo que digan tus Price IDs**, no el texto de la app.

## Precios LIVE ya creados en Stripe (GABAN Solutions)

Los productos y precios **live** se crearon vía integración Stripe el 2026-05-24. Copia las variables desde:

**`scripts/output/stripe-price-ids-live.env`**

Pégalas en **Railway** (backend) y redeploy. Falta solo configurar el **webhook** en Stripe Dashboard si aún no existe.

---

## 1. Stripe (Dashboard → Product catalog)

Si necesitas recrear precios, usa los importes abajo. Si usas el archivo generado arriba, **no hace falta** volver a crear en Dashboard.

### TarantulApp Pro (suscripción keeper)

| Región | Mensual | Anual (~10× mensual) | Variables Railway |
|--------|---------|----------------------|-------------------|
| US | **4.99 USD** | **49.99 USD** | `STRIPE_PRICE_ID_MONTHLY_US`, `STRIPE_PRICE_ID_YEARLY_US` |
| CA | **6.99 CAD** | **69.99 CAD** | `STRIPE_PRICE_ID_MONTHLY_CA`, `STRIPE_PRICE_ID_YEARLY_CA` |
| MX | **79 MXN** | **790 MXN** | `STRIPE_PRICE_ID_MONTHLY_MX`, `STRIPE_PRICE_ID_YEARLY_MX` |
| CO | **14,900 COP** | **149,000 COP** | `STRIPE_PRICE_ID_MONTHLY_CO`, `STRIPE_PRICE_ID_YEARLY_CO` |
| Internacional (ROW) | **4.99 USD** | **49.99 USD** | `STRIPE_PRICE_ID_MONTHLY_INT`, `STRIPE_PRICE_ID_YEARLY_INT` |

Si `INT` está vacío, el backend hace fallback a precios US.

### TarantulApp Vendor

- **US / CA:** suscripción fija (mensual/anual).
- **MX:** tier dinámico — Starter $0, Activo $199, Plus $499, Pro Shop $999 MXN/mes (`STRIPE_PRICE_ID_VENDOR_MONTHLY_MX_TIER1` … `TIER3` en `stripe-price-ids-live.env`).
- **CO:** precios flat cuando existan en Stripe.

| Región | Mensual | Anual (opcional) | Variables |
|--------|---------|------------------|-----------|
| US | **9.99 USD** | ~99.99 USD | `STRIPE_PRICE_ID_VENDOR_MONTHLY_US`, `STRIPE_PRICE_ID_VENDOR_YEARLY_US` |
| CA | **15.99 CAD** | ~159.99 CAD | `STRIPE_PRICE_ID_VENDOR_MONTHLY_CA`, `STRIPE_PRICE_ID_VENDOR_YEARLY_CA` |

MX/CO/INT: sin checkout Vendor en web (UI “próximamente”). Strategic Partner sigue siendo custom/invite.

### Listing boost (one-time, sin cambio de estrategia)

Mantén ~2 USD equivalente por región (`STRIPE_PRICE_ID_LISTING_BOOST_*`).

### Webhook

- Endpoint: `https://api.tarantulapp.com/api/billing/webhook` (o tu API en Railway)
- Eventos: `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`
- `STRIPE_WEBHOOK_SECRET=whsec_...`

### Test antes de live

1. Modo Test: checkout Pro US + INT desde `/pro`
2. Verificar usuario pasa a PRO en app y en Stripe Customers
3. Repetir con un Price ID real en Live

---

## 2. Railway (backend)

Variables mínimas nuevas/actualizadas:

```text
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Pro — 10 price IDs (8 regionales + 2 INT)
STRIPE_PRICE_ID_MONTHLY_US=price_...
STRIPE_PRICE_ID_YEARLY_US=price_...
# ... CA, MX, CO ...
STRIPE_PRICE_ID_MONTHLY_INT=price_...
STRIPE_PRICE_ID_YEARLY_INT=price_...

# Vendor US/CA (cuando actives self-serve)
STRIPE_PRICE_ID_VENDOR_MONTHLY_US=price_...
STRIPE_PRICE_ID_VENDOR_MONTHLY_CA=price_...

# Partner sync (Monarch + futuros Woo)
PARTNER_SYNC_ENABLED=true          # cuando quieras cron cada 30 min
PARTNER_SYNC_ADAPTER_WOOCOMMERCE_ENABLED=true
PARTNER_SYNC_MONARCH_BASE_URL=https://monarchreptiles.com   # fallback legacy
```

Despliegue: Flyway aplica `V104__official_vendor_feed_config.sql` (columnas `feed_base_url`, `feed_type` en `official_vendors`).

---

## 3. Vercel (frontend)

No suele llevar secretos de Stripe (checkout es server-side). Verifica:

- `VITE_API_URL` apunta al backend Railway
- Rebuild tras cambios de i18n en `/pro`

Opcional Android:

- `VITE_ANDROID_PLAY_PRODUCT_ID` alineado con Play Console si usas IAP

---

## 4. Google Play Console (si vendes Pro en Android)

- Producto `tarantulapp_pro_monthly` con precio acorde a tu estrategia (puede diferir de web)
- `GOOGLE_PLAY_BILLING_ENABLED=true` + service account JSON en Railway cuando salgas de stub

---

## 5. Partners estratégicos (Monarch y outreach)

Por cada distribuidor con sitio web:

1. Firma: `docs/legal/strategic-partner-listing-authorization-onepager-es-en.md`
2. Admin → Official vendors: tier **STRATEGIC_PARTNER** (o FOUNDER), **Import** on
3. Rellenar en DB o futuro admin:
   - `feed_type` = `woocommerce`
   - `feed_base_url` = `https://su-tienda.com` (sin slash final)
4. **Run partner sync** → revisar `partner_listing_sync_runs`
5. Probar `/partner/{slug}` y carrito → handoff a su WooCommerce (puede requerir whitelist `add-to-cart` como Monarch)

**Convertir lead:** Admin → Marketplace → en lead, **Promover a vendor** (crea `official_vendors` desde el formulario público).

---

## 6. Lemon Squeezy (Canadá, opcional)

No está integrado en código. Si más adelante usas LS como MoR para CA:

- Sería segunda pasarela (proyecto aparte)
- Hoy: **Stripe CAD** para Pro/Vendor CA es suficiente para lanzar

---

## 7. Verificación rápida post-deploy

| Check | URL / acción |
|-------|----------------|
| Pro US $4.99 en UI | `/pro` con región US |
| Pro INT | VPN UK → región International, checkout USD |
| Vendor bloqueado INT | `/pro` → tarjeta Vendor “próximamente” |
| Monarch vitrina | `/partner/monarch-reptiles` |
| Feed mezclado | `/marketplace` con cards partner |
| Admin sync | `/admin` → Run partner sync |

---

## 8. Ya incluido en código (este deploy)

- `/partners` — landing strategic partner + formulario
- `/api/public/marketplace/stats` — contador para banner de densidad
- Verificación vendor (upload + cola admin en Marketplace admin)
- Vendor checkout US/CA → email de invitación vendor tras pago Stripe
- WooCommerce/handoff genérico por `feed_base_url`

## 9. Pendiente manual / siguiente iteración

- Webhook Stripe en producción (`STRIPE_WEBHOOK_SECRET`)
- Shopify adapter
- Vendor self-serve MX/CO
- Analytics UTM dashboard para partners
- Lemon Squeezy
