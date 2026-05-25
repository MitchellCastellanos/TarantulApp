# Onboarding de tienda / vendor (México) — primeros listings + badge

Checklist interno después de la llamada con el prospecto y alrededor del correo de bienvenida.

## 1. Habilitar cuenta (activación = beneficios, NO badge)

1. Confirmar que el usuario existe (correo = el que te dieron).
2. En **Admin → Vendors** (`/admin/vendors`):
   - Buscar por correo → **Activar como Vendor** (`verifiedBreeder = true`).
   - Esto le da: 250 listings activos, todas las categorías (incluye insumos/sustratos/terrarios), listing boost, inbox.
   - **No le pone badge todavía** — el badge se gana con verificación (paso 3).
   - Revisar `publicHandle` único (será `/shop/{handle}`).
3. Si es **socio oficial** (catálogo importado + categorías de insumos):
   - Crear/actualizar fila en `official_vendors`.
   - `listing_import_enabled = true`, tier `STRATEGIC_PARTNER` o `STRATEGIC_FOUNDER`.
   - Asignar `listing_category` en `partner_listings` al sincronizar (`live_food`, `substrates`, `terrariums`, `supplies`, `tarantulas`).

## 2. Tier dinámico (sin escrow, auto-ajustado)

Vendors arrancan en **Starter ($0 MXN)**. La suscripción Stripe se ajusta cada mes según anuncios marcados como vendidos en los últimos 30 días.

| Tier | Ventas reportadas / mes | Costo mensual | Stripe Price ID env |
|------|------------------------|---------------|---------------------|
| Starter | 0–3 | **$0 MXN** | (sin suscripción) |
| Activo | 4–12 | $199 MXN | `STRIPE_PRICE_ID_VENDOR_MONTHLY_MX_TIER1` |
| Plus | 13–30 | $499 MXN | `STRIPE_PRICE_ID_VENDOR_MONTHLY_MX_TIER2` |
| Pro Shop | 31+ | $999 MXN | `STRIPE_PRICE_ID_VENDOR_MONTHLY_MX_TIER3` |

**Implementado en código (2026-05-24):**

- Cuenta ventas: `marketplace_listings` con `status=sold` y `updated_at` en últimos 30 días (`VendorMxTierService`).
- API `GET /api/billing/vendor-mx-tier` + checkout Vendor en región MX usa el price del tier (Activo/Plus/Pro Shop).
- Starter ($0) no abre checkout Stripe — onboarding por invitación / Admin.

**Pendiente (siguiente pasada):**

- Cron mensual que hace `subscription.update` en Stripe cuando el tier baja o sube automáticamente.

Precios live MXN en `scripts/output/stripe-price-ids-live.env` (`STRIPE_PRICE_ID_VENDOR_MONTHLY_MX_TIER1` … `TIER3`).

Mientras tanto = onboardear vendors y llenar catálogo. Starter no requiere Stripe.

## 3. Badge "Tienda Verificada" — videollamada (separado de la activación)

Activar Vendor (paso 1) **no** otorga el badge. El badge requiere revisión humana **en videollamada en vivo**.

### Flujo

1. Mandar correo de bienvenida (paso 4) — incluye cómo **agendar** la cita (enlace público si está configurado, o pedir franjas por correo).
2. **Config producción:** variable `TARANTULAPP_VENDOR_VERIFICATION_BOOKING_URL` (o `app.vendor-verification-booking-url`) = Cal.com, Calendly, etc. Si va vacío, el cuerpo del correo (`BetaMailBodies` / `vendor_welcome_mx`) pide **responder con nombre de tienda, @handle y 2–3 franjas horarias**; el equipo contesta con link de meet.
3. Antes de la llamada el vendor prepara: INE (solo mostrar en cámara — **no** pedir fotos por correo), espacio/terrarios para recorrido, inventario + papel con `@handle` si lo pedimos, WhatsApp/IG para mostrar en pantalla, refs CITES en cámara si aplica.
4. **Sesión (~15–20 min):** por defecto **no grabamos**. Si algún día se grabara para revisión interna → consentimiento explícito aparte.
5. Equipo revisa en llamada (y notas internas mínimas): identidad en vivo, espacio real, consistencia inventario ↔ listings, señales de reventa.
6. Si cuadra → Admin: `PATCH /api/admin/users/{id}/storefront-verified` con `{ "storefrontVerified": true }`, o aprobar self-verification en cola Marketplace. UI muestra "Tienda verificada" cuando `storefront_verified_at IS NOT NULL`.
7. Si falta algo → correo follow-up; la cuenta sigue activa sin badge ("Tienda nueva") hasta cerrar el ciclo.

### Auditoría aleatoria

1 vez por trimestre, sample random de vendors con badge. Pedir evidencia fresca (u otra videollamada corta si hace falta). Si no cuadra → suspender badge + investigación.

## 4. Enviar correo de bienvenida

**Desde Admin → Vendors:** botones ES / EN / FR mandan la plantilla (`vendor_welcome_mx`) con tier dinámico + **cita por videollamada**.

**Plantillas referencia (markdown, Mustache):**

- ES: `docs/beta/vendor-welcome-email-template-es-2026-05-15.md`
- EN: `docs/beta/vendor-welcome-email-template-en-2026-05-15.md`
- FR: `docs/beta/vendor-welcome-email-template-fr-2026-05-15.md`

Variables: nombre, marca, `appUrl`, correo, `shopUrl`, `sellUrl`, `verificationBookingUrl` (opcional; en el correo automático la URL sale de `app.vendor-verification-booking-url`).

## 5. Qué debe publicar el socio (día 0)

| Categoría | Ejemplos |
|-----------|----------|
| `tarantulas` | Ejemplares, slings |
| `breeding_projects` | Proyectos, parejas, sacas |
| `live_food` | Grillos, cucarachas, etc. |
| `substrates` | Lena, turba, mezclas |
| `terrariums` | Exo Terra, custom |
| `supplies` | Decoración, herramientas |

Mínimo sugerido para "llenar" marketplace: **8–15 listings** repartidos en 2+ categorías si vende insumos.

## 6. SQL útil (solo entornos controlados)

```sql
-- Activar vendor (perks) sin badge
UPDATE users
SET verified_breeder = true,
    verified_breeder_at = NOW()
WHERE LOWER(email) = LOWER('correo@tienda.mx');

-- Otorgar badge "Tienda Verificada" después de revisión (V107)
-- UPDATE users SET storefront_verified_at = NOW() WHERE LOWER(email) = LOWER('correo@tienda.mx');

-- Quitar badge tras auditoría fallida
-- UPDATE users SET storefront_verified_at = NULL WHERE id = 'UUID';

-- Marcar partner listings como sustratos (tras import)
UPDATE partner_listings
SET listing_category = 'substrates'
WHERE official_vendor_id = 'UUID-DEL-VENDOR'
  AND (title ILIKE '%substrate%' OR title ILIKE '%sustrato%');
```

## 7. Verificación post-onboarding

- [ ] `/shop/{handle}` carga con políticas.
- [ ] Listings visibles en `/marketplace?category=tarantulas` (y categorías de insumos si aplica).
- [ ] Vendor aparece en `/admin/vendors` lista de activos.
- [ ] Sin badge inicialmente (storefront marcado como "Tienda nueva" hasta verificación).
- [ ] Usuario community sigue limitado a 5 listings / solo tarántulas y cría.
