# TarantulApp — Campaña creadores y breeders (LatAm / USA)

Guía corta para atraer **micro y medianos creadores** y **breeders de tamaño medio**: qué ofrecer, cómo operar por fases, plantillas de correo y cómo encaja el admin.

---

## Estrategia — qué les das vs qué pides

**Por qué micro/mediano:** su audiencia suele ser más nicho (confianza alta), cuesta menos que un macro-influencer, y encajan con “beta real” y feedback honesto. En LatAm la conversión de DMs y comunidades (FB, WhatsApp) suele ser mejor que anuncios fríos.

**Qué ofrecer (realista y defendible)**

| Oferta | Notas |
|--------|--------|
| **Pro gratis durante la beta** del programa de creadores | Ya es tu palanca principal; súper claro en el pitch. |
| **Visibilidad** | Menciones en redes del equipo, **highlights**, repost cuando el contenido sea bueno — sin prometer números fijos. |
| **Badge “socio de contenido”** | Cuando exista en perfil; di “cuando esté listo” para no sobre-prometer. |
| **Acceso directo al equipo** | WhatsApp de testers + correo; para breeders es oro. |
| **Historia / spotlight** | Opcional: 1 post “keeper del mes” si escala el programa. |

**Qué pedir (simple)**

- **1 pieza breve** (60–120 s video o reel equivalente): app en uso real, sin guión perfecto.
- **Mención + etiqueta** (@tarantulapp donde aplique).
- **Un feedback** (bug, idea o “todo bien”) para cerrar el ciclo.

**Breeders de media monta**

- Misma oferta; el mensaje es distinto: *listados/marketplace, colección ordenada, recordatorios, forma nueva de mostrar mudas y disponibilidad*.
- Prioriza México + USA como dijiste; idioma ES para MX/LatAm y EN para USA.

No hace falta inventar “un badge mágico” el día uno: **Pro + visibilidad + trato cercano** ya mueve a muchos en hobby.

---

## Fases del embudo

| Fase | Objetivo | Canal típico | ¿Admin batch? |
|------|-----------|--------------|----------------|
| **1 — Introducción** | Quiénes son ustedes, qué es la app, qué piden y qué ofrecen; CTA “¿te late?” | Gmail / DM + correo desde `hello@` o dominio oficial | **No** — hoy el batch solo envía a usuarios con flag **beta tester** (ver sección código). Usa las plantillas de abajo en correo manual o DM + enlace a formulario si tienes uno. |
| **2 — Aceptación + acceso** | Alta como tester, contraseña, welcome | **Admin** → aprobar / provisionar tester + **Welcome email** | **Sí** — flujo beta existente. |
| **2b — Brief creador** | Entregables, beneficios, WhatsApp, tono LatAm | **Admin** → campaña `creator_partner_onboarding` | **Sí** — mismo cuerpo que en `BetaMailBodies.java`. |
| **3 — Recordatorio** | Si no hubo video en ~1–2 semanas | **Admin** → `creator_partner_reminder` | **Sí** |

Orden recomendado el día que dicen que sí: **Welcome** → (mismo día o día siguiente) **`creator_partner_onboarding`** → a los ~10–14 días **`creator_partner_reminder`** solo si no respondieron ni publicaron.

---

## Fase 1 — Introducción (plantillas para envío manual)

**Variables:** sustituye `{{name}}`, `{{TU_NOMBRE}}`, tono LatAm si quieres.

### Español — asunto sugerido

`¿Aliados para una app de tarántulas? (beta cerrada — LatAm)`

### Español — cuerpo

```
Hola {{name}},

Soy {{TU_NOMBRE}} del equipo de TarantulApp. Estamos construyendo la app para criadores:
colección, mudas, recordatorios, comunidad y marketplace — con mucha energía en Latinoamérica
porque ahí está respondiendo muy bien la beta.

Te escribo porque tu contenido encaja con lo que buscamos: gente que de verdad críe/comparta el hobby,
no solo números vanity. Nos interesan creadores y breeders de alcance chico/medio en México y EE. UU.

Qué pedimos:
• Una pieza corta (video 60–120 s o formato que te funcione) mostrando la app en tu rutina real.
• Mención clara de TarantulApp + etiqueta donde puedas (@tarantulapp).
• Un comentario de feedback honesto cuando la pruebes.

Qué ofrecemos mientras dure tu participación en la beta del programa:
• Pro sin costo.
• Menciones / highlights en nuestros canales cuando encaje el contenido.
• Badge de socio de contenido en perfil cuando la función esté lista (te avisamos).
• Canal directo con el equipo (correo + grupo de testers).

Si te late, contesta con un “sí” y te mando acceso (web + Android en prueba cerrada de Play).
Si no aplica o no es tu momento, sin problema — un “ahora no” nos ayuda igual.

Saludos,
{{TU_NOMBRE}}
— TarantulApp
hello@tarantulapp.com
https://tarantulapp.com
```

### English — subject

`TarantulApp beta — creator / breeder partnership (Mexico & US focus)`

### English — body

```
Hi {{name}},

I'm {{TU_NOMBRE}} from the TarantulApp team. We're building the keeper-first app for tarantulas:
collection, molts, reminders, community, and marketplace — with a strong LatAm beta community right now.

I'm reaching out because your content fits what we want: real keepers and breeders who care about the
hobby, not just follower counts. We're especially inviting small-to-mid creators and mid-size breeders
in Mexico and the US.

What we ask:
• One short piece (60–120s video or whatever format you prefer) showing the app in your real workflow.
• A clear mention of TarantulApp + @tarantulapp where your platform allows.
• Honest feedback once you've tried it.

What we offer during your participation in the creator beta cohort:
• Complimentary Pro.
• Shout-outs / highlights on our channels when it fits.
• A “content partner” badge on profile when we ship it (we'll let you know).
• Direct access to the team (email + tester WhatsApp group).

If you're in, reply “yes” and we'll send access (web + Android Play closed testing).
If it's not a fit or bad timing, a quick “not now” still helps us plan.

Thanks,
{{TU_NOMBRE}}
— TarantulApp
hello@tarantulapp.com
https://tarantulapp.com
```

---

## Fase 2 — Ya aceptaron (flujo operativo)

1. **Crear / aprobar** su cuenta como **beta tester** desde el admin (igual que cualquier tester).
2. Enviar **correo de bienvenida** con credenciales (flujo existente).
3. En **Admin → Beta → campañas por correo**, seleccionar su usuario y enviar **`creator_partner_onboarding`** (`locale`: `auto`, `es` o `en` según prefieras).
   - El texto en servidor coincide con `BetaMailBodies` (no hace falta copiar/pegar si usas el batch).

Opcional mismo día: campaña **`whatsapp_group_invite`** si quieres que entren al grupo rápido.

---

## Fase 3 — Recordatorio

Desde admin, campaña **`creator_partner_reminder`** a quien no haya entregado contenido.

---

## Código ya implementado (y límites actuales)

**Hecho:**

- Nuevas claves en `BetaMailBodies.java`: `creator_partner_onboarding`, `creator_partner_reminder`.
- Listadas en `GET /admin/beta-emails/campaign-catalog` (`AdminController`) → el dropdown del admin las carga solo.

**Límite importante:** `POST /admin/beta-emails/send-campaign` solo envía a usuarios con **`isBetaTester == true`**. La **fase 1 (intro fría)** sigue siendo manual (Gmail/DM) hasta que decidamos extender el backend.

**Si quieren fase 1 desde admin, siguiente trabajo sugerido (no implementado aquí):**

- Opción A: tabla **prospects** (email, nombre, locale, estado) + endpoint “send outreach template” sin cuenta de usuario.
- Opción B: permitir envío por email libre solo para admins auditados (con rate limit y log).
- Opción C: integración **Resend/Mailchimp** con lista estática y plantillas externas.

El frontend **`AdminBetaPage.jsx`** ya consume el catálogo por API; no hace falta tocar JSX salvo que quieras agrupar campañas visualmente (“Creadores” vs “Semanas”).

---

## Lista de creadores — honestidad operativa

No mantengo una base actualizada de influencers del nicho ni puedo garantizar contactos vigentes sin que queden obsoletos. **Mejor:** búsqueda dirigida:

- Grupos de Facebook de tarántulas (MX / LatAm): posts recientes con buen engagement y menos de ~50k seguidores en sus redes enlazadas.
- YouTube: “mantenimiento tarántula”, “unboxing spider”, “rehousing México” — canales con miles a decenas de miles de subs suelen responder a DMs.
- IG/TikTok: hashtags `#tarántulas` `#tarantulasMX` `#mexicanspiders` — prioriza quien ya muestra terrarios propios.

Si quieres, en otro mensaje puedes pegar 5–10 @ y te ayudo a **priorizar el pitch** (orden de contacto y variantes del DM).
