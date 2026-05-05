# TarantulApp — Plantilla de correo de bienvenida (beta cerrada, español)

Usar con `buildSpanishBetaWelcomeEmail()` en `frontend/src/utils/welcomeBetaEmail.js`, o copiar la estructura de abajo.

**Nota (mayo 2026):** La app **Android** ya está en Google Play en **prueba interna**: los testers instalan con el enlace de Play e inician sesión con las mismas credenciales que en la web.

**Variables:** `{{name}}`, `{{appUrl}}`, `{{email}}`, `{{password}}`, `{{date}}` / `{{sendDate}}`, `{{androidPlayUrl}}` (URL de prueba interna en Play, la misma que en la app)

---

Hola {{name}},

Fecha del mensaje: {{date}}

Felicidades: has sido aceptado en la beta cerrada de TarantulApp. De todos los criadores que se postularon, eres uno de los pocos elegidos para ayudarnos a moldear la plataforma antes de su lanzamiento público.

Importante para este batch:

- Ya puedes instalar la **app Android** desde Google Play (lista de prueba interna). Enlace: `{{androidPlayUrl}}`
- Abre ese enlace en el teléfono con la **cuenta de Google** que tenga acceso a la prueba; instala TarantulApp e inicia sesión con el **mismo correo y contraseña** que para la web.
- La **web app** sigue disponible en cualquier navegador si lo prefieres.

Cómo entrar (web):

1) Abre {{appUrl}} y usa el acceso beta (“Beta tester login” / acceso beta) en la pantalla pública.

2) Inicia sesión con el correo y la contraseña que aparecen abajo.

Web app en el móvil (atajo):

- iPhone/iPad: Safari → Compartir → “Añadir a pantalla de inicio”.
- Android (Chrome): menú ⋮ → “Instalar app” o “Añadir a la pantalla principal” si el navegador lo ofrece — o usa la app nativa desde Play arriba.

Esto es lo que necesitas saber:

1) Tu acceso

- Web: {{appUrl}}
- Android (Play — prueba interna): {{androidPlayUrl}}
- Email: {{email}}
- Contraseña: {{password}}

Tu cuenta está marcada como beta tester: verás las funciones beta y el botón “Reportar un bug”.

2) El plan (6 semanas)

- Semana 0 — Configura tu cuenta y mete tu colección.
- Semanas 1–2 — Día a día: comidas, mudas, fotos, recordatorios.
- Semanas 3–4 — Feed comunidad, perfil de criador, marketplace, chat.
- Semana 5 — Prueba Pro, etiquetas QR y detalles finos.
- Semana 6 — Encuesta final + tu testimonio.

3) Cómo enviar feedback

- Bugs: toca “Reportar un bug” dentro de la app — adjunta página, dispositivo y versión.
- Ideas / preguntas: responde a este correo.
- La misión de la Semana 1 ya viene en este correo como tus primeros pasos; después te iremos enviando las siguientes semanas.

4) Lo que te pedimos

- Usa la app al menos unos minutos, 3+ días a la semana.
- Envía al menos un feedback por semana (bug, idea o “todo bien”).
- Sé honesto — preferimos un “esto confunde” antes que un silencio cortés.

Gracias por confiarnos tu colección. Construyamos juntos la mejor app de tarántulas del mundo.

— El equipo de TarantulApp
