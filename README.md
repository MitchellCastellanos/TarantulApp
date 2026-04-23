# TarantulApp

Repositorio monorepo de TarantulApp con:
- `backend`: API en Spring Boot + Flyway + PostgreSQL.
- `frontend`: app web React + Vite + Playwright e2e smoke.

## Requisitos

- Java 17
- Maven 3.9+
- Node.js 20+
- npm 10+
- PostgreSQL 14+ (o Supabase Postgres)

## Setup rapido

### 1) Backend

1. Copia `backend/database.local.env.SAMPLE` a `backend/database.local.env` y completa variables.
2. Ajusta `backend/src/main/resources/application.properties` o crea un profile local segun tu entorno.
3. Ejecuta:

```bash
cd backend
mvn clean spring-boot:run
```

Flyway corre automaticamente al iniciar el backend.

### 2) Frontend

1. Copia `frontend/.env.example` a `frontend/.env.development` y completa variables.
2. Ejecuta:

```bash
cd frontend
npm ci
npm run dev
```

## Correr pruebas

### Backend (unit/integration)

```bash
cd backend
mvn -B clean test
```

### Frontend smoke E2E

```bash
cd frontend
npm ci
npx playwright install chromium
npm run test:e2e
```

## Android Studio (Capacitor)

El proyecto Android vive en `frontend/android` y es generado/sincronizado desde el frontend web.

Flujo recomendado:

```bash
cd frontend
npm ci
npm run build
npx cap sync android
npx cap open android
```

Notas:
- Si cambias codigo web (React/Vite), vuelve a correr `npm run build` + `npx cap sync android`.
- Abre Android Studio siempre sobre `frontend/android` (no sobre la raiz del repo).
- El package id actual es `com.tarantulapp.app` (ver `frontend/capacitor.config.ts` y `frontend/android/app/build.gradle`).
- Si usas notificaciones push, agrega `google-services.json` en `frontend/android/app/`.

## Branching recomendado (simple y estable)

Para evitar drift entre ramas:

- `main`: estable / release candidate.
- `dev_mitch_android`: rama de integracion diaria (web + Android).
- `feature/*`: ramas cortas por tarea, saliendo de `dev_mitch_android`.
- `hotfix/*`: fixes urgentes, salen de `main` y luego se backportean a `dev_mitch_android`.

Flujo diario sugerido:

1. Crear `feature/<tema>` desde `dev_mitch_android`.
2. Hacer cambios y PR a `dev_mitch_android`.
3. Validar backend + frontend + Android sync (`npm run build && npx cap sync android`).
4. Cuando toque release, merge/cherry-pick limpio de `dev_mitch_android` a `main`.

Importante:
- Evita trabajar en paralelo en varias ramas largas (`claude/*`, `dev/*`, `main`) para la misma feature.
- Si necesitas ramas auxiliares de IA, usalas temporales y luego consolida todo en `dev_mitch_android`.
- Mantener una sola rama de integracion reduce conflictos de SQL/migraciones y de assets Android.

## Migraciones y base de datos

- Las migraciones SQL viven en `backend/src/main/resources/db/migration`.
- Cada migracion debe usar version unica (`VNN__descripcion.sql`) para evitar fallos de validacion Flyway.
- Si necesitas una migracion de respaldo, crea una nueva version (no reutilices una ya existente).

## CI

Pipeline en `.github/workflows/ci.yml`:
- Job backend: `mvn -B clean test`
- Job frontend: `npm run test:e2e` (incluye build + smoke Playwright)
