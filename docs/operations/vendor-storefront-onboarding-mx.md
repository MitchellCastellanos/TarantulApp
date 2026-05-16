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

**Pendiente de implementar** (próxima pasada de código):

- Tabla `vendor_monthly_sales_count` (cron mensual cuenta `marketplace_listings.status='sold'` por seller en últimos 30 días).
- Cron que ejecuta el swap de price ID en Stripe (`subscription.update(items=[{price: NEW_TIER_PRICE_ID}])`) para el mes siguiente.
- 3 Stripe Products MX (Activo / Plus / Pro Shop) + sus env vars en Railway.

Mientras tanto = prioridad = onboardear vendors y llenar catálogo. Starter no requiere Stripe.

## 3. Badge "Tienda Verificada" — separado de la activación

Activar Vendor (paso 1) **no** otorga el badge. El badge requiere revisión humana.

### Flujo

1. Mandar correo de bienvenida (paso 4) — pide al vendor responder con los materiales de verificación.
2. Vendor responde con: INE, fotos del espacio, fotos de inventario con `@handle` escrito a mano visible, link a WhatsApp/IG activo, refs CITES si aplica, opcionales (RFC / referencias / facturas).
3. Equipo revisa (24–72 h):
   - **INE**: ¿persona real?
   - **Fotos espacio**: ¿es operación real, no closet/garage random?
   - **Fotos inventario con handle a mano**: ¿coinciden con los listings publicados? Sin esto, **NO badge** — esto es la prueba clave anti-fotos-robadas.
   - **WhatsApp/IG**: ¿hay continuidad (2–3 meses)?
   - **CITES** (si aplica): ¿números válidos? Si vende `Poecilotheria spp.` sin UMA → rechazar hasta presentar permiso.
4. Si todo cuadra → flipear `storefront_verified_at` (nueva columna, **pendiente de migración**). UI muestra badge "Tienda Verificada" cuando `storefront_verified_at IS NOT NULL`.
5. Si algo falta → responder al vendor con qué le faltó, mantener cuenta activa sin badge mientras corrige.

### Auditoría aleatoria

1 vez por trimestre, sample random de vendors con badge. Pedir foto fresca de inventario actual con handle. Si no cuadra con los listings vivos → suspender badge + flag investigación.

## 4. Enviar correo de bienvenida

**Desde Admin → Vendors:** botones ES / EN / FR mandan la plantilla actualizada (tier dinámico + lista de verificación).

**Plantillas referencia (markdown completo, con variables Mustache):**

- ES: `docs/beta/vendor-welcome-email-template-es-2026-05-15.md`
- EN: `docs/beta/vendor-welcome-email-template-en-2026-05-15.md`
- FR: `docs/beta/vendor-welcome-email-template-fr-2026-05-15.md`

Variables mínimas: nombre, marca, `appUrl`, correo, enlaces `/shop/{handle}` y `/marketplace/sell`.

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

-- Otorgar badge "Tienda Verificada" después de revisión
-- (columna pendiente de migración: storefront_verified_at)
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
