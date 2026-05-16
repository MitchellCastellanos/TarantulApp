# TarantulApp — Correo de bienvenida para tienda / vendor (México)

**Cuándo enviarlo:** Después de hablar con el prospecto, recibir su correo y **habilitarlo en admin** (`verifiedBreeder` + storefront). Este correo es el “ya puedes publicar — esto es lo que tienes y esto es lo que falta para tu badge”.

**Variables:** `{{name}}`, `{{businessName}}`, `{{appUrl}}`, `{{email}}`, `{{password}}` (solo si generaste contraseña temporal), `{{shopUrl}}`, `{{sellUrl}}`, `{{date}}`, `{{verificationBookingUrl}}` (opcional: enlace Cal.com/Calendly u otro; si va vacío, el correo pide responder con franjas horarias).

**Modelo de cobro vigente:** Tier dinámico mes a mes basado en ventas reportadas. Starter $0 MXN, escala automático. TarantulApp **no custodia pagos** — el vendor cobra directo a su cliente.

**Config en backend:** `app.vendor-verification-booking-url` / env `TARANTULAPP_VENDOR_VERIFICATION_BOOKING_URL` para incrustar el enlace de citas en el cuerpo generado por `BetaMailBodies` (campo `vendor_welcome_mx`).

---

Hola {{name}},

Fecha del mensaje: {{date}}

Gracias por sumar **{{businessName}}** a **TarantulApp**. Activamos tu cuenta de **tienda / vendor** en el marketplace — este correo te explica **qué ya tienes activo, qué falta, y cómo conseguirlo**.

### Beneficios ACTIVOS desde hoy (sin costo inicial)

- **Storefront** en `{{shopUrl}}` con tu marca, políticas de envío y contacto.
- **Publicar en todas las categorías**: tarántulas, proyectos de cría, comida viva, sustratos, terrarios y accesorios.
- **Hasta 250 anuncios activos** + listing boost.
- **Inbox de compradores** dentro de la app con historial.
- **Tier dinámico**: empiezas en **Vendor Starter ($0 MXN / mes)** — sube y baja según ventas, sin contratos ni permanencia.

### Cómo funciona el cobro (sin custodia, sin escrow)

TarantulApp **no toca el dinero de tus ventas** — tú cobras directo a tu cliente (transferencia, MercadoPago, lo que ya uses). Tu suscripción mensual se ajusta sola según los anuncios que marcas como vendidos cada mes:

| Tier | Ventas reportadas / mes | Costo mensual |
|------|------------------------|---------------|
| Vendor Starter | 0–3 | **$0 MXN** |
| Vendor Activo | 4–12 | $199 MXN |
| Vendor Plus | 13–30 | $499 MXN |
| Vendor Pro Shop | 31+ | $999 MXN |

Cada vez que cierras una venta, **marca el anuncio como vendido** en la app — ese es nuestro único contador. Si un mes vendes 0, no pagas nada y mantienes storefront completo. No hay penalización por bajar de tier.

**Insignias de actividad (además del badge verificado):** según el tier del mes, el storefront puede mostrar etiquetas extra de confianza (por ejemplo “Tienda activa”, “Tienda Plus”, “Pro Shop”). **No sustituyen** la verificación en videollamada con el equipo; son una capa más que premia volumen honesto.

### Lo único pendiente: tu badge **"Tienda Verificada"**

El badge no se da por pagar — lo obtienes en una **videollamada en vivo** con nuestro equipo (no mandes fotos de tu INE por correo; la identificación se muestra **en cámara** cuando te lo pidamos).

**Cita**

{{#verificationBookingUrl}}
- Reserva aquí: `{{verificationBookingUrl}}`
{{/verificationBookingUrl}}
{{^verificationBookingUrl}}
- Responde a este correo con el nombre de tu tienda, tu `@handle` de TarantulApp y **2–3 franjas horarias** posibles (indica tu **zona horaria**). Te enviamos el enlace de la videollamada.
{{/verificationBookingUrl}}

**Antes de la llamada prepara**

- INE o identificación oficial a mano (solo en cámara; **no** adjuntos por correo).
- Espacio y terrarios listos para un recorrido corto en video.
- Inventario representativo; papel con tu `@handle` escrito por si lo pedimos junto al animal.
- WhatsApp/Instagram de la tienda disponible para enseñar en pantalla si aplica.
- Buena conexión y luz razonable.
- Si vendes **CITES**: UMA o permiso a la mano para mostrarlo en cámara.
- Opcional que acelera la revisión: RFC, referencias, facturas de mayoreo — puedes mostrarlos en la llamada.

**Grabación:** por defecto **no grabamos** la sesión. Si algún día necesitáramos grabación para revisión interna, te avisamos y pedimos **consentimiento aparte**.

**Duración:** ~15–20 min. Tras la llamada, el equipo te dice si el badge queda otorgado; suele ser en **24–72 h hábiles**. Mientras tanto puedes publicar; sin badge, el storefront aparece como **“Tienda nueva”**.

### Tu acceso

- **Web / app:** `{{appUrl}}`
- **Correo:** `{{email}}`
{{#password}}
- **Contraseña temporal:** `{{password}}` (cámbiala en cuenta después de entrar)
{{/password}}

### Primeros pasos (15–30 min)

1. Entra con tu correo en `{{appUrl}}` (acceso anticipado / beta si aplica).
2. Ve a **Marketplace → Vender** (`{{sellUrl}}`).
3. **Configura tu storefront:** nombre comercial, tagline, política de envío (nacional / por estados), tiempos de entrega y WhatsApp o Instagram de contacto.
4. **Publica tu primer listing:** foto clara, precio en **MXN**, descripción honesta (talla, sexo, origen si aplica).
5. Repite con tu inventario fuerte (tarántulas + insumos si manejas).
6. **Agenda la videollamada** (enlace arriba si aplica) **o** responde con franjas horarias para coordinar.

### Reglas rápidas (México)

- Cumple **normativa local** de fauna, envíos y permisos cuando vendas ejemplares (UMA / CITES según aplique).
- TarantulApp **no custodia pagos**: acuerden precio, envío y garantía **en el chat de la app** y usen métodos que ya confíen (transferencia, etc.).
- Fotos reales, stock actualizado; cuando se vende, marca el anuncio como vendido.

### ¿Necesitas ayuda?

Responde a este correo con dudas de categorías o tu `@handle`. Si algo no carga en la app, usa **“Reportar un bug”** (pantalla, dispositivo, versión).

¡Bienvenido al marketplace — nos encanta ver el catálogo crecer!

— El equipo de TarantulApp
