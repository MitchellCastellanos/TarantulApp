# TarantulApp — Plantilla de correo (acceso anticipado — registro listo)

Usar con `buildSpanishBetaWelcomeEmail()` en `frontend/src/utils/welcomeBetaEmail.js`, o copiar la estructura de abajo.

**Objetivo:** Dar la bienvenida como **usuario/a**. Confirmar que el **registro de acceso anticipado está listo**, **confirmar el acceso** y dejar claros los pasos para **descargar** (Android), **entrar por la web** y **comprobar el correo correcto**. Sin WhatsApp ni enlaces a grupos externos en este correo.

**Nota técnica:** Android usa hoy el listado de Play en **acceso anticipado**; mismas credenciales que la web. Quienes usaban **prueba interna** deben reinstalar desde el enlace de la tienda.

**Variables:** `{{name}}`, `{{appUrl}}`, `{{email}}`, `{{password}}`, `{{date}}` / `{{sendDate}}`, `{{androidPlayUrl}}`

---

Hola {{name}},

Fecha del mensaje: {{date}}

Tu **registro de acceso anticipado en TarantulApp ya está listo**. Te damos la bienvenida como **usuario/a**: con este mensaje **confirmamos tu acceso** y te recordamos cómo **descargar la app**, **entrar en la web** y **comprobar que vas con el correo correcto**.

En Android la descarga hoy va por Google Play en lista de **acceso anticipado**; cuando pasemos al listado **público**, el flujo será como con cualquier otra app y **tu cuenta se queda igual**.

### Descargar la app (Android — Google Play)

1. En el móvil, abre: `{{androidPlayUrl}}`
2. Usa la **cuenta de Google** con invitación de acceso anticipado en Play. Si no te deja, cambia de cuenta en el dispositivo o en Play Store.
3. **Instala** o **actualiza**, abre **TarantulApp** e inicia sesión con **Tu acceso** abajo — igual que en la web.

Si usabas el enlace viejo de **prueba interna**, reinstala desde el enlace de arriba.

### Comprueba tu correo (importante)

- **TarantulApp:** entra con **exactamente** `{{email}}` y la contraseña de abajo.
- **Google:** solo afecta si Play te muestra la app; **no** es tu contraseña de TarantulApp.

### Entrar por la web (cualquier dispositivo)

1) Abre `{{appUrl}}`

2) Usa el acceso de **acceso anticipado** en la pantalla de inicio (puede decir **“Beta tester login”**).

3) Mismo correo y contraseña que abajo.

**Atajo móvil:** iPhone/iPad — Safari → Compartir → Añadir a pantalla de inicio. Android — Chrome instalar / añadir a inicio, o la app desde Play.

### Tu acceso

- **Web:** `{{appUrl}}`
- **Android (Play — acceso anticipado):** `{{androidPlayUrl}}`
- **Correo:** `{{email}}`
- **Contraseña:** `{{password}}`

Ver **“Reportar un bug”** o textos de acceso anticipado es normal mientras afinamos.

### Algunas cosas que puedes hacer en TarantulApp

- **Colección** — tarántulas con fotos, notas, estado.
- **Comidas, mudas, recordatorios** del día a día.
- **Comunidad**, **perfil de criador**, **marketplace** cuando lo uses.

Si algo no cuadra, **responde a este correo** o usa **“Reportar un bug”** en la app (página, dispositivo, versión). ¡Gracias por estar con nosotros!

— El equipo de TarantulApp
