# SMTP (IONOS) + producción (Railway)

El backend ya usa **Spring Mail** (`JavaMailSender`). No hace falta código extra: solo variables de entorno correctas y un buzón que permita SMTP.

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

### Alternativa puerto 465 (SSL)

Algunas cuentas documentan SSL implícito:

- `MAIL_PORT=465`
- `MAIL_SMTP_SSL=true`
- Puede hacer falta `MAIL_STARTTLS_ENABLE=false` (variable en `application.properties`).

Prueba primero **587 + STARTTLS**; es la opción más habitual.

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
