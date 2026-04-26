# Billing Hardening — Stream C

Resumen de los cambios anti-fraude / anti-doble-cobro hechos al pipeline de
billing antes de lanzar.

## Que se anadio

### 1. Verificacion de webhook Stripe con `Webhook.constructEvent`

`BillingService.handleStripeWebhook` ya no parsea la firma a mano. Ahora delega
a `com.stripe.net.Webhook.constructEvent(payload, sig, secret)`, que:

- Verifica todas las firmas `v1=` del header (soporta rotacion de secretos sin
  ventana de invalidacion).
- Aplica una **tolerancia de timestamp de 5 min** por defecto. Sin esto, un
  payload capturado se podria reenviar dias despues con su firma original valida
  y el backend lo ejecutaria.
- Lanza `SignatureVerificationException` que ahora se mapea a
  `IllegalArgumentException("Firma de webhook invalida")` (mismo 400 que antes).

### 2. Tabla de idempotencia `processed_webhook_events`

Migracion `V46__processed_webhook_events.sql`:

```sql
CREATE TABLE processed_webhook_events (
    event_id     VARCHAR(255) PRIMARY KEY,  -- Stripe `evt_*`, Play notification id, etc.
    source       VARCHAR(64)  NOT NULL,     -- "stripe", "google_play", ...
    event_type   VARCHAR(128),              -- "checkout.session.completed", ...
    received_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_processed_webhook_events_received_at ON processed_webhook_events(received_at);
```

Patron de uso en `handleStripeWebhook`:

1. Construye y verifica `Event` con `Webhook.constructEvent`.
2. Si `event.id` ya existe en la tabla -> log `duplicate`, ack 200, no hace nada.
3. Si no existe -> `saveAndFlush(record)` para forzar la check del PK *ahora*
   (no en el commit). Si choca con `DataIntegrityViolationException` -> race
   con otra entrega concurrente, ack 200.
4. Procesa los handlers existentes (`upsertFromCheckoutCompleted`, `handleInvoicePaid`,
   `upsertFromSubscriptionObject`).
5. Si algun handler falla, el `@Transactional` revierte tanto los efectos
   colaterales como la fila de idempotencia, asi que Stripe puede reintentar.

### 3. Production stub guard para Google Play Billing

`verifyGooglePlaySubscription` ahora rechaza tokens `test_*` cuando:

- `billing.google-play.production-stub-guard=true` (default), Y
- `app.environment` parece produccion (`production`, `prod`, `prd`), Y
- `billing.google-play.mode=stub`.

Devuelve `IllegalArgumentException("GOOGLE_PLAY_STUB_DISABLED_IN_PRODUCTION")`
y emite log `ERROR` con instruccion de override. Razon: un descuido tipico es
desplegar con `GOOGLE_PLAY_BILLING_ENABLED=true` y `GOOGLE_PLAY_BILLING_MODE=stub`,
lo que dejaria a cualquier cliente upgradearse a PRO con `purchaseToken=test_xyz`.

Se desactiva con `PLAY_BILLING_PRODUCTION_STUB_GUARD=false` *solo* cuando este
implementada la verificacion real con Android Publisher API.

## Variables de entorno

| Variable | Default | Notas |
|----------|---------|-------|
| `APP_ENVIRONMENT` | `${SPRING_PROFILES_ACTIVE:development}` | Prod debe ser `production`. |
| `PLAY_BILLING_PRODUCTION_STUB_GUARD` | `true` | Solo `false` cuando server-side verify este lista. |

## Pendientes / siguiente fase

- Implementar `verifyGooglePlaySubscription` para `mode=real` usando Android
  Publisher API (`androidpublisher.purchases.subscriptions.get`). Cuando
  llegue, eliminar la rama stub completa.
- Job programado: `DELETE FROM processed_webhook_events WHERE received_at < NOW() - INTERVAL '60 days'`
  cuando la tabla supere los ~100k registros.
- Tests E2E para webhook flow con firma real (requiere fixtures con HMAC valido
  o Stripe CLI en CI).

## Smoke test rapido (produccion)

```bash
# 1. Stripe webhook con firma invalida -> 400
curl -i -X POST https://api.tarantulapp.com/api/billing/webhook \
  -H "Stripe-Signature: t=1,v1=invalid" \
  -H "Content-Type: application/json" \
  -d '{"id":"evt_test_1","type":"checkout.session.completed"}'
# -> 400 "Firma de webhook invalida"

# 2. Google Play en prod sin server-side verify -> rechaza
curl -i -X POST https://api.tarantulapp.com/api/billing/google-play/verify \
  -H "Authorization: Bearer $JWT" \
  -d '{"purchaseToken":"test_token","productId":"tarantulapp_pro_monthly"}'
# -> 400 {"error":"GOOGLE_PLAY_STUB_DISABLED_IN_PRODUCTION"}

# 3. Verificar tabla idempotencia (admin)
curl -H "X-Admin-Token: $MANAGEMENT_TOKEN" \
  "https://api.tarantulapp.com/actuator/metrics/spring.data.repository.invocations"
```
