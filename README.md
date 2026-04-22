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

## Migraciones y base de datos

- Las migraciones SQL viven en `backend/src/main/resources/db/migration`.
- Cada migracion debe usar version unica (`VNN__descripcion.sql`) para evitar fallos de validacion Flyway.
- Si necesitas una migracion de respaldo, crea una nueva version (no reutilices una ya existente).

## CI

Pipeline en `.github/workflows/ci.yml`:
- Job backend: `mvn -B clean test`
- Job frontend: `npm run test:e2e` (incluye build + smoke Playwright)
