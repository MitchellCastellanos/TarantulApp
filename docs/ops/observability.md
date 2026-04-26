# Observability — Stream A

Resumen rapido de lo que aporta esta rama y como activarlo en los entornos.

## Que se anadio

1. **Spring Boot Actuator** con tres endpoints expuestos:
   - `GET /actuator/health` — publico, sin detalles. Usar para UptimeRobot / Railway / Fly.io health checks.
   - `GET /actuator/health/liveness` — publico, para probes de orquestador.
   - `GET /actuator/health/readiness` — publico, para probes de orquestador.
   - `GET /actuator/info`, `/actuator/metrics`, `/actuator/metrics/{name}`, `/actuator/prometheus` — protegidos detras del header `X-Admin-Token: <MANAGEMENT_TOKEN>`. Si `MANAGEMENT_TOKEN` esta vacio, responden 403.

2. **Logs estructurados JSON** en produccion. Controlado por `LOG_FORMAT`:
   - `LOG_FORMAT=text` (default) — formato legible con `[req=<id>]`, ideal para desarrollo local.
   - `LOG_FORMAT=json` — una linea JSON por log con `timestamp`, `level`, `logger`, `thread`, `message`, MDC (`request_id`, `http_method`, `http_path`), y `stack_trace` cuando aplica.

3. **Correlation ID** (`X-Request-Id`) generado por `CorrelationIdFilter`:
   - Si el cliente envia `X-Request-Id`, lo reutiliza (valida: alfanumericos + `- _ . :`, max 128 chars).
   - Si no, genera un UUID.
   - Lo propaga en el MDC (`request_id`) para los logs y en la respuesta HTTP.
   - Si Sentry esta activo, lo adjunta como tag del scope para correlacionar errores con logs.

4. **Sentry** (no-op cuando DSN no esta configurado):
   - Backend: `sentry-spring-boot-starter-jakarta` se auto-configura desde `sentry.*`. Captura excepciones no manejadas y logs de nivel ERROR automaticamente (appender `SENTRY` en `logback-spring.xml`).
   - Frontend: `@sentry/react` inicializado en `src/main.jsx` mediante `initObservability()`. App envuelta en `<Sentry.ErrorBoundary>` con fallback bilingue.

## Variables de entorno

### Backend (Railway / Fly.io)

| Variable | Default | Notas |
|----------|---------|-------|
| `LOG_FORMAT` | `text` | Poner `json` en produccion. |
| `MANAGEMENT_TOKEN` | _(vacio)_ | Obligatorio para acceder a `/actuator/info\|metrics\|prometheus`. Generar con `openssl rand -hex 32`. |
| `SENTRY_DSN` | _(vacio)_ | Deja vacio para desactivar. |
| `SENTRY_ENVIRONMENT` | `development` | `production`, `staging`, etc. |
| `SENTRY_RELEASE` | _(vacio)_ | Ej. `tarantulapp-backend@0.1.0` para agrupar regresiones por version. |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.0` | Subir a `0.05`–`0.1` si activas performance monitoring. |

### Frontend (build-time, inyectadas por Vite como `import.meta.env.VITE_*`)

| Variable | Default | Notas |
|----------|---------|-------|
| `VITE_SENTRY_DSN` | _(vacio)_ | Vacio = Sentry deshabilitado. |
| `VITE_SENTRY_ENVIRONMENT` | `MODE` | `production`, `staging`. |
| `VITE_SENTRY_RELEASE` | _(vacio)_ | Recomendado atar al hash de commit o version de package.json. |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | `0` | |
| `VITE_SENTRY_REPLAY_SESSION_RATE` | `0` | Session Replay — ojo con quota y PII. |
| `VITE_SENTRY_REPLAY_ERROR_RATE` | `0` | Replay solo cuando hay error. |

## Verificacion rapida post-deploy

```bash
# Liveness publico
curl -i https://api.tarantulapp.com/actuator/health
# -> 200 {"status":"UP"}

# Metrics requiere token
curl -i -H "X-Admin-Token: $MANAGEMENT_TOKEN" https://api.tarantulapp.com/actuator/metrics
# -> 200 {"names":[...]}

# Sin token: 403
curl -i https://api.tarantulapp.com/actuator/metrics
# -> 403 Forbidden

# Correlation ID se propaga
curl -i https://api.tarantulapp.com/actuator/health | grep -i X-Request-Id
# -> X-Request-Id: <uuid>
```

## Pendiente (sera implementado en Streams posteriores)

- `Stream B`: rate limiting en endpoints publicos adicionales + hCaptcha en registro / password-reset.
- `Stream C`: endurecimiento Stripe / Play Billing (idempotencia de webhooks, verificacion server-side).
