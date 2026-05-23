# TarantulApp — Roadmap

Última revisión: 2026-05-23 (Fases A–E cerradas en código; pendiente ops: Stripe live + Play real)

---

## Ya está (hecho)

### Producto marketplace y confianza (Fases A–E)

- **Fase A/B**: analytics, share kit, wishlist, species SEO, post-chat reviews, verified vendors, response badge, newsletter, FilterBar, storefront share.
- **Fase 0**: Flyway V99–V100 renumerado, ships-to UI, sort trust, copy admin.
- **Fase C**: Top Vendor leaderboard (V101), Boost ROI en Seller Hub.
- **Fase D**: species trade notes admin + público (V102), locales `es-MX` / `fr-CA`.
- **Fase E**: vendor referral codes + `vendor_boost_credits` (V103); crédito de boost 7d sin Stripe cuando aplica.
- **Partner storefront**: catálogo total fijo en hero; filtros de categoría/búsqueda client-side sin re-fetch.

### Plataforma (Sprint 1–2)

- **Marca y navegación**: Navbar unificado, tema claro/oscuro, logo animado.
- **About / SEO / E2E**: sitemap, Playwright smoke, marketplace JSON-LD.
- **Social**: feed, spoods, Sex ID cases, referidos, notificaciones enriquecidas, push por evento.
- **Social OG**: asset `og-social.png` (1200×630) + `socialOgImageUrl()` en comunidad, perfil keeper y Sex ID fallback.
- **Moderación, export JSON Pro, i18n en/es/fr + regionales**, etc. (ver commits anteriores).

---

## Lo que falta — solo ops / tu lado

Todo lo siguiente está **documentado** en [`docs/ops/billing-setup-manual-es.md`](./docs/ops/billing-setup-manual-es.md) (paso a paso en español) y [`docs/ops/stripe-products-catalog.md`](./docs/ops/stripe-products-catalog.md).

### Sprint 3 — Monetización real (bloqueado por configuración)

| Tarea | Quién |
|-------|--------|
| Crear Products/Prices en Stripe (Pro ×8, Vendor ×8, Boost ×4) | **Tú** |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, todos los `STRIPE_PRICE_ID_*` en Railway | **Tú** |
| Webhook → `POST /api/billing/webhook` + prueba checkout test | **Tú** |
| Customer Portal Stripe + return URL → `APP_BASE_URL/account` | **Tú** |
| Play: suscripción `tarantulapp_pro_monthly` + `GOOGLE_PLAY_BILLING_MODE=real` + SA JSON | **Tú** |
| Vendor checkout “coming soon” hasta validar demanda | Producto (ya en UI) |

### Infra / launch (recomendado)

| Tarea | Doc |
|-------|-----|
| Sentry, hCaptcha, Cloudinary, SMTP en prod | [`docs/ops/README.md`](./docs/ops/README.md) |
| UptimeRobot / status page | README ops |
| Smoke manual referidos vendor + boost credit en prod | — |

### Backlog opcional (sin fecha)

- Newsletter HTML branded (hoy plain text).
- Play Billing nativo para Vendor/Boost (hoy Stripe Checkout desde web/Custom Tab).
- SKUs Play extra: `tarantulapp_pro_yearly`, vendor, boost consumible.

---

## Referidos

Flujo en **Cuenta / Comunidad → Invitar**. Vendors verificados: código vendor → crédito boost por signup; keepers: hitos Pro trial. Validar en prod con un signup de prueba.
