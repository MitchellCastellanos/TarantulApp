# TarantulApp — Roadmap

Última revisión: 2026-04-20 (dev/mitch)

---

## Ya está (hecho)

- **Marca y navegación**: Navbar unificado (`Navbar` + `PublicShell`), logo animado en barra y en Descubrir, `BrandNavbarLogo` / `BrandLogoMark`, tema claro/oscuro coherente.
- **About**: Página `/about` con copy de marca, SEO, enlace en footer y en manifiesto del login.
- **i18n**: Placeholders y textos (cuenta keeper, quick log público, reset token, glifos de timeline sin emoji araña, strings marketplace/discover).
- **UX / accesibilidad visual**: Fondo sin emoji araña; compartir sin icono araña; badges perfil público con variables de tema.
- **Marketplace (backend + frontend)**: Listados, keeper profile, socios oficiales, leads; intro comunidad + disclaimers; franja horizontal de partners certificados; solicitud oficial en `<details>`; cabecera del strip con logo de marca (no escudo duplicado); tarjetas sin escudo; CTA “Visit site” alineado al pie de cada tarjeta.
- **Descubrir (homepage pública)**: Columna marketplace + socios certificados y CTA; layout en dos columnas con búsqueda.
- **Componentes**: `OfficialPartnerShield` reutilizable; logos públicos en assets si aplica.

---

## Lo que falta (no está / pendiente)

### Próximo sprint (prioridad sugerida)

- Revisar **orden en móvil** en Descubrir (marketplace hub debajo del buscador si hace falta).
- **Sitemap / SEO**: URL `/about` y marketplace en el sitemap si el generador no las incluye aún.
- **Marketplace**: moderación en volumen, filtros guardados, fotos subidas (no solo URL) si el backend lo permite.
- **Pruebas**: E2E mínimos en rutas públicas críticas (login, discover, marketplace).

### Backlog (ideas, sin fecha)

- Notificaciones push enriquecidas por tipo de evento.
- Export / import de colección más allá de Excel.
- Perfil keeper público: compartir en redes con plantillas i18n.
