# Official Partner one-pager → PDF con ChatGPT

Use this doc to generate a **print-ready PDF** (Canva-style) from the same copy we attach in outreach emails.

**Put finished PDFs here** (attached to outreach emails):

- `backend/src/main/resources/outreach/official-partner-onepager-es.pdf`
- `backend/src/main/resources/outreach/official-partner-onepager-en.pdf`
- `backend/src/main/resources/outreach/official-partner-onepager-fr.pdf`

**Markdown** in the same folder is for editing copy / ChatGPT only (`official-partner-onepager-{es,en,fr}.md`).

Screenshots for the PDF (optional embed):

- https://tarantulapp.com/outreach/monarch/01-storefront-wide.webp
- https://tarantulapp.com/outreach/monarch/02-marketplace-card.webp

---

## Prompt para ChatGPT (copiar y pegar)

```
Eres diseñador editorial. Crea UN PDF de UNA página (tamaño carta u A4) para TarantulApp — programa Official Partner.

IDIOMA: [elige ES / EN / FR — pega el texto completo de ese idioma abajo]

MARCA:
- Nombre: TarantulApp
- Estética: premium / hobby científico, fondo pergamino claro (#f7f4ee) o blanco cálido
- Acento oro (#c9a227 / #8b6914), texto carbón (#1c1916), secundario (#5c5348)
- Tipografía: sans moderna (Inter, DM Sans o similar), títulos en negrita
- Logo: texto “TarantulApp” con pequeño detalle de araña opcional (no inventes logo raster si no lo tienes)

ESTRUCTURA (en este orden):
1. Header: título del programa + subtítulo “Invitación Official Partner”
2. Bloque “Qué obtienen” — tabla o 4–6 bullets con iconos minimalistas
3. Mini diagrama de flujo: WooCommerce → sync → app → checkout en su web (UTM)
4. Sección “Qué necesitamos” — lista corta numerada
5. Dos screenshots lado a lado o apilados (URLs abajo) con pies: “Vitrina” y “Marketplace”
6. Footer: **“Reply to this email”** as primary CTA; optional small line: tarantulapp.com/partners · Monarch ejemplo: partner/monarch-reptiles

REGLAS DE COPY:
- Enfócate en: descubrimiento en la app, badge Official Partner, sync Woo, clicks/tráfico a SU tienda
- NO menciones comisiones, “sin cuota”, “no platform fee”, ni comparaciones de precio
- Diferencia breve: Official Partner (catálogo espejo) vs Vendor de pago (listings manuales) — una línea
- Tono: profesional, directo, nicho tarántulas / feeders / terrarios

SALIDA:
- Genera el diseño como HTML/CSS imprimible O instrucciones paso a paso para Canva
- Si puedes exportar PDF, hazlo; si no, dame el HTML completo listo para “Imprimir → Guardar como PDF”

SCREENSHOTS (incrustar si el modelo puede leer URLs):
- https://tarantulapp.com/outreach/monarch/01-storefront-wide.webp
- https://tarantulapp.com/outreach/monarch/02-marketplace-card.webp

TEXTO COMPLETO (pegar debajo de esta línea):
---
[PEGA AQUÍ el contenido de official-partner-onepager-es.md, -en.md o -fr.md]
```

---

## Texto completo — ESPAÑOL

# TarantulApp — Programa Official Partner (one-pager)

**Para:** tiendas y distribuidores WooCommerce (tarántulas, alimento vivo, sustratos, terrarios)  
**Invitación:** **Official Partner** — reflejamos tu catálogo en la app y te enviamos keepers a tu web  
**Checkout:** Siempre en **tu sitio** (tráfico etiquetado con UTM)

## Qué obtienen

| Beneficio | Detalle |
|-----------|---------|
| **Vitrina en la app** | Página pública: `tarantulapp.com/partner/tu-marca` |
| **Descubrimiento** | Productos en el marketplace con badge **Official Partner** |
| **Clicks a tu tienda** | Keepers exploran en TarantulApp; compran en **tu checkout** |
| **Cero trabajo duplicado** | **Sync** desde tu Woo — no subes listings a mano en la app |
| **Handoff de carrito (opcional)** | Varios artículos pueden abrir tu carrito Woo con UTM |
| **Link para redes** | Comparte tu vitrina desde la app |

**Ejemplo en vivo (founding partner):** https://tarantulapp.com/partner/monarch-reptiles

## Qué necesitamos de ustedes

1. Tienda **WooCommerce** con catálogo accesible (probamos su URL).  
2. **Autorización** para mostrar productos seleccionados y enlazar a sus URLs (documento corto a firmar).  
3. **~15 min** de llamada: categorías, países de envío, prueba opcional de carrito.  
4. Mantener el catálogo en su web — el sync refleja cambios automáticamente.

**No** necesitan: cuenta por SKU, subir fotos en nuestra app, ni cambiar su checkout.

## Cómo funciona

Su WooCommerce → sync automático → vitrina + marketplace en TarantulApp  
El keeper compra → en su sitio web (UTM)

- **Official Partner** (este programa): catálogo espejo, badge, tráfico a tu tienda.  
- **Vendor de pago** (otro track): criadores que publican manualmente en la app.

## Handoff de carrito (opcional)

Si su Woo acepta URLs `add-to-cart`, el keeper puede llevar varios ítems al carrito. Si no, cada producto abre en su web con UTM.

## Siguiente paso

**Respondan a este correo** — agendamos llamada corta (~15 min), autorización, test sync y publicamos con su OK.

Opcional: más info en **https://tarantulapp.com/partners**

— Equipo TarantulApp · https://tarantulapp.com

---

## Full text — ENGLISH

# TarantulApp — Official Partner Program (one-pager)

**For:** WooCommerce shops and distributors (tarantulas, feeders, substrates, enclosures)  
**Invitation:** **Official Partner** — we mirror your catalog in the app and send keepers to your store  
**Checkout:** Always on **your website** (traffic tagged with UTM)

## What you get

| Benefit | Detail |
|--------|--------|
| **In-app storefront** | Public page: `tarantulapp.com/partner/your-brand` |
| **Marketplace discovery** | Your products in the main feed with an **Official Partner** badge |
| **Clicks to your store** | Keepers browse in TarantulApp; they buy on **your checkout** |
| **Zero duplicate work** | **Sync** from your Woo catalog — no manual listing uploads in our app |
| **Optional cart handoff** | Multi-item cart can open your Woo cart with UTM |
| **Social-ready link** | Share your storefront from the app |

**Live example (founding partner):** https://tarantulapp.com/partner/monarch-reptiles

## What we need from you

1. **WooCommerce** store with a reachable catalog (we test your URL).  
2. **Authorization** to display selected products and link to your URLs (short doc to sign).  
3. **~15 minutes** on a call: categories, shipping regions, optional cart test.  
4. Keep your **website catalog updated** — sync picks up changes automatically.

We do **not** need: a user account per SKU, manual photo uploads, or changing how you run checkout.

## How it works

Your WooCommerce → automatic sync → TarantulApp storefront + marketplace  
Keeper buys → on your website (UTM)

- **Official Partner** (this program): mirrored catalog, badge, traffic to your store.  
- **Paid Vendor** (separate track): breeders who list manually inside the app.

## Optional: cart handoff

If your Woo theme supports standard `add-to-cart` URLs, keepers can add multiple items to your cart. Otherwise each product opens on your site with UTM.

## Next step

**Reply to this email** — we’ll book a short call (~15 min), send authorization, run a test sync, and go live when you approve.

Optional: **https://tarantulapp.com/partners**

— TarantulApp team · https://tarantulapp.com

---

## Texte complet — FRANÇAIS

# TarantulApp — Programme Partenaire Officiel (one-pager)

**Pour :** boutiques et distributeurs WooCommerce (mygales, proies, substrats, terrariums)  
**Invitation :** **Partenaire Officiel** — nous reflétons votre catalogue dans l’app et envoyons des keepers vers votre boutique  
**Paiement :** Toujours sur **votre site web** (trafic balisé UTM)

## Ce que vous obtenez

| Avantage | Détail |
|----------|--------|
| **Vitrine dans l’app** | Page publique : `tarantulapp.com/partner/votre-marque` |
| **Découverte** | Produits dans le marketplace avec badge **Partenaire Officiel** |
| **Clics vers votre boutique** | Les keepers explorent TarantulApp ; achat sur **votre checkout** |
| **Zéro double saisie** | **Sync** depuis votre Woo — pas d’annonces à téléverser dans l’app |
| **Handoff panier (optionnel)** | Plusieurs articles peuvent ouvrir votre panier Woo avec UTM |
| **Lien pour les réseaux** | Partage de vitrine depuis l’app |

**Exemple en ligne (partenaire fondateur) :** https://tarantulapp.com/partner/monarch-reptiles

## Ce dont nous avons besoin

1. Boutique **WooCommerce** avec catalogue accessible (nous testons votre URL).  
2. **Autorisation** d’afficher les produits sélectionnés et de lier vers vos URLs (court document à signer).  
3. **~15 min** d’appel : catégories, zones d’expédition, test panier optionnel.  
4. Catalogue **à jour** sur votre site — le sync suit les changements.

Pas besoin de : compte par SKU, photos manuelles dans l’app, ni de changer votre checkout.

## Fonctionnement

Votre WooCommerce → sync automatique → vitrine + marketplace TarantulApp  
Achat → sur votre site (UTM)

- **Partenaire Officiel** (ce programme) : catalogue miroir, badge, trafic vers votre boutique.  
- **Vendor payant** (autre track) : éleveurs qui publient manuellement dans l’app.

## Handoff panier (optionnel)

Si votre Woo accepte les URL `add-to-cart` standard, panier multi-articles possible. Sinon chaque produit ouvre sur votre site avec UTM.

## Prochaine étape

**Répondez à ce courriel** — appel court (~15 min), autorisation, test sync et mise en ligne avec votre accord.

Optionnel : **https://tarantulapp.com/partners**

— Équipe TarantulApp · https://tarantulapp.com

---

## Tips rápidos

1. Genera **3 PDFs** (uno por idioma) o uno trilingüe en 2 páginas si el cliente es bilingüe.  
2. En ChatGPT con **Advanced Data Analysis**, pide “export PDF” tras el HTML.  
3. Alternativa: pega el HTML en [https://www.markdowntopdf.com](https://www.markdowntopdf.com) solo si no necesitas diseño fancy.  
4. Para máximo control: importa copy a **Canva** → plantilla “One pager business” → colores de marca arriba.
