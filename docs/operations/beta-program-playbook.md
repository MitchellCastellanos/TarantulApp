# TarantulApp — Beta Program Playbook

Operational guide for running the closed beta now that all testers have been
selected. Both English and Spanish versions are provided so you can copy/paste
emails depending on the tester's language (use the language captured on their
beta application; default to English if unknown).

- **Cohort start date:** Monday following acceptance (set a single day so the
  whole cohort moves together).
- **Total duration:** 6 weeks (4 phases). Stretch to 8 if you want a stability
  pass before the public launch.
- **Channels:** email for official announcements, in-app **Bug reports (beta)**
  for issues, optional Discord/Telegram/WhatsApp for chat.

> Tip: send phase emails on Monday morning (UTC) and recap reminders on Thursday.

---

## 1. Calendar at a glance / Calendario general

| Phase | Week | Focus | Tester deliverable |
|-------|------|-------|--------------------|
| 0 — Welcome & Access | Week 0 (sign-up week) | Account access, install, profile setup | Confirm login, install app, complete profile |
| 1 — Core flows | Weeks 1–2 | Add tarantulas, feedings, molts, photos, reminders | ≥ 3 tarantulas added, ≥ 1 feeding & 1 molt log, 5+ bug reports OR "no issues" confirmation |
| 2 — Community & marketplace | Weeks 3–4 | Activity feed, keeper profile, marketplace, chat | Post 1+ activity, browse listings, send 1 chat |
| 3 — Pro & polish | Week 5 | Try Pro trial, reminders, QR labels, edge cases | Trigger trial flow, generate 1 QR, send polish feedback |
| 4 — Survey & wrap-up | Week 6 | Final survey, NPS, testimonial | Complete the survey form |

---

## 2. Access — what to give and when / Accesos: qué dar y cuándo

You already have an admin "Approve" button on each application. When you click
**Approve** on `/admin`:

1. The application is marked `approved` in the database.
2. If the email already has a TarantulApp account, the user is automatically
   flagged as `isBetaTester = true`. Otherwise the flag is applied automatically
   the moment they register with that same email.
3. **Send the Phase 0 welcome email immediately** (templates below). Do NOT
   create an account on their behalf unless they explicitly asked — let them
   register themselves so they own the password.
4. If a tester is non-technical or asked you to set them up directly, use
   **Admin → Add or invite beta tester** with "Generate password" so the system
   shows you a one-time password to share over a secure channel.

**Recommended access stack to share in Phase 0:**

- Web app URL: production URL (no extra invite key needed).
- Android APK / Play Internal Test link (if you ship through Play Console
  Internal Testing — share the opt-in URL).
- Bug-report shortcut: in-app **Report a bug** button (already wired to the
  admin dashboard).
- Optional community channel link (Discord/Telegram/WhatsApp) — only if you can
  commit to checking it daily.

---

## 3. How testers submit feedback / Cómo entregan feedback

| Type | Channel | Where it lands |
|------|---------|----------------|
| Bugs & crashes | In-app **Report a bug** | Admin → Bug reports (beta) |
| Feature ideas | Phase email reply OR community channel | Your inbox |
| Weekly micro-survey (3 questions) | Google Form link in each phase email | Spreadsheet |
| Final survey & NPS | Form link in Phase 4 email | Spreadsheet |

Ask testers to include: device + OS, app version, screenshot, steps to
reproduce. The in-app form already captures URL, viewport and user-agent
automatically — emphasize that this is the preferred channel.

---

## 4. Phase emails — English

> Replace `{{name}}`, `{{appUrl}}`, `{{androidUrl}}`, `{{communityUrl}}`,
> `{{surveyUrl}}` and the cohort dates before sending.

### 4.0 Welcome & congratulations (send immediately on approval)

**Subject:** You're in 🎉 Welcome to the TarantulApp closed beta

```
Hi {{name}},

Congratulations — you've been accepted into the TarantulApp closed beta. Out of
all the keepers who applied, you're one of the few we picked to help us shape
the platform before it goes public.

Here is what you need to know:

1) Your access
   • Web app: {{appUrl}}
   • Android (internal test): {{androidUrl}}
   • Just sign up / log in with the email you used to apply — your account is
     already flagged as a beta tester, so you'll see beta-only features and the
     "Report a bug" button.

2) The plan (6 weeks)
   • Week 0 — Set up your account and add your collection.
   • Weeks 1–2 — Daily life: feedings, molts, photos, reminders.
   • Weeks 3–4 — Community feed, keeper profile, marketplace, chat.
   • Week 5 — Pro trial, QR labels, polish.
   • Week 6 — Final survey + your testimonial.

3) How to send feedback
   • Bugs: tap the in-app "Report a bug" button — it auto-attaches the page,
     device and version. This is the channel we react to fastest.
   • Ideas / questions: just reply to this email.
   • Each Monday you'll get a short email with that week's mission.

4) What we ask of you
   • Use the app for at least a few minutes, 3+ days per week.
   • Send at least one piece of feedback per week (bug, idea or "all good").
   • Be honest — we'd rather hear "this is confusing" than polite silence.

Thank you for trusting us with your collection. Let's build the best tarantula
app in the world together.

— The TarantulApp team
```

### 4.1 Phase 1 — Core flows (Monday Week 1)

**Subject:** Beta Week 1 — Build your collection in TarantulApp

```
Hi {{name}},

This week's mission: get your collection into the app and live with it.

Tasks
  • Add at least 3 tarantulas (use whichever ones you actually own).
  • Log one feeding and one molt (real or test, your call).
  • Add at least one photo per spider.
  • Set one reminder (feeding or rehouse) and let it fire.

Things we want feedback on
  • Is "Add tarantula" fast enough?
  • Are the species suggestions accurate?
  • Did any reminder land at the wrong time / wrong timezone?

Quick survey (2 min): {{surveyUrl}}
Bugs: in-app "Report a bug" button.

Thanks for the time you're putting into this.
— The TarantulApp team
```

### 4.2 Phase 2 — Community & marketplace (Monday Week 3)

**Subject:** Beta Week 3 — Try the community, profile and marketplace

```
Hi {{name}},

You've got your collection in. Now let's stress-test the social side.

Tasks
  • Complete your keeper profile (bio, photo, country).
  • Post at least one update in the activity feed.
  • Browse the marketplace and open one listing.
  • Send a chat message to another tester or to support.

Things we want feedback on
  • Does the feed feel useful, or noisy?
  • Did you trust the marketplace listings? Why / why not?
  • Anything missing from the keeper profile?

Quick survey (2 min): {{surveyUrl}}
Bugs: in-app "Report a bug" button.

— The TarantulApp team
```

### 4.3 Phase 3 — Pro trial & polish (Monday Week 5)

**Subject:** Beta Week 5 — Try Pro, QR labels and the corner cases

```
Hi {{name}},

Last full mission. We want you to push the Pro features and the small details.

Tasks
  • Start the Pro trial from your account page (no card needed during beta).
  • Generate at least one QR label and stick it on an enclosure if you can.
  • Try editing/deleting a tarantula, a feeding and a molt.
  • Switch the app language between English and Spanish.

Things we want feedback on
  • Anything that "feels off" — slow screens, broken layouts, weird wording.
  • Is the value of Pro clear? Would you pay for it once it's public?

Quick survey (2 min): {{surveyUrl}}
Bugs: in-app "Report a bug" button.

— The TarantulApp team
```

### 4.4 Phase 4 — Wrap-up (Monday Week 6)

**Subject:** Beta wrap-up — One last favor (and a thank you)

```
Hi {{name}},

You made it. The closed beta wraps up this Friday.

Two final asks:
  1) Final survey + NPS (5 min): {{surveyUrl}}
  2) Optional 2–3 sentence testimonial we can quote on the website. Reply to
     this email with your text and whether we can use your name + country.

What happens next
  • Your beta access stays active forever — you'll keep beta-tester perks
     after the public launch.
  • Founding-tester perks (badge + extended Pro trial) will be applied to your
     account in the days after launch. We'll email you when it's live.

Thank you. Truly. This product is better because of the time you put into it.

— The TarantulApp team
```

---

## 5. Phase emails — Español

> Reemplaza `{{name}}`, `{{appUrl}}`, `{{androidUrl}}`, `{{communityUrl}}`,
> `{{surveyUrl}}` y las fechas del cohorte antes de enviar.

### 5.0 Bienvenida y felicitación (envíalo apenas aprobado)

**Asunto:** ¡Estás dentro! 🎉 Bienvenido a la beta cerrada de TarantulApp

```
Hola {{name}},

Felicidades: has sido aceptado en la beta cerrada de TarantulApp. De todos los
criadores que se postularon, eres uno de los pocos elegidos para ayudarnos a
moldear la plataforma antes de su lanzamiento público.

Esto es lo que necesitas saber:

1) Tu acceso
   • Web: {{appUrl}}
   • Android (test interno): {{androidUrl}}
   • Solo regístrate / inicia sesión con el mismo email con el que aplicaste —
     tu cuenta ya está marcada como beta tester, así que verás las funciones
     beta y el botón "Reportar un bug".

2) El plan (6 semanas)
   • Semana 0 — Configura tu cuenta y mete tu colección.
   • Semanas 1–2 — Día a día: comidas, mudas, fotos, recordatorios.
   • Semanas 3–4 — Feed comunidad, perfil de criador, marketplace, chat.
   • Semana 5 — Prueba Pro, etiquetas QR y detalles finos.
   • Semana 6 — Encuesta final + tu testimonio.

3) Cómo enviar feedback
   • Bugs: toca el botón "Reportar un bug" dentro de la app — adjunta página,
     dispositivo y versión automáticamente. Es el canal que más rápido vemos.
   • Ideas / preguntas: responde a este email.
   • Cada lunes te llegará un email corto con la misión de la semana.

4) Lo que te pedimos
   • Usa la app al menos unos minutos, 3+ días a la semana.
   • Envía al menos un feedback por semana (bug, idea o "todo bien").
   • Sé honesto — preferimos un "esto confunde" antes que un silencio cortés.

Gracias por confiarnos tu colección. Construyamos juntos la mejor app de
tarántulas del mundo.

— El equipo de TarantulApp
```

### 5.1 Fase 1 — Flujos principales (lunes, semana 1)

**Asunto:** Beta Semana 1 — Arma tu colección en TarantulApp

```
Hola {{name}},

Misión de esta semana: meter tu colección a la app y empezar a usarla en serio.

Tareas
  • Agrega al menos 3 tarántulas (las que tengas de verdad).
  • Registra una alimentación y una muda (reales o de prueba, tú decides).
  • Sube al menos una foto por araña.
  • Pon un recordatorio (alimentación o rehouse) y deja que se dispare.

Queremos feedback sobre
  • ¿"Agregar tarántula" es lo suficientemente rápido?
  • ¿Las sugerencias de especies son acertadas?
  • ¿Algún recordatorio llegó a la hora equivocada o en otra zona horaria?

Encuesta rápida (2 min): {{surveyUrl}}
Bugs: botón "Reportar un bug" en la app.

Gracias por el tiempo que le metes a esto.
— El equipo de TarantulApp
```

### 5.2 Fase 2 — Comunidad y marketplace (lunes, semana 3)

**Asunto:** Beta Semana 3 — Prueba comunidad, perfil y marketplace

```
Hola {{name}},

Ya tienes tu colección dentro. Toca probar a fondo el lado social.

Tareas
  • Completa tu perfil de criador (bio, foto, país).
  • Publica al menos una actualización en el feed.
  • Recorre el marketplace y abre al menos un anuncio.
  • Envía un mensaje de chat a otro tester o al soporte.

Queremos feedback sobre
  • ¿El feed se siente útil o ruidoso?
  • ¿Confiarías en los anuncios del marketplace? ¿Por qué sí o no?
  • ¿Falta algo en el perfil de criador?

Encuesta rápida (2 min): {{surveyUrl}}
Bugs: botón "Reportar un bug" en la app.

— El equipo de TarantulApp
```

### 5.3 Fase 3 — Trial Pro y pulido (lunes, semana 5)

**Asunto:** Beta Semana 5 — Prueba Pro, QR y los detalles raros

```
Hola {{name}},

Última misión completa. Queremos que estresses las funciones Pro y los detalles.

Tareas
  • Arranca el trial Pro desde tu cuenta (no se pide tarjeta en la beta).
  • Genera al menos una etiqueta QR y, si puedes, pégala a un terrario.
  • Prueba editar/eliminar una tarántula, una alimentación y una muda.
  • Cambia el idioma de la app entre inglés y español.

Queremos feedback sobre
  • Cualquier cosa que "se sienta rara" — pantallas lentas, layouts rotos,
     textos extraños.
  • ¿Queda claro el valor del Pro? ¿Pagarías por él cuando esté público?

Encuesta rápida (2 min): {{surveyUrl}}
Bugs: botón "Reportar un bug" en la app.

— El equipo de TarantulApp
```

### 5.4 Fase 4 — Cierre (lunes, semana 6)

**Asunto:** Cierre de la beta — Un último favor (y un gracias)

```
Hola {{name}},

Lo lograste. La beta cerrada termina este viernes.

Dos pedidos finales:
  1) Encuesta final + NPS (5 min): {{surveyUrl}}
  2) Testimonio opcional de 2–3 frases para citar en el sitio. Responde a
     este email con tu texto y si podemos usar tu nombre + país.

Qué sigue
  • Tu acceso beta queda activo para siempre — conservas los beneficios de
     beta tester después del lanzamiento público.
  • Los beneficios de "founding tester" (insignia + trial Pro extendido) se
     aplicarán a tu cuenta en los días posteriores al lanzamiento. Te
     avisaremos por email cuando esté listo.

Gracias. De verdad. Este producto es mejor por el tiempo que le metiste.

— El equipo de TarantulApp
```

---

## 6. Internal checklist / Checklist interno

- [ ] Pick the cohort start Monday and put it in your calendar.
- [ ] Send Phase 0 welcome emails the same day testers are approved.
- [ ] Schedule Phase 1–4 emails (Mailchimp / Resend / manual) for each Monday.
- [ ] Create one Google Form per phase (3 short questions) and reuse the link
      placeholder in the templates.
- [ ] Each Friday, screenshot the Admin → Beta dashboard (totals, by country,
      bugs received) and journal the week's takeaways.
- [ ] Two days before Phase 4, draft the public-launch announcement so the
      transition from beta to public is seamless.
