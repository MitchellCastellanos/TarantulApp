# Socios estratégicos (sync WooCommerce) — dónde viven y cuándo importar

## Dos mundos distintos (no mezclar con Vendor self-serve)

| Tipo | Dónde vive | Cómo entra | Listings | Checkout |
|------|------------|------------|----------|----------|
| **Socio estratégico** | Tabla `official_vendors` + `partner_listings` | Formulario `/partners` → lead → Admin promueve | Sync automático (WooCommerce) | Handoff a su tienda (`feed_base_url`) |
| **Vendor comercial** | Usuario `users.verified_breeder` | Paga Stripe / admin activa | Publica en marketplace como seller | Directo keeper↔keeper |
| **Tienda verificada** | `users.storefront_verified_at` | Self-verif async o videollamada admin | Badge en perfil/anuncios peer | N/A |

Los socios **no** necesitan `verified_breeder` salvo que también quieran operar como vendor peer con cuenta de usuario.

---

## Flujo operativo recomendado

### 1. Lead → borrador de partner

1. Prospecto llena **`/partners`** → fila en `official_vendor_leads`.
2. Admin → **Marketplace** → solicitudes → **Crear vendor draft** (`adminPromoteLeadToVendor`).
3. Resultado: fila en `official_vendors` con:
   - `enabled = false` (aún no visible)
   - `listing_import_enabled = false` por defecto
   - `feed_base_url` + `feed_type = woocommerce` (inferido del website)
   - `partner_program_tier` = `STRATEGIC_PARTNER` o `STRATEGIC_FOUNDER`

### 2. Primera llamada / alianza

Acordar con el partner:

- URL WooCommerce pública (REST `/wp-json/wc/store/products` o equivalente)
- Categorías que quieren destacar (tarántulas, sustratos, etc.)
- Política de envío / países
- UTM en handoff (`PartnerCartHandoffService` ya etiqueta)

### 3. Habilitar sync e importar

En Admin (vendors oficiales / marketplace):

1. `enabled = true` cuando quieras que salgan en el strip y búsqueda.
2. `listing_import_enabled = true`.
3. Pulsar **Run partner sync** (o esperar job de arranque si está configurado).
4. Revisar conteo en banner de densidad (`GET /api/public/marketplace/stats`).

**Monarch** ya tiene seed en `V104` (`slug=monarch-reptiles`, feed WooCommerce).

### 4. Storefront in-app

- Ruta pública: **`/partner/{slug}`** (`PartnerStorefrontPage`).
- Enlace desde marketplace strip de socios oficiales.

### 5. Outreach por correo (campaña)

Plantillas batch actuales en admin: `vendor_welcome_mx`, `play_early_access_web`, etc.

**Recomendación:** tras el **primer sync exitoso** (>0 listings), mandar correo personalizado con:

- Número de productos ya visibles en app
- Link a su vitrina `/partner/{slug}`
- Qué necesitamos de ellos: fotos mejores, categorías Woo correctas, stock actualizado, prueba de handoff carrito

*(Plantilla dedicada `partner_catalog_live` — añadir en siguiente iteración si quieres botón en admin; hoy puedes usar notas en lead + correo manual.)*

---

## ¿WooCommerce ya está listo?

**Sí, para el caso principal:**

| Pieza | Estado |
|-------|--------|
| Adapter `WooCommerceStrategicPartnerListingAdapter` | ✅ `feed_type=woocommerce` + `feed_base_url` por vendor |
| Upsert a `partner_listings` | ✅ |
| Categorías (Monarch mapper + genérico) | ✅ |
| Cart handoff con UTM | ✅ `PartnerCartHandoffService` usa `feed_base_url` |
| Admin promote lead → vendor | ✅ |
| Sync manual admin | ✅ botón en Admin Marketplace / Home |
| Shopify / otros feeds | ❌ pendiente |

**Limitaciones conocidas:**

- Tiendas con Woo detrás de firewall o sin Store API pública pueden fallar el sync (probar URL antes).
- Monarch 403 en cart handoff: revisar CORS/plugins en su WordPress si el handoff falla en prod.
- No hay email automático post-sync (manual o campaña admin).

---

## Webhook Stripe (tu API)

Con el networking de Railway:

- **URL webhook:** `https://api.tarantulapp.com/api/billing/webhook`
- **App redirects:** `APP_BASE_URL=https://tarantulapp.com` (o tu dominio Vercel)
