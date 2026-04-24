# Strategic partner — playbook día 0 (SQL + sync + verificación)

Guía corta para **prender** import estratégico en un vendor de prueba y ver listings en el feed público **sin** datos reales firmados aún (solo bootstrap controlado: JSON estático o adapter `mock-*`).

**Requisito previo de negocio (no legal advice):** antes de representar inventario como socio real en producción, debe existir consentimiento explícito firmado según:

- [strategic-partner-listing-authorization-template.md](../legal/strategic-partner-listing-authorization-template.md)
- [strategic-partner-listing-authorization-onepager-es-en.md](../legal/strategic-partner-listing-authorization-onepager-es-en.md)

---

## 0) Prerrequisitos técnicos

1. Migraciones aplicadas (`V42`, `V43`).
2. Backend arriba con `DB_*` correcto.
3. Tu usuario admin: el email debe estar en `APP_ADMIN_EMAILS` (CSV) del host, porque `/api/admin/*` exige JWT y el control de admin es por email.

Ejemplo local (PowerShell):

```powershell
$env:APP_ADMIN_EMAILS = "tu@email.com"
```

---

## 1) Elegir vendor y snapshot de datos

### Alternativa sin SQL (solo UI admin)

En el panel **Admin** (`/admin`), sección de import de socios estratégicos:

1. Marca **Fundador** (`STRATEGIC_FOUNDER`) y **Import** en el vendor deseado.
2. Pulsa **Ejecutar sync de partners** (equivale a `POST /api/admin/partner-sync/run`).

Sigue siendo necesario tener `APP_ADMIN_EMAILS` con tu correo y sesión iniciada.

### Opción A — JSON estático en repo (recomendado para demo interna)

Ya existen snapshots de ejemplo:

- `backend/src/main/resources/vendors/sources/tarantulas-de-mexico.json`
- `backend/src/main/resources/vendors/sources/tarantula-canada.json`

El adapter estático busca: `classpath:vendors/sources/<slug>.json` donde `<slug>` es `official_vendors.slug`.

### Opción B — Adapter mock

Crea un vendor con `slug` que empiece por `mock-` (ej. `mock-demo-breeder`). El adapter mock genera 2 listings sintéticos.

---

## 2) SQL exacto: habilitar import estratégico

En Supabase SQL editor o `psql`, primero confirma slug e `id`:

```sql
SELECT id, slug, name, enabled,
       partner_program_tier,
       listing_import_enabled
FROM official_vendors
WHERE slug IN ('tarantulas-de-mexico', 'tarantula-canada')
ORDER BY slug;
```

Activa **solo** el que vayas a usar (ejemplo México):

```sql
UPDATE official_vendors
SET
  partner_program_tier = 'STRATEGIC_FOUNDER',
  listing_import_enabled = true,
  updated_at = now()
WHERE slug = 'tarantulas-de-mexico'
  AND enabled = true;
```

Repite con otro `slug` si quieres más de un vendor en la misma corrida.

**Nota:** si el vendor no está `enabled=true`, no aparecerá en el carril público de oficiales; para import/sync conviene dejarlo habilitado salvo que estés probando aislado.

---

## 3) Login admin y JWT

`/api/admin/*` requiere `Authorization: Bearer <jwt>`.

Ejemplo (ajusta URL y credenciales):

```bash
curl -s -X POST "http://localhost:8080/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"tu@email.com\",\"password\":\"TU_PASSWORD\"}"
```

Copia el token del JSON (`token` o el campo que devuelva tu `AuthResponse`).

En bash sería equivalente con comillas simples en el JSON.

---

## 4) Sync manual (upsert + stale rules)

```bash
curl -s -X POST "http://localhost:8080/api/admin/partner-sync/run" ^
  -H "Authorization: Bearer TU_JWT_AQUI" ^
  -H "Content-Type: application/json"
```

Respuesta: lista de corridas (`partner_listing_sync_runs`) con contadores.

Ver historial:

```bash
curl -s "http://localhost:8080/api/admin/partner-sync/runs" ^
  -H "Authorization: Bearer TU_JWT_AQUI"
```

Por vendor:

```bash
curl -s "http://localhost:8080/api/admin/partner-sync/runs?vendorId=UUID_DEL_VENDOR" ^
  -H "Authorization: Bearer TU_JWT_AQUI"
```

---

## 5) Verificación pública (feed combinado)

```bash
curl -s "http://localhost:8080/api/public/marketplace/listings" | head
```

En cada ítem partner deberías ver algo como:

- `"source":"partner"`
- `"isPartner":true`
- `"badgeLabel":"..."` (o default desde `official_vendors.badge`)
- `"canonicalUrl":"https://..."` (URL canónica del producto)
- `"officialVendor":{ "id", "slug", "name", "websiteUrl" }`

Los items peer siguen con `"source":"peer"`.

Flags de producto (monetización futura, desactivada):

```bash
curl -s "http://localhost:8080/api/public/marketplace/program-flags"
```

---

## 6) Scheduler (opcional)

Por defecto `PARTNER_SYNC_ENABLED=false` para no correr sync en background sin querer.

Cuando tengas feed real y quieras periodicidad:

```powershell
$env:PARTNER_SYNC_ENABLED = "true"
$env:PARTNER_SYNC_CRON = "0 */30 * * * *"
```

---

## 7) Rollback rápido

```sql
UPDATE official_vendors
SET listing_import_enabled = false,
    updated_at = now()
WHERE slug = 'tarantulas-de-mexico';
```

Los rows en `partner_listings` quedan como snapshot; el sync deja de actualizar hasta reactivar import.
