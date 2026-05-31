# Configuración de pagos para partners (in-app checkout) — Guía del operador

Esta guía lista **lo que tú (Mitchell) tienes que hacer de tu lado** para dejar
funcionando el cobro dentro de TarantulApp y sus métodos de pago. El código ya
está listo; aquí van las cuentas, credenciales y switches.

> **Estado actual de cada riel**
> - **Stripe** — integrado y en vivo (solo falta apuntar llaves a producción).
> - **PayPal** — *plugin scaffold*. Falta tu cuenta/credenciales **y** terminar
>   la integración en código (ver §2).
> - **Klarna** — *plugin scaffold*. Recomendado activarlo **a través de Stripe**
>   (es un método de pago de Stripe), no como integración aparte (ver §3).

---

## 0) Cómo encaja el ecosistema (resumen)

- El cobro in-app es **beta y solo Canadá** (`RegionPolicy.isInAppCheckoutCountry`).
- Se habilita **por partner** desde Admin → modal del partner → *"Cobro dentro de
  TarantulApp"*. USA y México siguen solo con sitio/vitrina/handoff.
- **Payout (cómo les llega el dinero):**
  - `platform` → los fondos caen en **tu** cuenta Stripe (correcto para tiendas
    propias como **Montreal Spider Co** — es tu lana, mismo bolsillo).
  - `connect` → enruta al partner vía **Stripe Connect** y nosotros tomamos la
    comisión como *application fee*.
- **Comisión:** se configura por partner (%). Se puede **exentar (cupón)** desde
  Admin.

---

## 1) Stripe (riel principal, ya en vivo)

Stripe reutiliza **la misma cuenta y llaves** que ya usas para suscripciones.

### 1.1 Variables de entorno (ya existen)
| Variable | Para qué |
|---|---|
| `STRIPE_SECRET_KEY` | Llave secreta (usa la **live** `sk_live_...` en prod). |
| `STRIPE_WEBHOOK_SECRET` | Firma del webhook (`whsec_...`). |
| `APP_BASE_URL` | URL pública de la app (para success/cancel/return). Ej. `https://tarantulapp.com`. |

No hay variables nuevas que agregar para el cobro in-app con Stripe: usa las
mismas de arriba.

### 1.2 Webhook de Stripe
1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. URL del endpoint: el mismo que ya usas para billing (el backend procesa todo
   en `BillingService.processWebhook`).
3. Asegúrate de tener habilitado el evento **`checkout.session.completed`**
   (ya lo usas para suscripciones; el cobro in-app reusa ese evento con
   `metadata.purpose = partner_cart_order`).
4. Copia el **Signing secret** → `STRIPE_WEBHOOK_SECRET`.

### 1.3 Stripe Connect (solo si quieres pagar a partners que NO son tuyos)
Para `payout = connect` (el partner recibe en su propia cuenta Stripe):
1. Stripe Dashboard → **Connect → Get started** (habilita Connect en tu cuenta).
2. Tipo de cuenta: **Express** (el código crea cuentas Express para Canadá).
3. Configura tu **branding de Connect** (logo, nombre, color) en Connect settings.
4. No necesitas más variables: el onboarding usa `STRIPE_SECRET_KEY`.
5. El partner se conecta solo desde **Partner Hub → "Conectar Stripe para cobros"**.

> Si Connect **no** está habilitado en tu cuenta, el onboarding devuelve error
> claro y **no** se cobra nada — nunca retenemos dinero que no podamos pagar.

Para **Montreal Spider Co** (tu tienda) NO necesitas Connect: deja
`payout = platform` y listo.

---

## 2) PayPal (scaffold — requiere tu cuenta + terminar el código)

Hoy el plugin `PaypalPartnerPaymentProvider` está registrado pero responde
"coming soon". Para activarlo:

### 2.1 Lo que TÚ tienes que hacer (cuenta/credenciales)
1. Crea/usa una **cuenta PayPal Business** (Canadá).
2. Ve a **developer.paypal.com → Dashboard → Apps & Credentials**.
3. Crea una **REST API app**. Obtén:
   - **Client ID**
   - **Client Secret**
4. Decide entorno: **Sandbox** para pruebas, **Live** para producción.
5. (Para confirmar pagos) crea un **Webhook** en la app:
   - URL: `https://<tu-dominio>/api/public/marketplace/partner-cart/paypal/webhook`
     (endpoint a crear en §2.3).
   - Evento mínimo: **`CHECKOUT.ORDER.APPROVED`** / **`PAYMENT.CAPTURE.COMPLETED`**.
   - Copia el **Webhook ID**.
6. Si quieres pagar a partners externos (no a ti), necesitarás **PayPal
   Commerce Platform / Payouts** (marketplace multi-seller). Para tus tiendas
   propias no hace falta.

### 2.2 Variables de entorno a definir (nombres propuestos)
Agregar a `application.properties` + setearlas en tu hosting:
```
paypal.env=${PAYPAL_ENV:sandbox}            # sandbox | live
paypal.client-id=${PAYPAL_CLIENT_ID:}
paypal.client-secret=${PAYPAL_CLIENT_SECRET:}
paypal.webhook-id=${PAYPAL_WEBHOOK_ID:}
```

### 2.3 Lo que falta en código (lo dejamos preparado para enchufar)
- En `PaypalPartnerPaymentProvider`: implementar `createCheckout(...)`
  - OAuth `client_credentials` → token.
  - Crear **Order** (`/v2/checkout/orders`, `intent=CAPTURE`) con `application_context`
    (`return_url`/`cancel_url` apuntando a `/partner/{slug}?inAppCheckout=...`).
  - Devolver el `approve` link como `checkoutUrl` y `live=true` cuando esté configurado.
- Endpoint de webhook de PayPal que marque la orden como pagada
  (`PartnerCheckoutService.applyPaidWebhook(orderId, ...)`), igual que Stripe.

> El "esqueleto" (plugin, orden, comisión, payout, emails, UI del carrito) ya
> existe; solo falta este pegado a la API de PayPal.

---

## 3) Klarna (scaffold — recomendado vía Stripe)

La forma más rápida y sin integración nueva: **Klarna como método de pago de
Stripe**.
1. Stripe Dashboard → **Settings → Payment methods → Klarna → Turn on**.
2. Asegúrate de que la moneda/país del cobro sea compatible (Canadá/CAD según
   disponibilidad de Klarna en Stripe).
3. Con eso, en el checkout de Stripe in-app Klarna aparece automáticamente como
   opción para el comprador (no requiere el plugin Klarna separado).

> El `KlarnaPartnerPaymentProvider` separado queda como placeholder por si algún
> día quieres la API directa de Klarna; para el beta, usar Klarna **a través de
> Stripe** es lo recomendado.

---

## 4) Activar un partner (pasos en Admin)

1. Admin → **Partners** → abre el partner (debe ser **Canadá** y tier oficial).
2. Sección **"Cobro dentro de TarantulApp (beta)"**:
   - Marca **Habilitar cobro dentro de TarantulApp**.
   - **Dónde se cobra:** `Dentro de TarantulApp` (o `En el sitio del partner`).
   - **Cómo se liquida:**
     - `Plataforma` → para tus tiendas (Montreal). El dinero llega a tu Stripe.
     - `Connect` → para partners externos (requiere que ellos conecten Stripe).
   - **Comisión (%)** y, si aplica, **Exentar comisión (cupón)**.
3. Guarda. El partner verá el toggle web/in-app en su **Partner Hub** y, si es
   `connect`, el botón **"Conectar Stripe para cobros"**.

---

## 5) Checklist rápido para ir en vivo (Canadá, tu tienda)

- [ ] `STRIPE_SECRET_KEY` = llave **live** en producción.
- [ ] `STRIPE_WEBHOOK_SECRET` = secret del endpoint live, con `checkout.session.completed`.
- [ ] `APP_BASE_URL` = dominio público real.
- [ ] Admin → Montreal Spider Co → habilitar in-app, modo `Dentro de TarantulApp`,
      payout `Plataforma`, comisión a tu gusto.
- [ ] Probar un pedido de prueba y confirmar que llega el correo al comprador y a ti.

Para partners externos, además:
- [ ] Habilitar **Stripe Connect** en tu cuenta.
- [ ] Pedirles que completen onboarding desde su Partner Hub.

---

## 6) Notas de comisión y emails

- La comisión se guarda por orden (`commission_rate`, `commission_amount`) en
  `partner_cart_orders`. En `platform` es informativa (todo es tuyo); en
  `connect` es el *application fee* real.
- Correos automáticos al confirmarse el pago (webhook):
  - Comprador → confirmación de compra.
  - Partner → aviso de venta + liquidación estimada (o "cobrado por TarantulApp"
    si es tienda propia).
