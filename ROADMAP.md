# TarantulApp — Roadmap

Última revisión: 2026-04-22 (Sprint 2 + backlog técnico principal cerrados; pendiente Stripe real)

---

## Ya está (hecho)

- **Marca y navegación**: Navbar unificado (`Navbar` + `PublicShell`), logo animado en barra y en Descubrir, `BrandNavbarLogo` / `BrandLogoMark`, tema claro/oscuro coherente. El logo del navbar **reinicia la animación del anillo** al cambiar de ruta (`key={pathname}`).
- **About**: Página `/about` con copy de marca, SEO (incl. OG), enlace en footer y en manifiesto del login.
- **Sitemap / SEO (build)**: `vite-plugin-site-seo` genera `sitemap.xml` y `robots.txt`; rutas indexables incluyen `/about` y `/marketplace`. Página **Marketplace** con meta/JSON-LD; **Comunidad** (`/comunidad`) con `noindex` (ruta autenticada). URL canónica vía `VITE_PUBLIC_SITE_URL` (build).
- **Pruebas E2E**: Playwright, `npm run test:e2e` (build + smoke en login, descubrir, marketplace, about, redirección comunidad, robots/sitemap).
- **Marketplace imágenes**: `POST /api/marketplace/listings/photo` (multipart) + subida en formulario; listados usan `imgUrl` para paths bajo `/uploads/…`.
- **i18n**: Placeholders y textos (cuenta keeper, quick log público, reset token, glifos de timeline sin emoji araña, strings marketplace/discover/social).
- **UX / accesibilidad visual**: Fondo sin emoji araña; compartir sin icono araña; badges perfil público con variables de tema; franja “keeper atmosphere” del dashboard con variantes **light/dark** (`.ta-dashboard-atmosphere-strip`).
- **Marketplace (backend + frontend)**: Listados, keeper profile, socios oficiales, leads; intro comunidad + disclaimers; franja horizontal de partners certificados; solicitud oficial en `<details>`; cabecera del strip con logo de marca (sin animación intro para no competir con el navbar); tarjetas sin escudo; CTA “Visit site” alineado al pie de cada tarjeta.
- **Descubrir (homepage pública)**: Columna marketplace + socios certificados y CTA; layout en dos columnas con búsqueda; **orden móvil** explícito (buscador arriba, hub marketplace abajo).
- **Componentes**: `OfficialPartnerShield` reutilizable; logos públicos en assets si aplica.
- **Social (inicio)**: Ruta privada `/comunidad` (`SocialHubPage`), copy de marca + teaser “spood”, hero con logo con intro y estilos **light/dark** (`.ta-social-hub-hero`). Enlace “Comunidad” en navbar solo con sesión.
- **Notificaciones de comunidad (enriquecidas)**: Eventos `SPOOD_RECEIVED`, `POST_COMMENT`, `SEX_ID_VOTE` con payload contextual (`route`, ids, snippet), deep-link desde campana y script SQL idempotente para backfill/índices en Supabase (`scripts/supabase_notifications_hardening.sql`).
- **Push enriquecido por evento**: `NotificationService` dispara push con `type` + `route` para navegación contextual en app nativa (Android activo; iOS preparado por token/plataforma).
- **Share keeper profile (plantillas)**: Plantillas de compartir para perfil keeper (`default` / WhatsApp / Instagram) e integración en `/u/:handle` con botón de copiar + CTA WhatsApp.
- **Social OG específico**: OG social usando `logo-neon.png` en comunidad y SEO específico en perfil público keeper.
- **Paywall / gates Free vs Pro (UX)**: Mensajes de límite más claros en dashboard y detalle de tarántula bloqueada, con CTA directo a upgrade/pro trial.
- **Export / import beyond Excel**: export/import JSON de colección en dashboard (Pro), además de export Excel/PDF ya existente.
- **Datos y moderación (cimiento)**: Migración `V30` — `activity_posts` (visibilidad `private` | `followers` | `public`, `hidden_at` para moderación), `chat_threads` / `chat_messages` (DM 1:1 + `listing_id` opcional), `referral_codes`, `referral_redemptions`, `users.referred_by_user_id`. Entidades JPA + repos. Reporte público `POST /api/public/reports/activity-post/{id}`; admin `hide_activity_post` y `hide_keeper_profile` (quita `public_handle` del usuario reportado como keeper).

---

## Especificación producto (social / privacidad / referidos)

### Dos capas de perfil

| Capa | Qué es | Visibilidad |
|------|--------|-------------|
| **Marketplace / badges** | Handle, bio, reputación, contacto para vender | El usuario lo hace público para operar en marketplace; eso es lo mínimo que “sale” hacia compradores. |
| **Posts / social** | Fotos de arañas, mudas, hitos, texto | **Por publicación**: `private`, `followers` (reservado hasta haber grafo social), `public`. No se asume que todo el social sea público ni que coincida con el flag de marketplace. |

### Moderación (`moderation_reports.target_type`)

| `target_type` | Acción admin “ocultar” |
|---------------|-------------------------|
| `public_tarantula` | `hide_tarantula` → `is_public = false` |
| `marketplace_listing` | `hide_listing` → status hidden |
| `activity_post` | `hide_activity_post` → `hidden_at` en `activity_posts` |
| `keeper_profile` | `hide_keeper_profile` → `public_handle = null` (deja de ser hallable por handle en marketplace) |
| (futuro) `chat_message` | definir cuando exista reporte desde hilo |

### Referidos (estado a revisar en app)

- Flujo con código, hitos e invitación vive en **Cuenta / Comunidad**; validar en producción que bonos y anti-abuso coinciden con la especificación.

---

## Lo que falta (pendiente real)

### Sprint 3 — Monetización real (próximo)

- **Stripe real en entorno**: cargar y validar `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_YEARLY` y (opcional) `STRIPE_PRICE_ID_LISTING_BOOST`.
- **Go-live de billing**: validar checkout/verify/webhook/portal en modo test end-to-end con eventos reales de Stripe.
- **Vendor / Business (próximamente)**: mantener “coming soon” con precio de entrada más bajo y validar demanda antes de activar checkout.

### Sprint 2 — Diferenciación viral (estado)

- **Cases / Sex ID guess (MVP)**: implementado (modelo, votos agregados, reglas, URL pública compartible y CTA de share con `?ref=`).
- **Social/feed/referrals base**: implementado en rutas y servicios actuales; queda mantener pruebas de regresión al avanzar Sprint 3.

### Cierre fase 1 (documento heredado — parte ya obsoleta)

- ~~Sitemap/SEO /about, /marketplace~~, ~~fotos listing~~, ~~E2E básico~~, ~~móvil Descubrir~~ → hecho en Sprint 1.

### Backlog (ideas, sin fecha)

- Logo secundario solo para área social (asset + OG), si se decide crear uno distinto a `logo-neon`.
