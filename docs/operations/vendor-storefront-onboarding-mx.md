# Onboarding de tienda / vendor (México) — primeros listings

Checklist interno después de la llamada con el prospecto y antes/después del correo de bienvenida.

## 1. Habilitar cuenta

1. Confirmar que el usuario existe (correo = el que te dieron).
2. En **Admin → usuario**:
   - `verifiedBreeder = true` (tier **Vendor** en marketplace: hasta 250 listings activos, boost, certificación de comercio en listings).
   - Revisar `publicHandle` único (será `/shop/{handle}`).
3. Si es **socio oficial** (catálogo importado + categorías de insumos):
   - Crear/actualizar fila en `official_vendors`.
   - `listing_import_enabled = true`, tier `STRATEGIC_PARTNER` o `STRATEGIC_FOUNDER`.
   - Asignar `listing_category` en `partner_listings` al sincronizar (`live_food`, `substrates`, `terrariums`, `supplies`, `tarantulas`).

## 2. Mes gratis

- Primer **30 días** sin cobro: comunicar en el correo (`docs/beta/vendor-welcome-email-template-es-2026-05-15.md`).
- Después: **$199 MXN / mes** (copy en Pro/Vendor MX). Cobro Stripe Vendor: env vars listas (`STRIPE_PRICE_ID_VENDOR_MONTHLY_MX`, `..._YEARLY_MX`); falta crear los Products/Prices en Stripe y poblar Railway. Mientras tanto **prioridad = publicar**.

> Activación + bienvenida desde **Admin → Vendors** (`/admin/vendors`): buscar usuario por correo, activar Vendor (flip `verified_breeder`), mandar correo ES/EN/FR en un clic.

## 3. Enviar correo

- Plantilla: `docs/beta/vendor-welcome-email-template-es-2026-05-15.md`
- Variables mínimas: nombre, marca, `appUrl`, correo, enlaces `/shop/{handle}` y `/marketplace/sell`.

## 4. Qué debe publicar el socio (día 0)

| Categoría | Ejemplos |
|-----------|----------|
| `tarantulas` | Ejemplares, slings |
| `breeding_projects` | Proyectos, parejas, sacas |
| `live_food` | Grillos, cucarachas, etc. |
| `substrates` | Lena, turba, mezclas |
| `terrariums` | Exo Terra, custom |
| `supplies` | Decoración, herramientas |

Mínimo sugerido para “llenar” marketplace: **8–15 listings** repartidos en 2+ categorías si vende insumos.

## 5. SQL útil (solo entornos controlados)

```sql
-- Activar vendor en usuario existente por email
UPDATE users
SET verified_breeder = true,
    verified_breeder_at = NOW()
WHERE LOWER(email) = LOWER('correo@tienda.mx');

-- Ejemplo: marcar partner listings como sustratos (tras import)
UPDATE partner_listings
SET listing_category = 'substrates'
WHERE official_vendor_id = 'UUID-DEL-VENDOR'
  AND title ILIKE '%substrate%' OR title ILIKE '%sustrato%';
```

## 6. Verificación

- [ ] `/shop/{handle}` carga con políticas.
- [ ] Listings visibles en `/marketplace?category=tarantulas` (y categorías de insumos si aplica).
- [ ] Usuario community sigue limitado a 5 listings / solo tarántulas y cría / sin certificación obligatoria.
