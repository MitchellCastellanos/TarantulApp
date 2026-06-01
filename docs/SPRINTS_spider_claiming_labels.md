# Sprints — Claiming, Labels, Phone verification & Pro

Plan de ejecución para el brain-dump de claiming / labels / admin / SMS / Pro.
Diseñado en **tracks paralelos** por sprint para minimizar el número de sprints.
Base del codebase: backend Spring Boot (`backend/src/main/java/com/tarantulapp`),
frontend React/Vite (`frontend/src`). Última migración existente: **V129**
(las nuevas arrancan en **V130**).

Decisiones de producto confirmadas:
- **SMS:** Twilio Verify (servicio dedicado a OTP; solo verificación, no marketing).
- **Pro grant al reclamar:** 30 días el **primer** claim del usuario, **7 días** por
  cada ejemplar adicional. Anti-abuso: no re-otorgar al transferir/re-reclamar el
  mismo passport.

---

## Sistemas existentes que reutilizamos (no reinventar)

| Área | Archivos clave |
|------|----------------|
| Claim | `entity/Passport.java`, `entity/PassportClaimEvent.java`, `service/PassportService.java` (`claimPassport`), `controller/PublicController.java` (`POST /api/public/t/{shortId}/claim`), `frontend/.../components/PassportView.jsx` |
| QR / Label print | `pages/QrToolPage.jsx`, `pages/QrBulkPrintPage.jsx`, `components/QRModal.jsx`, `components/QrLabelOptionsPanel.jsx`, `components/QrLabelPreview.jsx`, `utils/qrLabelOptions.js`, `utils/qrBrandComposite.js` (`buildFullLabelPngDataUrl`, `downloadBrandedQrPng`) |
| Admin | `pages/admin/*`, `service/AdminAccessService.java`, gating por `users.is_admin` |
| Pro grants | `entity/ProDayGrant.java` (+ `ProDayGrantSource` enum, ya incluye `PASSPORT_CLAIM`), `service/ProDayGrantService.java` (`recordGrant`, `summaryForUser`), `pages/ProPage.jsx`, `components/ProDaysSummaryCard.jsx` |
| Badges | `components/VerifiedOriginBadge.jsx`, `components/OfficialPartnerShield.jsx`, `service/VerifiedOriginService.java`, `users.verified_origin_at/_kind` |
| Transfers | `entity` + `V123__specimen_transfers.sql`, `pages/TransfersPage.jsx`, `services/meTransfersService.js` |

---

## SPRINT 1 — Fundaciones (3 tracks paralelos, sin colisión de archivos)

Cada track toca archivos distintos y/o migraciones con número reservado para
poder trabajarse en paralelo sin conflicto.

### Track 1A — QR print para keepers *(frontend puro, independiente)* ✅ el más autocontenido
Objetivo: que el keeper con araña reclamada imprima su etiqueta **con o sin datos**
desde el botón QR del **Dashboard** y del **specimen**, igual que Studio pero
**solo QRs** (sin inventario, sin emitir passports).
- Enriquecer `components/QRModal.jsx`: añadir `QrLabelOptionsPanel` (toggle care
  facts + target specimen/species) y descargar vía `buildFullLabelPngDataUrl`
  (no solo el QR simple actual).
- Añadir entrada "Imprimir etiqueta QR" en `pages/DashboardPage.jsx` (acción por
  specimen y/o atajo general) reusando el mismo modal.
- Reusar `utils/qrLabelOptions.js` + `utils/qrBrandComposite.js`. Cero backend.
- i18n: claves `qr.facts.*`, `qr.qrTarget.*` ya existen; añadir las que falten.
- **Sin migración.**

### Track 1B — Regla de Pro 30/7 + anti-abuso *(backend, independiente)*
- `service/ProDayGrantService.java` / `service/PassportService.claimPassport`:
  calcular días = 30 si es el **primer** `PASSPORT_CLAIM` del usuario, si no 7.
- Anti-abuso: un `Passport` solo otorga Pro **una vez** (flag/consulta sobre
  `passport_claim_events` / `Passport.pro_gift_days`); transferir o re-reclamar
  no vuelve a pagar Pro. Validar también en flujo de transfers (`V123`).
- **Migración V130** (`V130__passport_pro_grant_once.sql`): columna/índice para
  marcar passport ya recompensado (p. ej. `passports.pro_granted_at`) si no se
  puede derivar limpio de los eventos.
- Tests en `backend/src/test`.

### Track 1C — Infra de verificación de teléfono (Twilio Verify) *(backend, independiente)*
- **Migración V131** (`V131__users_phone_verification.sql`): `users.phone_e164`,
  `phone_verified_at`, `phone_verify_attempts`, `phone_verify_last_sent_at`,
  `batch_issuer_terms_accepted_at`.
- `config`: propiedades Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
  `TWILIO_VERIFY_SERVICE_SID`) + cliente. Modo no-op/log si no hay credenciales
  (para local/CI).
- `service/PhoneVerificationService.java`: `startVerification(userId, phoneE164)`,
  `checkCode(userId, code)`, rate-limit y expiración.
- `controller`: `POST /api/me/phone/verify/start`, `POST /api/me/phone/verify/check`.
- Tests con cliente Twilio mockeado.

**Entrega Sprint 1:** 1A shippable solo; 1B y 1C dejan la base lista para Sprint 2.

---

> **Estado:** Sprint 1 ✅ (mergeado PR #70). Sprint 2 ✅ (PR #71). Sprint 3 ✅ (marketplace badges ya existían; añadido gating de venta).

## SPRINT 2 — Experiencia & gating (3 tracks paralelos, dependen de S1)

### Track 2A — Claim celebration + onboarding *(depende 1B)*
- En `PassportView.jsx` fase "success": pantalla "¡Felicidades, reclamaste un
  espécimen!" mostrando **badges** del origen (verified origin, official partner)
  con su descripción breve, y "tus 2 Pro están pendientes" enlazando a la sección
  Pro. Llevar a la **ficha interna** (`TarantulaDetailPage`).
- Onboarding breve: overlay greyed-out señalando pestañas (profile/timeline/care/
  reminders), ficha de cuidados de especie y cómo loggear. Componente reusable de
  spotlight; persistir "visto" en localStorage / backend.

### Track 2B — Teléfono UI + condiciones + gate de batch *(depende 1C)*
- UI de captura + verificación de teléfono (entrada E.164, envío de código,
  check). Ubicación: `AccountPage` y/o flujo previo a emitir en batch.
- Aceptación de **condiciones por tipo de user** para emitir tarjetas/passports en
  batch con marca; texto en `TermsPage` / modal. "Pro hasta que se valide".
- **Gate:** Studio batch / emisión no-P2P requiere `phone_verified_at` +
  `batch_issuer_terms_accepted_at`. Mostrar araña **greyed-out** y navegación libre
  mientras está pendiente, con opción "contactar soporte" si no se libera en 2h.

### Track 2C — Admin: labels por usuario + semáforo + alerta 2h *(depende datos claim + email)*
- Página admin nueva (`pages/admin/AdminLabelsPage.jsx`) + endpoint: labels
  emitidas **por usuario**, si es **verified origin**, **status del claim**
  (semáforo verde/amarillo/rojo), e **imprimir por ellos**.
- **Job 2h:** si un claim no se confirma en 2 horas → alertar al admin (email
  predeterminado) para contactar al seller/vendor/partner responsable. Reusar
  `job/` + ShedLock (`V67/V83`). Columna `claim_pending_alert_sent_at` —
  **Migración V132**.

---

## SPRINT 3 — Marketplace & endurecimiento *(pendiente de aclaración)*

- **Marketplace:** la nota quedó incompleta en el brain-dump ("Necesitamos también
  que el marketplace …"). **Bloqueado hasta aclarar** qué se requiere.
- Anti-abuso transversal (límites por cuenta/tiempo, detección de re-claim en
  cadenas de transfer), auditoría de los gates, e2e Playwright de claim→print y
  de verificación de teléfono.

---

## Resumen de migraciones nuevas
| Versión | Archivo | Track |
|---------|---------|-------|
| V130 | `passport_pro_grant_once` | 1B |
| V131 | `users_phone_verification` | 1C |
| V132 | `passport_claim_pending_alert` | 2C |
