# Plan — Etiquetas de terrario "care tags" (mini ficha de cuidados en el QR)

> Estado: **plan listo para implementar**. No hay código escrito todavía.
> Rama de trabajo sugerida para la implementación: `claude/terrarium-tag-expansion-KgW0H`.
> Este documento es autosuficiente: contiene contexto, decisiones cerradas, archivos a tocar y criterios de aceptación.

---

## 1. Objetivo

Extender las etiquetas-QR actuales para que, al imprimirlas, el keeper pueda **activar/desactivar** un bloque de "care facts" estilo etiqueta de vendedor de tarántulas: temperamento, old/new world, temperatura, humedad, etc. La info sale del catálogo de especies que ya tenemos.

**Meta de negocio:** que los vendedores usen estas etiquetas (con nuestra marca y un QR a la app) sin darse cuenta de que están adoptando/difundiendo TarantulApp. Por eso el QR debe poder apuntar a una página **genérica de la especie** (útil para un comprador cualquiera), no solo al ejemplar privado, y la UI debe explicar la diferencia para empujar la elección correcta.

---

## 2. Decisiones cerradas (no reabrir sin avisar)

| Tema | Decisión |
|------|----------|
| **Temperatura** | **Derivada en frontend** mediante un ruleset por `hobbyWorld` + `habitatType`. Se muestra marcada como **"aprox."**. **Sin migración ni cambios de backend.** Punto de extensión dejado para volverla editable en BD más adelante. |
| **Gating Pro** | **Igual que hoy**: imprimir **1** etiqueta (con o sin facts) es **gratis**; la **impresión masiva (bulk) sigue siendo Pro**. Los care-facts y el QR genérico NO añaden gating nuevo. |
| **Toggle de facts** | Un único switch "Datos de cuidado (care facts)" que añade el bloque completo. Granularidad por campo queda fuera de v1 (ver §10). |
| **Tipo de QR** | Selector con copy explicativo: **(a) Ejemplar** → perfil privado/público del bicho; **(b) Especie (genérico)** → ficha pública de la especie. Un QR por etiqueta (no dos). |
| **Word flexible** | Cada etiqueta PNG se dimensiona **al contenido real** (sin hueco blanco interno ni márgenes laterales de sobra) para que en Word se manipule como imagen limpia. |

---

## 3. Estado actual (qué existe hoy)

### Flujo de etiquetas-QR
- **`frontend/src/pages/QrToolPage.jsx`** — generación single/bulk y escaneo por cámara. Punto de entrada `/tools/qr` (bulk en `/tools/qr?mode=bulk`).
- **`frontend/src/pages/QrBulkPrintPage.jsx`** — página dedicada de export masivo.
- **`frontend/src/utils/qrBrandComposite.js`** — compone el PNG de la etiqueta (QR + logo centrado + texto + línea de corte). Funciones clave:
  - `buildFullLabelPngDataUrl({ url, nameLine, speciesLine, shortIdLine })` → devuelve **un data URL** PNG.
  - `downloadBrandedQrPng({...})` → descarga/share del PNG single.
  - `FULL_LABEL_LAYOUT` = `{ canvasW: 320, canvasH: 430, qrSize: 224, qrTop: 5 }` (**altura fija** — origen del hueco blanco).
  - `labelDocxDimensions(displayQrPx)` → escala `canvasW/canvasH` según el lado de QR en cm.
- **`frontend/src/utils/buildQrBulkDocx.js`** — arma el `.docx`. `buildQrBulkDocxBlob({ items, layout, sizeCm, docTitle, footerNote })`. `layout` = `'fixed'` (2 columnas) o `'flex'` (4 columnas). Usa secciones con `column` (no tablas) para que mover una etiqueta no arrastre celdas. `QR_BULK_MAX = 60`.

### Qué muestra la etiqueta hoy
QR (apunta a `https://[app]/t/[shortId]`) + nombre del ejemplar (negrita, ≤2 líneas) + nombre científico (itálica, ≤3 líneas) + short ID + logo TarantulApp + borde de corte punteado. Export en **PNG** (single) y **DOCX** (bulk). Sin temperatura, humedad, NW/OW ni facts.

### Catálogo de especies (datos disponibles — NO hay que crearlos)
Backend `backend/src/main/java/com/tarantulapp/entity/Species.java` + `SpeciesDTO`. Campos relevantes para las etiquetas:

| Campo | Tipo | Notas |
|-------|------|-------|
| `scientificName` | String | obligatorio |
| `commonName` | String | nullable |
| `originRegion` | String | p.ej. "Brazil", "Madagascar" |
| `hobbyWorld` | String | `"new_world"` / `"old_world"` (derivado de origen si falta) |
| `temperament` | String | p.ej. "docile", "defensive" |
| `experienceLevel` | String | `beginner` / `intermediate` / `advanced` |
| `habitatType` | String | `terrestrial` / `arboreal` / `fossorial` |
| `ventilation` | String | `low` / `moderate` / `high` |
| `humidityMin` / `humidityMax` | Integer | 0–100 % |
| `adultSizeCmMin` / `adultSizeCmMax` | BigDecimal | |
| `growthRate` | String | `slow` / `moderate` / `fast` |
| `narrativeI18n` | String(JSON) | `{ "temperament": {"es":..,"en":..,"fr":..}, ... }` para texto localizado |
| `referencePhotoUrl` | String | (no se usa en v1) |
| **temperatura** | — | **NO existe**; se deriva (ver §5) |

### Rutas destino del QR (ya existen)
- Ejemplar: **`/t/:shortId`** → `PublicProfilePage`.
- Especie genérica: **`/discover/species/:id`** → `DiscoverSpeciesDetailPage` (ficha pública de la especie).

### Stack
React 18 + Vite, JS/JSX, Bootstrap 5, React Query, **i18next** (locales `frontend/src/i18n/{en,es,fr}.json`), libs `qrcode` y `docx`. Sin TypeScript en componentes.

---

## 4. Resumen de la feature

1. **Toggle "Care facts"** en `QrToolPage` (single y bulk) con **preview en vivo**.
2. **Selector de tipo de QR** (Ejemplar vs Especie) con copy que explica diferencias y casos de uso.
3. **Bloque de facts** compuesto en el PNG, alimentado del catálogo + temperatura derivada.
4. **Badge NW/OW a color** (verde New World / rojo Old World) como señal rápida de manejo/veneno.
5. **Etiqueta dimensionada al contenido** → arregla la manipulación en Word flexible.
6. **i18n** en es/en/fr y **gating Pro** sin cambios.

---

## 5. Temperatura derivada (frontend, "aprox.")

Crear **`frontend/src/utils/careFacts.js`** (módulo de funciones puras y testeables).

```js
// Rangos de hobby aproximados (°C). Punto único para ajustar después o sustituir por datos de BD.
export function deriveTempRangeC(species) {
  const world = (species?.hobbyWorld || '').toLowerCase()
  const habitat = (species?.habitatType || '').toLowerCase()
  // tabla simple; el implementador puede afinar valores con un tarantulero
  if (habitat === 'fossorial') return { min: 24, max: 27, approx: true }
  if (world === 'old_world') return { min: 25, max: 28, approx: true }
  if (world === 'new_world') return habitat === 'arboreal'
    ? { min: 24, max: 27, approx: true }
    : { min: 24, max: 26, approx: true }
  return { min: 24, max: 26, approx: true } // fallback genérico
}
```

- La etiqueta debe rotular el valor como aproximado, p.ej. `Temp ~24–26 °C` (el "~" ya comunica "aprox"; además el `footerNote` del DOCX puede incluir un disclaimer corto, ver §7).
- **Punto de extensión:** si en el futuro se añaden `temperature_min/max` a `Species`, esta función debe preferir el dato real cuando exista y caer al ruleset solo si es null. Dejar comentario `// TODO: usar species.temperatureMin/Max cuando existan`.

Otras derivaciones en el mismo módulo:

```js
// Construye las líneas del bloque de facts ya localizadas y compactadas.
// t = función i18next; species = SpeciesDTO; opts.locale para narrativeI18n.
export function buildCareFactLines(species, t, locale) { /* ver §6 */ }

// Texto localizado de narrativeI18n con fallback al campo plano.
export function localizedNarrative(species, key, locale) { ... }

// 'new_world' | 'old_world' -> { label, color } para el badge.
export function worldBadge(species, t) { ... }
```

---

## 6. Contenido del bloque de facts

Cuando el toggle está **ON**, debajo del nombre/especie/ID se añade:

1. **Badge NW/OW** a color (rectángulo redondeado dibujado en canvas; **no usar emoji** por inconsistencia de render en canvas):
   - New World → fondo verde (`#2e7d32`), texto blanco "NEW WORLD".
   - Old World → fondo rojo (`#c62828`), texto blanco "OLD WORLD".
2. Hasta ~5 líneas compactas (fuente ~12–13px, separador `·`), omitiendo las que no tengan dato:
   - `Temperamento: {temperament} · Nivel: {experienceLevel}`
   - `Hábitat: {habitatType} · Ventilación: {ventilation}`
   - `Temp ~{tmin}–{tmax} °C · Humedad {hmin}–{hmax} %`
   - `Tamaño ~{sizeMin}–{sizeMax} cm · Crece {growthRate}`
   - `Origen: {originRegion}`

Reglas:
- Todos los valores enum (`temperament`, `experienceLevel`, `habitatType`, `ventilation`, `growthRate`) se muestran **traducidos** vía claves i18n (§8); `temperament` prefiere `narrativeI18n`.
- Omitir líneas/campos vacíos en vez de mostrar "—".
- Truncar cada línea con `…` si excede el ancho (reutilizar `wrapLinesToWidth` o equivalente, limitando a 1 línea por fact).
- Cuando el toggle está **OFF**, la etiqueta es **idéntica a la actual** (cero regresión).

---

## 7. Cambios en el compositor y en el DOCX

### 7.1 `qrBrandComposite.js` — dimensionado al contenido (núcleo del fix de Word)

Hoy el lienzo es fijo (320×430) → hueco blanco interno + margen lateral (QR 224 dentro de 320). Cambiar a **medir primero, dibujar después**:

1. Reemplazar/extender `buildFullLabelPngDataUrl` para que:
   - Reciba además `{ facts }` (array de líneas ya construidas por `buildCareFactLines`) y `worldBadge` (o `null`).
   - **Mida** todas las líneas (nombre, especie, ID, facts) con un contexto temporal y **calcule el alto exacto** `H` = `qrTop + qrSize + gaps + altoBadge + Σ alturas de línea + alto logo footer + paddings`.
   - Use un **ancho ajustado** `W = qrSize + 2*HPAD` (p.ej. `HPAD = 14` → `W ≈ 252`) en lugar de 320, para quitar el aire lateral. El texto se envuelve a `W - 2*textPad`.
   - Dibuje el borde de corte punteado en el **borde exacto** del lienzo (sigue abrazando el contenido, ahora sin hueco).
   - **Devuelva `{ dataUrl, width, height }`** (ancho/alto reales del lienzo), no solo el string. Esto permite que el DOCX escale con proporción correcta por etiqueta.
2. `FULL_LABEL_LAYOUT`: conservar `qrSize`, `qrTop`, `HPAD`; **eliminar la dependencia de `canvasH` fijo** (pasa a calcularse). Mantener un alto/ancho de referencia solo para el cálculo de escala.
3. `labelDocxDimensions`: cambiar la firma para recibir **las dimensiones reales del lienzo** + el `displayQrPx` deseado:
   ```js
   // escala para que el QR mida displayQrPx; mantiene proporción del lienzo real
   labelDocxDimensions({ canvasW, canvasH, qrSize }, displayQrPx)
   ```
4. `downloadBrandedQrPng`: adaptarse al nuevo retorno `{ dataUrl }`.

> **No** rellenar el lienzo con transparencia + auto-trim por alpha: el fondo es blanco intencional para impresión. La solución correcta es **calcular el tamaño**, no recortar a posteriori.

### 7.2 `buildQrBulkDocx.js`

- `buildLabelParagraphs(items, displayQrPx, layout)`:
  - Pasar `facts`/`worldBadge` por item a `buildFullLabelPngDataUrl`.
  - Usar el `{ width, height }` **reales** que ahora devuelve el compositor con `labelDocxDimensions(realDims, displayQrPx)`.
  - **`layout === 'flex'`**: usar el tamaño **propio** (tight) de cada etiqueta → imagen manipulable sin aire.
  - **`layout === 'fixed'`**: para que la rejilla de corte quede alineada, **normalizar todas las etiquetas al alto de la más alta** del lote (rellenar el sobrante repartido arriba/abajo dentro del borde). Así se mantiene la cuadrícula imprimible. (Si se prefiere simplicidad, documentar que en fixed también puede ir tight, pero la rejilla quedará dentada.)
- `footerNote`: cuando los facts estén activos, añadir disclaimer corto, p.ej. *"Datos de cuidado aproximados; la temperatura es orientativa."* (localizado).
- Mantener `column` sin tablas y `QR_BULK_MAX`.

### 7.3 Verificación obligatoria en Word/LibreOffice
El implementador **debe** abrir un `.docx` `flex` generado y comprobar que, al hacer clic en una etiqueta, los **tiradores de selección abrazan el contenido visible** (sin caja transparente/blanca extra) y que se puede mover/redimensionar como imagen única sin arrastrar nada. Documentar el resultado.

---

## 8. UI en `QrToolPage.jsx`

1. **Switch "Datos de cuidado (care facts)"** (off por defecto) — visible en single y bulk.
2. **Selector de tipo de QR** (radio o segmented control) con copy explicativo inline:
   - **"Este ejemplar"** → QR a `/t/:shortId`. Texto: *"Lleva a la ficha de este bicho (historial, mudas, etc.). Ideal para tu colección."*
   - **"Especie (genérico)"** → QR a `/discover/species/:id`. Texto: *"Lleva a la ficha pública de la especie con sus cuidados. Ideal para vender o regalar: el comprador escanea y aprende en TarantulApp."*
   - Default sugerido: **"Este ejemplar"** (comportamiento actual). Persistir la última elección del usuario (localStorage).
   - Para el QR genérico se necesita el `species.id`/slug del ejemplar; si un ejemplar no tiene especie resuelta, deshabilitar la opción genérica con tooltip explicativo.
3. **Preview en vivo**: re-renderizar el PNG (o un equivalente DOM) al cambiar toggle/tipo de QR, para una etiqueta de muestra. Reutilizar `buildFullLabelPngDataUrl` y pintar el data URL en un `<img>`.
4. **Bulk**: el toggle y el tipo de QR aplican a **todo el lote**. Mantener selección de tamaño (cm) y `layout` fixed/flex existentes.
5. **Gating**: sin cambios — single gratis; bulk dispara el gate Pro como hoy.

---

## 9. i18n

Añadir claves en `frontend/src/i18n/{en,es,fr}.json` (mismas claves en los 3). Grupos:

- `qr.facts.toggle`, `qr.facts.disclaimer`
- `qr.qrTarget.specimen.label` / `.help`, `qr.qrTarget.species.label` / `.help`
- `qr.facts.world.new`, `qr.facts.world.old`
- Labels de facts: `qr.facts.temperament`, `.level`, `.habitat`, `.ventilation`, `.temp`, `.humidity`, `.size`, `.growth`, `.origin`
- Valores enum: `species.temperament.*`, `species.experienceLevel.{beginner|intermediate|advanced}`, `species.habitatType.{terrestrial|arboreal|fossorial}`, `species.ventilation.{low|moderate|high}`, `species.growthRate.{slow|moderate|fast}` — **reutilizar las que ya existan** (revisar `SpeciesCarePanels.jsx` y los json antes de crear duplicados).

---

## 10. Fuera de alcance (v1)

- Migración de temperatura a BD / edición en admin (solo se deja el punto de extensión).
- Toggle granular por campo (v1 es un solo switch para todo el bloque).
- Foto de la especie (`referencePhotoUrl`) en la etiqueta.
- Dos QR en una misma etiqueta.
- Export PDF (se mantiene PNG + DOCX).

---

## 11. Lista de archivos a tocar

| Archivo | Cambio |
|---------|--------|
| `frontend/src/utils/careFacts.js` | **NUEVO**: `deriveTempRangeC`, `buildCareFactLines`, `localizedNarrative`, `worldBadge`. |
| `frontend/src/utils/qrBrandComposite.js` | Dimensionado al contenido; `buildFullLabelPngDataUrl` recibe `facts`/`worldBadge` y devuelve `{dataUrl,width,height}`; ajustar `labelDocxDimensions` y `downloadBrandedQrPng`; dibujar badge NW/OW. |
| `frontend/src/utils/buildQrBulkDocx.js` | Pasar facts por item; usar dims reales; normalizar alto en `fixed`, tight en `flex`; disclaimer en `footerNote`. |
| `frontend/src/pages/QrToolPage.jsx` | Switch de facts, selector de tipo de QR con copy, preview en vivo, persistencia, deshabilitar genérico sin especie. |
| `frontend/src/pages/QrBulkPrintPage.jsx` | Propagar toggle + tipo de QR si tiene UI propia. |
| `frontend/src/i18n/{en,es,fr}.json` | Claves nuevas (§9). |
| Tests | Unit de `careFacts.js` (derivación temp, omisión de campos vacíos, fallbacks). |

---

## 12. Criterios de aceptación

1. Toggle **OFF** → etiqueta byte-equivalente a la actual (sin regresión visual ni de tamaño).
2. Toggle **ON** → aparecen badge NW/OW a color y hasta ~5 líneas de facts, con campos vacíos **omitidos**.
3. Temperatura se muestra como `~min–max °C` derivada por `hobbyWorld`/`habitatType`, con disclaimer de "aproximado".
4. Selector de QR cambia el destino real del QR (`/t/:shortId` vs `/discover/species/:id`) y muestra copy explicativo; opción genérica deshabilitada si no hay especie.
5. Preview en vivo refleja toggle y tipo de QR.
6. **Bulk** respeta toggle + tipo de QR para todo el lote; sigue topado en `QR_BULK_MAX`; **bulk sigue siendo Pro**, single sigue gratis.
7. En el `.docx` **flex**, cada etiqueta es una imagen **sin márgenes/hueco extra**: al seleccionarla en Word los tiradores abrazan el contenido y se mueve/redimensiona limpia (verificado a mano).
8. En el `.docx` **fixed**, la rejilla queda alineada (alto normalizado) y recortable.
9. i18n completa en es/en/fr; sin strings hardcodeados.
10. Render correcto en móvil (Capacitor) — el canvas no usa emoji para el badge.

---

## 13. Notas de implementación

- Toda la lógica nueva es **frontend**; no tocar backend ni BD.
- Mantener el `errorCorrectionLevel: 'H'` y el `margin: 1` del QR (necesarios para escaneo con logo centrado).
- Probar escaneo real del QR genérico en un móvil: la URL `/discover/species/:id` debe resolver públicamente.
- Antes de crear claves i18n o de valores enum, revisar `SpeciesCarePanels.jsx` para reutilizar las existentes.
