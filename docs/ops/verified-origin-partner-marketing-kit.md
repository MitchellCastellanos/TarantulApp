# Verified Origin partner — marketing package (AI generation script)

Use this doc to have **another AI** (ChatGPT, Claude, Gemini — anything that can write HTML/CSS
and ideally export files) generate a complete **"Verified Origin" partner marketing package**:
one-pager PDF, social cards, and short email/DM copy, in **ES / EN / FR**.

Verified Origin is the **trust badge** shown on storefronts, marketplace listings, and the
passports an approved issuer creates. It is *separate from* the Official Partner catalog-sync
program (see `official-partner-onepager-chatgpt-pdf.md`): a shop can be an Official Partner **and**
carry Verified Origin once reviewed. This kit promotes the **badge**, not the sync program.

**Put finished assets here:**

- `backend/src/main/resources/outreach/verified-origin-partner-onepager-{es,en,fr}.pdf`
- `frontend/public/outreach/verified-origin/` (social cards: `*.webp` / `*.png`)

**Edit copy here** (markdown source, not attached to email):

- this file (the "TEXTO COMPLETO" blocks below)

Optional screenshots to embed (reuse Monarch captures or swap for your own):

- https://tarantulapp.com/outreach/monarch/01-storefront-wide.webp
- https://tarantulapp.com/outreach/monarch/02-marketplace-card.webp

---

## Prompt para otra IA (copiar y pegar)

```
Eres diseñador editorial + copywriter de marca. Genera un PAQUETE DE MARKETING para el programa
"Verified Origin" de TarantulApp. Entrega TODO lo siguiente:

A) UN one-pager imprimible (carta/A4) en HTML/CSS listo para "Imprimir → Guardar como PDF".
B) 3 social cards 1080x1080 (HTML/CSS o instrucciones Canva): (1) "¿Qué es Verified Origin?",
   (2) "Cómo se obtiene", (3) "Qué ven los compradores".
C) 1 banner 1200x628 para link preview.
D) Copy corto: 1 email de invitación + 2 DMs (IG/FB) + 3 captions para redes.
Todo en el IDIOMA que te indique abajo (genera ES, EN y FR si te paso los tres bloques).

MARCA:
- Nombre: TarantulApp
- Estética: premium / hobby científico; fondo pergamino claro (#f7f4ee) o blanco cálido
- Acento oro (#c9a227 / #8b6914); texto carbón (#1c1916); secundario (#5c5348)
- El badge Verified Origin usa verde de confianza (success) con texto blanco; respétalo como sello
- Tipografía: sans moderna (Inter / DM Sans); títulos en negrita
- Logo: texto "TarantulApp" + detalle sutil de araña opcional (no inventes un logo raster)

QUÉ ES (no te desvíes del producto real):
- Verified Origin es un BADGE DE CONFIANZA, revisado manualmente por el equipo de TarantulApp.
- Aparece en: el storefront del vendedor, sus anuncios del marketplace, y los PASAPORTES que emite.
- Tipos (kind): Breeder (criador), Store (tienda), Vendor, Seller (vendedor).
- Los compradores pueden FILTRAR el marketplace a "Verified Origin only".
- Un Socio Oficial con catálogo sincronizado aprobado por admin TAMBIÉN obtiene Verified Origin.
- En compras a un emisor Verified Origin, el emisor AUTORIZA la entrega (valida el recibo) y el
  comprador recibe días Pro con su espécimen.

QUÉ NO DECIR:
- No es un seguro ni una garantía de cada transacción (el comprador confirma legalidad/envío).
- No menciones comisiones, "sin cuota", ni comparaciones de precio.
- No lo confundas con "Official Partner": menciona en UNA línea que son tracks distintos
  (Verified Origin = badge de confianza; Official Partner = espejo de catálogo Woo).

ESTRUCTURA DEL ONE-PAGER (en este orden):
1. Header: "Verified Origin" + subtítulo "El sello de confianza de TarantulApp"
2. "Qué es" — 1 párrafo corto + el badge dibujado
3. "Qué obtienes" — 4–6 bullets con iconos minimalistas (badge en storefront/listings/pasaportes,
   filtro Verified Origin, autorización de entrega + días Pro al comprador, link para redes)
4. "Cómo se obtiene" — 3 pasos: aplicar en Studio → revisión manual del equipo → badge activo
5. "Qué ven los compradores" — mini mockup o 1–2 screenshots con pies
6. Footer: CTA primario "Responde a este correo" / "Aplica en la app → Studio › Origin";
   línea opcional: tarantulapp.com/legal/verified-origin

REGLAS DE COPY: profesional, directo, nicho tarántulas / feeders / terrarios. Frases cortas.

SALIDA: dame el HTML/CSS completo de cada pieza (one-pager, 3 cards, banner) y los textos de email/
DM/captions claramente separados por idioma. Si puedes exportar PDF/PNG, hazlo.

SCREENSHOTS (incrustar si puedes leer URLs):
- https://tarantulapp.com/outreach/monarch/01-storefront-wide.webp
- https://tarantulapp.com/outreach/monarch/02-marketplace-card.webp

TEXTO COMPLETO (pega debajo el bloque del idioma que quieras generar):
---
[PEGA AQUÍ el bloque ES, EN o FR de este documento]
```

---

## Texto completo — ESPAÑOL

# Verified Origin — el sello de confianza de TarantulApp

**Para:** criadores, tiendas y vendedores serios de tarántulas, alimento vivo, sustratos y terrarios.
**Qué es:** un **badge de confianza** revisado por nuestro equipo. No es una garantía de cada venta;
es una señal de que revisamos al vendedor y la legitimidad de su origen.

## Qué obtienes
- **Badge Verified Origin** visible en tu storefront, tus anuncios del marketplace y los **pasaportes** que emites.
- **Descubrimiento:** los compradores pueden filtrar el marketplace a **"Verified Origin only"**.
- **Días Pro para tu comprador:** al autorizar la entrega, tu cliente recibe días Pro con su espécimen.
- **Autorización en la entrega:** tú validas el recibo (en tienda o compra online) antes de liberar la custodia.
- **Tu marca:** logo y nombre en la ficha de origen del espécimen, que viaja con el animal.
- **Link para redes:** comparte tu perfil verificado desde la app.

## Cómo se obtiene
1. **Aplica** en la app: Studio › Origin (eliges tipo: criador, tienda, vendor o vendedor).
2. **Revisión manual** de nuestro equipo (identidad + tienda + origen).
3. **Badge activo** en tu storefront, anuncios y pasaportes.

## Qué ven los compradores
Un sello verde **"Verified Origin · {tipo}"** con "Más info", el origen revisado del espécimen,
y la opción de explorar solo vendedores verificados.

> Verified Origin (sello de confianza) es distinto del programa **Official Partner** (espejo de tu
> catálogo WooCommerce en la app). Un Socio Oficial aprobado **también** obtiene Verified Origin.

**Siguiente paso:** responde a este correo, o aplica en la app → **Studio › Origin**.
Más info: **https://tarantulapp.com/legal/verified-origin**

— Equipo TarantulApp · https://tarantulapp.com

---

## Full text — ENGLISH

# Verified Origin — the TarantulApp trust badge

**For:** serious breeders, stores and sellers of tarantulas, feeders, substrates and enclosures.
**What it is:** a **trust badge** reviewed by our team. Not a guarantee of every sale — a signal that
we reviewed the seller and the legitimacy of their origin.

## What you get
- **Verified Origin badge** on your storefront, your marketplace listings, and the **passports** you issue.
- **Discovery:** buyers can filter the marketplace to **"Verified Origin only"**.
- **Pro days for your buyer:** when you authorize delivery, your customer gets Pro days with their specimen.
- **Authorization at delivery:** you validate the receipt (in-store or online) before custody is released.
- **Your brand:** logo and name on the specimen's origin record, which travels with the animal.
- **Social-ready link:** share your verified profile from the app.

## How to earn it
1. **Apply** in the app: Studio › Origin (pick a type: breeder, store, vendor or seller).
2. **Manual review** by our team (identity + storefront + origin).
3. **Badge live** on your storefront, listings and passports.

## What buyers see
A green **"Verified Origin · {type}"** seal with "Learn more", the specimen's reviewed origin, and the
option to browse verified sellers only.

> Verified Origin (trust badge) is separate from the **Official Partner** program (mirroring your
> WooCommerce catalog into the app). An approved Official Partner **also** earns Verified Origin.

**Next step:** reply to this email, or apply in the app → **Studio › Origin**.
More info: **https://tarantulapp.com/legal/verified-origin**

— TarantulApp team · https://tarantulapp.com

---

## Texte complet — FRANÇAIS

# Verified Origin — le badge de confiance TarantulApp

**Pour :** éleveurs, boutiques et vendeurs sérieux de mygales, proies, substrats et terrariums.
**Ce que c'est :** un **badge de confiance** examiné par notre équipe. Pas une garantie de chaque
vente — un signal que nous avons vérifié le vendeur et la légitimité de son origine.

## Ce que vous obtenez
- **Badge Verified Origin** sur votre vitrine, vos annonces du marketplace et les **passeports** que vous émettez.
- **Découverte :** les acheteurs peuvent filtrer le marketplace sur **« Verified Origin only »**.
- **Jours Pro pour votre acheteur :** en autorisant la livraison, votre client reçoit des jours Pro avec son spécimen.
- **Autorisation à la livraison :** vous validez le reçu (en boutique ou en ligne) avant de libérer la garde.
- **Votre marque :** logo et nom sur la fiche d'origine du spécimen, qui voyage avec l'animal.
- **Lien pour les réseaux :** partagez votre profil vérifié depuis l'app.

## Comment l'obtenir
1. **Postulez** dans l'app : Studio › Origin (choisissez un type : éleveur, boutique, vendor ou vendeur).
2. **Examen manuel** par notre équipe (identité + vitrine + origine).
3. **Badge actif** sur votre vitrine, vos annonces et vos passeports.

## Ce que voient les acheteurs
Un sceau vert **« Verified Origin · {type} »** avec « En savoir plus », l'origine vérifiée du spécimen,
et l'option de ne parcourir que les vendeurs vérifiés.

> Verified Origin (badge de confiance) est distinct du programme **Partenaire Officiel** (miroir de
> votre catalogue WooCommerce dans l'app). Un Partenaire Officiel approuvé obtient **aussi** Verified Origin.

**Prochaine étape :** répondez à ce courriel, ou postulez dans l'app → **Studio › Origin**.
Plus d'infos : **https://tarantulapp.com/legal/verified-origin**

— Équipe TarantulApp · https://tarantulapp.com

---

## Tips

1. Genera **3 PDFs** (uno por idioma) o uno trilingüe en 2 páginas.
2. En ChatGPT con Advanced Data Analysis, pide "export PDF/PNG" tras el HTML.
3. Para social cards, pide tamaños exactos (1080×1080, 1200×628) y zona segura de texto.
4. Mantén el badge verde como sello reconocible; el resto de la pieza usa el oro/carbón de marca.
