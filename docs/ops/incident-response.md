# Incident Response — TarantulApp

Como reaccionar cuando algo se rompe en produccion. La prioridad siempre es:

1. **Detener el dano** (mitigacion rapida, aunque sea fea)
2. **Comunicar** al usuario afectado
3. **Resolver** el root cause con calma
4. **Postmortem** sin culpa

---

## Severidades

| Severidad | Definicion | SLA respuesta |
|-----------|-----------|---------------|
| **SEV1** | Backend caido > 5 min, perdida de datos, brecha de seguridad, billing roto | < 15 min |
| **SEV2** | Feature critica caida (login, checkout, marketplace) pero el resto funciona | < 1 hora |
| **SEV3** | Feature secundaria rota (sex-id, social) o degradacion notable | < 4 horas |
| **SEV4** | Bug menor reportado por usuario, no bloquea | Siguiente dia habil |

---

## Flujo de respuesta (SEV1 / SEV2)

### 1. Detectar

Fuentes en orden de fiabilidad:
- UptimeRobot / Better Stack -> alerta a Slack/Telegram
- Sentry issue con `level=error` y `count > 50` en 5 min
- Reportes de usuario (siempre validar primero, podria ser su red)

### 2. Triage (5 min)

Una sola persona toma rol de **Incident Commander (IC)**:
- Crea hilo en `#incidents` (Slack/Discord/lo que uses).
- Pega el snippet:
  ```
  [SEV?] <titulo>
  Detectado: <hora>
  Sintoma: <que ven los usuarios>
  IC: @<tu nombre>
  Status: investigando
  ```
- Resto del equipo NO toca produccion sin coordinar con IC.

### 3. Mitigar antes que entender

Reglas de oro:

- Un rollback siempre es valido si la regresion empezo con un deploy reciente.
- Bajar trafico (rate limit mas estricto, feature flag off) es preferible a debuggear con el sitio en llamas.
- Comunicar al usuario una pagina de mantenimiento *manual* es mejor que mostrar errores.

### 4. Comunicar

**Plantilla SEV1 inicial** (Twitter/X, Discord, status page):

> Estamos detectando problemas con TarantulApp. Tu informacion esta segura.
> Equipo investigando — actualizaremos en 15 min.
> Hora: HH:MM <TZ>

**Plantilla update** (cada 30 min mientras dure):

> Update HH:MM: <que sabemos> + <que estamos haciendo> + <ETA o "siguiente update en 30 min">.

**Plantilla resolucion:**

> Servicio restaurado a las HH:MM. Causa: <breve, sin tecnicismos>.
> Postmortem publico el <fecha>. Gracias por la paciencia.

### 5. Resolver

Una vez mitigado, IC pasa el bug al engineer relevante con:
- Hora exacta del primer error.
- Logs/Sentry links.
- Hipotesis del root cause.
- Cuando se pueda intentar el fix definitivo (no en caliente si SEV1 ya esta mitigado).

### 6. Postmortem (24-48h despues)

Plantilla en `docs/ops/postmortems/YYYY-MM-DD-<slug>.md`:

```markdown
# Postmortem: <titulo>

**Fecha del incidente:** YYYY-MM-DD HH:MM
**Duracion:** <X minutos>
**Severidad:** SEV?
**Usuarios impactados:** ~N (estimacion)

## Resumen

Una frase explicando que paso y como se mitigo.

## Linea de tiempo

- HH:MM — Deploy del commit X.
- HH:MM — Primer error en Sentry.
- HH:MM — Alerta UptimeRobot.
- HH:MM — IC asignado.
- HH:MM — Mitigacion (rollback / fix / feature flag).
- HH:MM — Servicio restaurado.

## Root cause

Que paso de verdad. Sin echar culpas a personas, solo al sistema.

## Que funciono bien

## Que no funciono

## Acciones (con responsable y fecha)

- [ ] @persona — Anadir alarma para X — fecha
- [ ] @persona — Cobertura de test para Y — fecha
- [ ] @persona — Documentar Z en runbook — fecha
```

---

## Rollback

### Frontend (Vercel)

Vercel Dashboard -> Project -> Deployments -> deployment anterior -> "Promote to Production".
Tarda < 1 min. Cero downtime.

### Backend (Railway / Fly.io)

**Railway:**
1. Service -> Deployments -> deployment anterior -> "Redeploy".
2. Si la migracion Flyway del commit malo creo schema, ojo: el rollback de codigo no rebobina la DB. Ver "Rollback de migraciones".

**Fly.io:**
```bash
fly releases -a tarantulapp-backend
fly deploy -a tarantulapp-backend --image registry.fly.io/tarantulapp-backend:<tag-anterior>
```

### Rollback de migraciones Flyway

Flyway no soporta rollback automatico (no es Liquibase). Estrategia:

1. **Si la migracion solo agrega columnas/tablas:** dejarlas. El codigo viejo las ignora.
2. **Si la migracion rompe schema esperado por el codigo viejo:** crear `V<N+1>__rollback_<descripcion>.sql` que revierte. Idealmente esto se planea ANTES del despliegue como `V<N+1>__expand.sql` + `V<N+2>__contract.sql` (expand-contract pattern).
3. **Si es desastre:** restaurar backup de Supabase (Dashboard -> Database -> Backups -> Restore). Pierdes los datos posteriores al backup.

**Regla:** ninguna migracion en una rama feature debe hacer DROP TABLE / DROP COLUMN. Solo a traves de PRs revisados.

---

## Quien tiene acceso a que

Mantener actualizada esta lista en un secret manager (1Password / Bitwarden):

- Stripe Dashboard (admin): @persona
- Supabase (admin): @persona
- Railway / Fly.io (deploy): @persona, @persona
- Vercel (deploy): @persona
- Cloudinary (admin): @persona
- DNS (Cloudflare/Namecheap): @persona
- Google Play Console: @persona
- Sentry (admin): @persona

**Cuando alguien deja el equipo:** rotar todas las credenciales que toco. Lleva 30-60 min, siempre.

---

## Anexo: comandos utiles para la guardia

```bash
# Health
curl -sS https://api.tarantulapp.com/actuator/health | jq

# Metrics (con MANAGEMENT_TOKEN)
curl -sS -H "X-Admin-Token: $MGMT" https://api.tarantulapp.com/actuator/metrics | jq

# Hikari pool (saber si la DB esta saturada)
curl -sS -H "X-Admin-Token: $MGMT" \
  https://api.tarantulapp.com/actuator/metrics/hikaricp.connections.active | jq

# Top errores en Sentry (CLI)
sentry-cli issues list --project tarantulapp-backend --query "is:unresolved"

# Conectar a Supabase rapido
psql "$DB_URL" -c "SELECT count(*) FROM users;"

# Ver ultimos webhook events procesados
psql "$DB_URL" -c "SELECT event_id, source, event_type, received_at FROM processed_webhook_events ORDER BY received_at DESC LIMIT 20;"
```
