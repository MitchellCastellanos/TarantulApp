# Operations Docs

Indice de la documentacion operativa de TarantulApp. Pensada para que el
ingeniero de guardia pueda actuar en menos de 5 minutos sin tener que
preguntar.

## Por situacion

| Necesito... | Documento |
|-------------|-----------|
| Algo se rompio en produccion (API 5xx, login no funciona, fotos no cargan) | [`runbook.md`](./runbook.md) |
| Coordinar el incidente con el equipo + comunicar a usuarios | [`incident-response.md`](./incident-response.md) |
| Configurar Sentry / Actuator / logs estructurados | [`observability.md`](./observability.md) |
| Configurar hCaptcha y rate limits anti-abuso | [`abuse-defenses.md`](./abuse-defenses.md) |
| Verificar Stripe webhooks o desplegar Play Billing | [`billing-hardening.md`](./billing-hardening.md) |

## Por dependencia externa

| Servicio | Donde se documenta su failure mode | Donde se documenta su setup |
|----------|-----------------------------------|----------------------------|
| Supabase / PostgreSQL | runbook §3 | `backend/src/main/resources/application-local.properties.SAMPLE` |
| Stripe | runbook §2 | `billing-hardening.md` |
| Google Play Billing | runbook §2 | `billing-hardening.md` |
| Cloudinary | runbook §4 | `application.properties` (`CLOUDINARY_*`) |
| SMTP | runbook §5 | `application.properties` (`MAIL_*`) |
| Sentry | observability §Sentry | `observability.md` |
| FCM (push) | runbook §7 | `application.properties` (`FCM_SERVER_KEY`) |
| hCaptcha | observability `app.captcha.*` | `abuse-defenses.md` |

## Por checklist de despliegue

Antes de poner el sitio bajo trafico real, asegurate que en
Railway/Fly.io/Vercel estan seteadas estas variables (no commitear nunca):

### Backend (Railway / Fly.io)

| Variable | Donde se obtiene |
|----------|------------------|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Supabase -> Connect |
| `JWT_SECRET` | `openssl rand -base64 48` |
| `MANAGEMENT_TOKEN` | `openssl rand -hex 32` |
| `LOG_FORMAT` | `json` |
| `APP_ENVIRONMENT` | `production` |
| `SENTRY_DSN` | sentry.io -> Project -> Client Keys |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | dashboard.stripe.com |
| `CAPTCHA_SECRET` | hcaptcha.com -> New Site |
| `CLOUDINARY_*` | cloudinary.com -> Settings -> API Keys |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` | SMTP provider |

### Frontend (Vercel build env)

| Variable | Donde se obtiene |
|----------|------------------|
| `VITE_API_URL` | URL publica del backend |
| `VITE_SENTRY_DSN` | sentry.io -> proyecto frontend |
| `VITE_HCAPTCHA_SITE_KEY` | hcaptcha.com -> New Site |
| `VITE_GOOGLE_CLIENT_ID` | Google Cloud Console -> Credentials |

## Servicios externos requeridos al lanzamiento

- **UptimeRobot** (free): monitor 5-min sobre `https://api.tarantulapp.com/actuator/health`. Alerta a Slack/Telegram.
- **Sentry** (free 5k events/mes): proyectos backend + frontend.
- **Cloudflare** (free) en frente del backend: WAF basico, rate limit, DDoS mitigation. Solo cambia DNS.
- **Status page** publica (recomendado): Statuspage.io free o `uptime-kuma` self-hosted.

## Postmortems

Se guardan en `docs/ops/postmortems/YYYY-MM-DD-<slug>.md`. Plantilla en
[`incident-response.md` §Postmortem](./incident-response.md).

## Como mantener esta documentacion

- Si tuviste que improvisar durante un incidente -> antes del postmortem, anade
  la mitigacion que funciono al runbook.
- Si una variable de entorno cambio o agregaste una nueva -> actualiza la tabla
  de despliegue arriba en el mismo PR.
- Si una integracion externa cambio API (FCM legacy -> v1, Stripe API version)
  -> nota en la seccion correspondiente con la fecha de migracion.
