# SMTP (IONOS) + producción (Railway)

El backend ya usa **Spring Mail** (`JavaMailSender`). No hace falta código extra: solo variables de entorno correctas y un buzón que permita SMTP.

## Tu pantalla de IONOS (“Setting up an email client”) ¿está bien?

Sí, para **SMTP saliente** IONOS indica:

| Campo | Valor |
| ----- | ----- |
| Servidor saliente | `smtp.ionos.com` |
| Puerto saliente | **587** con **TLS activado** (STARTTLS) |
| Autenticación | **Sí** — usuario = email completo, contraseña = la del buzón |

Eso es lo mismo que debe reflejar Railway: `MAIL_HOST=smtp.ionos.com`, `MAIL_PORT=587`, credenciales del buzón, y en nuestra app **`MAIL_STARTTLS_ENABLE=true`** (valor por defecto).

**Importante:** si en los logs ves `Couldn't connect to host, port: smtp.ionos.com, 587` y `SocketTimeoutException: Connect timed out`, el fallo ocurre **antes** de usuario/contraseña/TLS a nivel aplicación: la JVM **no completa el TCP** hasta IONOS. Ahí el problema no es “mal copiado el tutorial de IONOS”, sino **red entre Railway e IONOS** (bloqueo saliente, firewall, política del datacenter, etc.).

### Cómo interpretar el error en logs

| Mensaje típico | Significado probable |
| ---------------- | -------------------- |
| `Connect timed out` / `MailConnectException` al **abrir** conexión | Red bloqueada o ruta hasta `smtp.ionos.com:587` (no llegó ni a autenticar). |
| `Authentication failed` / `535` / `535 5.7.8` | Usuario, contraseña o `MAIL_FROM` vs buzón. |
| `MailSendException` después de `MAIL FROM` | Suele ser política del proveedor sobre remitente/dominio. |

## Por qué no llegaba el reset de contraseña

Revisa en orden:

1. **`MAIL_USERNAME` / `MAIL_PASSWORD` vacíos en Railway** → el servidor no puede autenticarse; el envío falla (error en logs del backend).
2. **`MAIL_FROM` distinto del buzón** → muchos proveedores (incl. IONOS) rechazan o mandan a spam si el remitente no coincide con la cuenta SMTP.
3. **Usuario no registrado** → “Olvidé contraseña” no envía nada si ese email no existe en la base (la API responde igual por privacidad).
4. **Spam / Promociones** en el cliente de correo.
5. **`APP_BASE_URL`** debe ser la URL pública del frontend (ej. `https://tarantulapp.com`) para que el enlace del email sea válido.

## IONOS — valores típicos (STARTTLS, recomendado)

En Railway → tu servicio backend → **Variables**:

| Variable | Ejemplo | Notas |
| -------- | ------- | ----- |
| `MAIL_HOST` | `smtp.ionos.com` | Servidor saliente IONOS |
| `MAIL_PORT` | `587` | Con STARTTLS |
| `MAIL_USERNAME` | `contacto@tudominio.com` | Misma cuenta que usa SMTP |
| `MAIL_PASSWORD` | *(contraseña del buzón)* | La que usas en webmail IONOS |
| `MAIL_FROM` | `contacto@tudominio.com` | Suele **ser obligatorio** igual que `MAIL_USERNAME` |
| `MAIL_FROM_NAME` | `TarantulApp` | Nombre visible |
| `MAIL_REPLY_TO` | *(opcional)* | Si quieres que “Responder” vaya a otro correo |
| `MAIL_ADMIN_NOTIFY_TO` | `tu-correo@gmail.com` | Avisos admin (betas, bugs), si lo usas |

No subas el `.env` al repo; solo Railway.

### Alternativa puerto 465 (SSL implícito)

IONOS también documenta salida por el mismo host; muchas cuentas permiten **465 con SSL**. Si **587** siempre hace *timeout* desde Railway (sin llegar a error de login), prueba este bloque **en Railway** y redeploy:

```text
MAIL_HOST=smtp.ionos.com
MAIL_PORT=465
MAIL_SMTP_SSL=true
MAIL_STARTTLS_ENABLE=false
```

(`MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` igual que con 587.)

Prueba primero **587 + STARTTLS** en entornos donde el puerto no esté filtrado; si solo ves **timeouts de conexión**, el bloque de arriba es el siguiente paso lógico.

## Comprobar sin adivinar

1. Despliega con las variables anteriores y redeploy.
2. Entra al **Admin** en la app con tu cuenta admin.
3. Abre la tarjeta **Correo / SMTP** y revisa que salga “credenciales configuradas”.
4. Envía un **correo de prueba** a tu email personal.
5. Si falla, mira los **logs del backend** en Railway (busca `SMTP` o `MailAuthenticationException`).

Endpoints internos (solo admin autenticado):

- `GET /api/admin/mail/config-status` — muestra host, puerto, si hay usuario SMTP, `MAIL_FROM`.
- `POST /api/admin/mail/test-send` — body JSON `{ "to": "tu@email.com" }`.

## Enlaces en los emails

`APP_BASE_URL` debe ser el origen del SPA en producción (sin barra final), ej.:

```text
APP_BASE_URL=https://tarantulapp.com
```

Ahí se monta el link `/reset-password?token=...`.

## Seguridad

- Rotá la contraseña del buzón si alguna vez quedó en un log viejo.
- IONOS a veces permite contraseñas específicas por cliente; si la tienes, úsala en lugar de la contraseña webmail principal.

## Admin: `401` vs `403` en `/api/admin/mail/*`

| Código | Suele significar |
| ------ | ---------------- |
| **401** | No hay sesión válida: falta `Authorization: Bearer …`, JWT expirado, o **`JWT_SECRET` en Railway distinto** del que firmó el token (otro deploy / env equivocado). Cierra sesión y vuelve a entrar; verifica que frontend y backend compartan el mismo secreto. |
| **403** | JWT válido pero **tu email no está en `APP_ADMIN_EMAILS`** (CSV en Railway). El backend usa lista explícita de admins, no el rol dentro del JWT. |

`POST /api/admin/mail/test-send` requiere estar logueado **y** ser admin.

## `MailConnectException` / `SocketTimeoutException` hacia `smtp.ionos.com`

Si en Sentry aparece **timeout al conectar** al puerto **587** (no error de usuario/contraseña), suele ser **red saliente**:

- El contenedor en Railway intenta abrir TCP a `smtp.ionos.com:587` y **no recibe respuesta** a tiempo (`Connect timed out`). Eso no contradice la guía de IONOS: los valores son correctos para un cliente que **sí** tiene salida a Internet hacia ese host.
- Algunos proveedores cloud restringen **SMTP saliente** (25/465/587) para limitar spam; otras veces es routing/región. No siempre hay “toggle” en el panel: a veces hace falta **ticket con Railway** preguntando si el egress hacia `smtp.ionos.com` está permitido, o usar otro canal de envío.
- **Siguiente paso práctico:** variables del bloque **465 + SSL** arriba; si también hace timeout, el problema es casi seguro **conectividad**, no Spring Mail.
- **Plan B estable en producción:** enviar con **API** (Resend, SendGrid, SES, Mailgun) o usar el **SMTP del proveedor transaccional** que ellos documenten para apps (host/puerto distintos), en lugar de conectar directo a IONOS desde el PaaS.

No es un bug del código Java si la JVM no puede abrir el socket TCP al host SMTP.

### Otras comprobaciones IONOS

- En el panel de IONOS, confirma que el **buzón tiene SMTP habilitado** y que no haya restricción tipo “solo desde IP X” (raro en cuentas estándar).
- El **usuario SMTP** debe ser el email completo del buzón, como indica IONOS en “User name”.
