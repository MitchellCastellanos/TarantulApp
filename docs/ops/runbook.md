# Runbook — TarantulApp

Acciones concretas para los incidentes mas probables al lanzamiento. Cada
seccion tiene **sintoma -> diagnostico -> mitigacion -> resolucion**.

> **Antes de tocar nada en produccion:** abre Sentry y revisa `/actuator/health`
> con `X-Admin-Token`. La mayoria de las "caidas" son sintomas de un solo
> proveedor (DB, SMTP, Stripe). Identifica cual antes de actuar.

---

## 1. Backend caido / 5xx generalizado

**Sintoma:** UptimeRobot dispara, usuarios reportan "Bad Gateway" o "DATABASE_BUSY".

### Diagnostico (en orden)

```bash
# Liveness probe
curl -i https://api.tarantulapp.com/actuator/health
# -> {"status":"UP"} OK
# -> {"status":"DOWN"} pasa al paso 2

# Logs estructurados (si LOG_FORMAT=json)
# Filtrar por level=ERROR en los ultimos 15 min en el proveedor (Better Stack/Loki/Papertrail)

# Sentry
# https://sentry.io/organizations/tarantulapp/issues/?project=backend&statsPeriod=1h
```

### Mitigacion

1. **Si la DB esta saturada** (`DATABASE_BUSY`, `MaxClientsInSessionMode`):
   - Subir temporalmente `DB_POOL_MAX` a 4 en Railway -> redeploy.
   - Si Supabase Session pooler agotado: cambiar `DB_URL` a Direct (`db.<ref>.supabase.co:5432`).
2. **Si OOM:** reiniciar la instancia (Railway -> Restart) y abrir ticket para subir RAM.
3. **Si todo apunta a un commit reciente:** rollback. Ver "Rollback" en `incident-response.md`.

### Resolucion

- Crear issue con root cause y horarios.
- Si fue saturacion DB: habilitar Stream F (Redis + connection pool real).

---

## 2. Stripe webhooks fallando

**Sintoma:** Stripe Dashboard -> Webhooks -> tasa de fallo > 0%, o
usuarios pagan pero no se activa PRO.

### Diagnostico

```bash
# Test desde Stripe CLI (requiere stripe login)
stripe listen --forward-to https://api.tarantulapp.com/api/billing/webhook
stripe trigger checkout.session.completed

# Logs del backend filtrar por: 
#   logger=com.tarantulapp.service.BillingService
#   level=WARN o ERROR
```

Errores tipicos:

| Error en log | Causa | Accion |
|--------------|-------|--------|
| `Firma de webhook invalida` | Secret rotado o `STRIPE_WEBHOOK_SECRET` desincronizado | Copiar el secret del endpoint en Stripe Dashboard |
| `Webhook secret no configurado` | Env var vacia | Setear `STRIPE_WEBHOOK_SECRET` en Railway/Fly.io |
| `Webhook invalido` | Excepcion al procesar (ej. JSON shape inesperado) | Revisar Sentry; el evento se reintenta automaticamente |
| `Stripe webhook duplicate` | Reintento normal de Stripe | No es error |

### Mitigacion

1. **Si el secret esta desincronizado:** actualizarlo en Railway -> redeploy. Stripe reintenta los eventos fallidos hasta 3 dias.
2. **Si el handler esta tirando 500 por bug:** Stripe seguira reintentando.
   Si urge, deshabilitar el endpoint en Stripe Dashboard, hacer fix, redeploy,
   y re-enviar manualmente desde el Dashboard.
3. **Para reprocesar manualmente** un evento ya marcado como duplicate:
   ```sql
   DELETE FROM processed_webhook_events WHERE event_id = 'evt_xxx';
   -- Luego re-send desde Stripe Dashboard
   ```

### Resolucion

- Verificar que `subscriptions` y `users.plan` reflejan el evento.
- Si hay drift: cron de reconciliacion (Stream F).

---

## 3. Base de datos caida (Supabase)

**Sintoma:** Backend responde 503 `DATABASE_UNAVAILABLE`.

### Diagnostico

```bash
# Status page Supabase
curl -I https://status.supabase.com/
# Direct connection desde tu maquina
psql "postgresql://postgres:$DB_PASSWORD@db.$REF.supabase.co:5432/postgres?sslmode=require"
```

### Mitigacion

1. Si Supabase tiene incidente en su status page -> esperar y comunicar a usuarios.
2. Si solo el pooler esta caido pero direct funciona: cambiar `DB_URL` a Direct -> redeploy.
3. Verificar que los backups automaticos siguen corriendo (Settings -> Backups).

### Resolucion

- Si fue agotamiento de slots en Session pooler -> migrar a Transaction pooler con `prepareThreshold=0`, o subir a Supabase Pro.

---

## 4. Cloudinary lleno / fotos no cargan

**Sintoma:** Usuarios ven placeholders, console del navegador muestra 401 o 403 en `res.cloudinary.com`.

### Diagnostico

- Cloudinary Dashboard -> Usage. Si bandwidth o transformations estan cerca de 100% del free tier (25 creditos), las imagenes se bloquean hasta el reset mensual.

### Mitigacion

1. **Inmediato:** desactivar Cloudinary en `application.properties` (`CLOUDINARY_CLOUD_NAME` vacio) -> el backend cae al filesystem local. No funciona en Railway free tier (sin disco persistente). Solo si tienes disco montado.
2. **Mediano plazo:** comprar Cloudinary Plus ($89/mes) o migrar a S3 + CloudFront (mas barato a escala).

### Resolucion

- Alarma a 70% de quota: configurar webhook de Cloudinary o monitor manual.

---

## 5. SMTP rebota / emails no llegan

**Sintoma:** Usuarios reportan que no reciben password reset, billing receipts.

### Diagnostico

```bash
# Probar el SMTP desde el backend
# (Logs de EmailService deben mostrar el error real)
```

### Mitigacion

1. **Free tier agotado** (SendGrid/Brevo: 100-300/dia): subir plan o migrar a otro proveedor.
2. **Credenciales:** rotar `MAIL_PASSWORD` en Gmail "App Passwords" -> Railway.
3. **Bouncebacks por IP en blacklist:** cambiar de proveedor (no tiene sentido luchar con un IP de Railway).

### Resolucion

- Mover a un proveedor transaccional dedicado (Postmark, Resend, Brevo paid) cuando se llegue al limite.

---

## 6. Cola de moderacion explota

**Sintoma:** `/api/admin/reports?status=pending` regresa cientos. Comunidad se queja de spam visible.

### Diagnostico

- Filtrar reportes por target -> si todos apuntan al mismo usuario/listing, es un brigading.
- Sentry: revisar si entra ola de POSTs a `/api/public/reports/**` desde una sola IP (deberia caer en `AbuseRateLimitFilter`).

### Mitigacion

1. **Brigading manual:** banear keeper temporalmente con `UPDATE users SET hidden_at = NOW() WHERE id = ...`.
2. **Bot:** bajar `RATE_LIMIT_REPORTS_PER_MINUTE` (default 8 -> 4) y reiniciar.
3. **Reportes legitimos** (real spam masivo): activar feature flag de "auto-hide a 3 reportes" (pendiente Stream D) o procesarlos manualmente.

### Resolucion

- Acelerar Stream D (auto-mod + trust score).

---

## 7. Push notifications caidas

**Sintoma:** Usuarios no reciben notificaciones; `DevicePushToken` no se elimina.

### Diagnostico

```bash
# Verificar FCM_SERVER_KEY
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=$FCM_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":"/topics/test","notification":{"title":"test","body":"test"}}'
```

### Mitigacion

1. Si FCM legacy API descontinuada: migrar a FCM HTTP v1 (requiere refactor en `PushNotificationService`).
2. Token vencidos: limpiarlos con `DELETE FROM device_push_tokens WHERE updated_at < NOW() - INTERVAL '90 days'`.

### Resolucion

- Migrar a FCM HTTP v1 antes de junio 2024 (Google ya descontinuo legacy).

---

## 8. Despliegue rompe produccion

Ver `docs/ops/incident-response.md` -> seccion **Rollback**.
