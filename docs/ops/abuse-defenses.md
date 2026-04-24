# Abuse Defenses — Stream B

Resumen de los limites anti-abuso anadidos en este stream y como configurarlos
para produccion.

## Que se anadio

### Rate limits adicionales (in-memory, por instancia)

| Endpoint | Default | Variable env |
|----------|---------|--------------|
| `POST /api/public/reports/**` | 8/min por IP | `RATE_LIMIT_REPORTS_PER_MINUTE` |
| `POST /api/sex-id-cases/{id}/vote` | 30/min por usuario (IP fallback) | `RATE_LIMIT_SEX_ID_VOTE_PER_MINUTE` |

Implementacion: `AbuseRateLimitFilter`. Sigue el patron de los filters existentes
(`AuthRateLimitFilter`, `ChatMessageRateLimitFilter`, `PublicFeedRateLimitFilter`)
y comparte el mismo `RateLimitExceededException` que el `GlobalExceptionHandler` mapea
a HTTP 429.

> **Limitacion conocida:** los buckets son in-memory y por instancia. Cuando escalemos
> horizontalmente (Stream F) hay que mover el estado a Redis. Para una sola instancia
> en Railway/Fly.io es suficiente.

### hCaptcha en `/auth/register` y `/auth/forgot-password`

Backend:
- `CaptchaService` valida el token contra `https://hcaptcha.com/siteverify`.
- `AuthController` lo invoca antes de delegar al servicio. Si falla la verificacion
  o el provider esta caido, el endpoint responde 400 con `error: captcha_invalid`
  (`captcha_unavailable` o `captcha_required`).
- `app.captcha.secret` vacio = no-op. Util en dev/CI.

Frontend:
- `HCaptchaWidget` carga el script `js.hcaptcha.com/1/api.js` solo cuando hay site key.
- Sin site key, el componente devuelve `null` y los formularios envian sin token.
- El backend tambien debe estar deshabilitado o las llamadas fallaran con 400.

## Variables de entorno

### Backend
| Variable | Default | Notas |
|----------|---------|-------|
| `CAPTCHA_SECRET` | _(vacio)_ | Vacio = deshabilitado. Pega el secret del dashboard hCaptcha. |
| `CAPTCHA_VERIFY_URL` | `https://hcaptcha.com/siteverify` | Compatible con Google reCAPTCHA si lo cambias. |
| `CAPTCHA_ENABLED` | _(inferido)_ | Override: `true`/`false`. Util si quieres forzar el chequeo en CI. |
| `RATE_LIMIT_REPORTS_PER_MINUTE` | `8` | |
| `RATE_LIMIT_SEX_ID_VOTE_PER_MINUTE` | `30` | |

### Frontend (Vite, build-time)
| Variable | Default | Notas |
|----------|---------|-------|
| `VITE_HCAPTCHA_SITE_KEY` | _(vacio)_ | Site key publica de hCaptcha. |

## Setup paso a paso (produccion)

1. Crear cuenta gratis en `https://hcaptcha.com/`.
2. New Site → copiar **Site Key** y **Secret Key**.
3. **Backend** (Railway/Fly.io env): `CAPTCHA_SECRET=<secret>`.
4. **Frontend** (Vercel/build env): `VITE_HCAPTCHA_SITE_KEY=<site_key>`.
5. Redeploy ambos. Verificar:
   - `/login` en modo register muestra el widget hCaptcha.
   - `/forgot-password` muestra el widget.
   - Sin completar captcha, el submit deberia mostrar `Por favor completa el captcha`.

## Smoke test rapido

```bash
# Sin token: 400
curl -i -X POST https://api.tarantulapp.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com"}'
# -> 400 {"error":"captcha_required"}

# Con token invalido: 400
curl -i -X POST https://api.tarantulapp.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","captchaToken":"fake"}'
# -> 400 {"error":"captcha_invalid"}
```

## Pendiente (para Streams futuros)

- Stream F: mover buckets a Redis para correr varias instancias en paralelo.
- Stream D: filtro de palabrotas + auto-hide al recibir N reportes (consume el limite anterior pero no reemplaza al human queue).
- Stream C: idempotencia de webhooks Stripe/Play.
