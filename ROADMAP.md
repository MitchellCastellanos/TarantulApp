# TarantulApp — Roadmap

Última revisión: 2026-04-22 (Sprint 1 cerrado en código)

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

## Lo que falta (no está / pendiente)

### Próximo sprint (Sprint 2 — sugerido: diferenciación viral)

- **Cases / “Sex ID guess” (MVP)**: entidad o modelo claro, votos agregados, reglas, URL pública compartible, CTA a compartir + `?ref=`.
- **Alinear monetización** con narrativa: Stripe/Pro estable en producción; Pro+/Vendor cuando estén acotados en producto/DB.
- (Si el doc histórico abajo ya está cubierto en el código, se archiva: feed público, Spood, referidos con códigos — comprobar en `SocialHub` / Cuenta / `BillingService` y tachar en la siguiente revisión del roadmap.)

### Cierre fase 1 (documento heredado — parte ya obsoleta)

- ~~Sitemap/SEO /about, /marketplace~~, ~~fotos listing~~, ~~E2E básico~~, ~~móvil Descubrir~~ → hecho en Sprint 1.

### Backlog (ideas, sin fecha)

- Notificaciones push enriquecidas por tipo de evento.
- Export / import de colección más allá de Excel.
- Perfil keeper público: compartir en redes con plantillas i18n.
- Logo secundario solo para área social (asset + OG).
