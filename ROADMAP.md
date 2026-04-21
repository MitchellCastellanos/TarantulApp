# TarantulApp — Roadmap

Última revisión: 2026-04-21 (dev/mitch)

---

## Ya está (hecho)

- **Marca y navegación**: Navbar unificado (`Navbar` + `PublicShell`), logo animado en barra y en Descubrir, `BrandNavbarLogo` / `BrandLogoMark`, tema claro/oscuro coherente. El logo del navbar **reinicia la animación del anillo** al cambiar de ruta (`key={pathname}`).
- **About**: Página `/about` con copy de marca, SEO, enlace en footer y en manifiesto del login.
- **i18n**: Placeholders y textos (cuenta keeper, quick log público, reset token, glifos de timeline sin emoji araña, strings marketplace/discover/social).
- **UX / accesibilidad visual**: Fondo sin emoji araña; compartir sin icono araña; badges perfil público con variables de tema; franja “keeper atmosphere” del dashboard con variantes **light/dark** (`.ta-dashboard-atmosphere-strip`).
- **Marketplace (backend + frontend)**: Listados, keeper profile, socios oficiales, leads; intro comunidad + disclaimers; franja horizontal de partners certificados; solicitud oficial en `<details>`; cabecera del strip con logo de marca (sin animación intro para no competir con el navbar); tarjetas sin escudo; CTA “Visit site” alineado al pie de cada tarjeta.
- **Descubrir (homepage pública)**: Columna marketplace + socios certificados y CTA; layout en dos columnas con búsqueda.
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

### Referidos (pendiente lógica de bono)

- Tablas listas para código por usuario y una redención por `referee`.
- **Invitado / invitador**: bonos en `BillingService` / badges (ver backlog); anti-abuso: cap, sin auto-referido, `referee_user_id` único.

---

## Lo que falta (no está / pendiente)

### Próximo sprint (prioridad sugerida)

- API + UI: **feed** de `activity_posts` públicos, crear post, likes/comentarios.
- **Chat**: servicio que resuelve `user_low` / `user_high`, envío de mensajes, bandeja, “Spood” en copy.
- **Referidos**: generar código al activar cuenta Pro o en Cuenta; aplicar días trial / badge al referidor.
- Revisar **orden en móvil** en Descubrir (marketplace hub debajo del buscador si hace falta).
- **Sitemap / SEO**: URL `/about`, `/marketplace`, `/comunidad` si aplica.
- **Marketplace**: fotos subidas (no solo URL) si el backend lo permite.
- **Pruebas**: E2E mínimos en rutas públicas críticas (login, discover, marketplace).

### Backlog (ideas, sin fecha)

- Notificaciones push enriquecidas por tipo de evento.
- Export / import de colección más allá de Excel.
- Perfil keeper público: compartir en redes con plantillas i18n.
- Logo secundario solo para área social (asset + OG).
