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

Necesitas **PostgreSQL** y un archivo local **solo en tu PC** (no se sube a git):

1. **Docker (recomendado)** — una vez; cambia `TU_PASSWORD_DOCKER` por la clave que quieras (la misma luego en el paso 2):

```bash
docker run --name tarantulapp-pg -e POSTGRES_PASSWORD=TU_PASSWORD_DOCKER -e POSTGRES_DB=tarantulapp -p 5432:5432 -d postgres:16
```

2. Copia `backend/src/main/resources/application-local.properties.SAMPLE` a `backend/src/main/resources/application-local.properties` y sustituye `TU_PASSWORD_DOCKER` en `spring.datasource.password` por la misma del paso 1. Si cambiaste base o puerto, ajusta `spring.datasource.url` (ver comentarios en el `.SAMPLE`).

3. Arranca el API (el perfil `local` suele ir ya en `application-local.properties`; si quieres forzarlo por CLI):

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

En **Windows PowerShell** hay que **entrecomillar** el `-D` o Maven recibe mal el argumento (`Unknown lifecycle phase ".run.profiles=local"`):

```powershell
cd backend
mvn "-Dspring-boot.run.profiles=local" spring-boot:run
```

Alternativa sin `-D`: `$env:SPRING_PROFILES_ACTIVE="local"; mvn spring-boot:run`

**Supabase en local:** en `application-local.properties` comenta el bloque Docker y descomenta el de Supabase; datos del panel (Direct), no inventados. Detalle en el `.SAMPLE`.

**Produccion (Railway, etc.):** sigue usando variables `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` en el panel del host; no uses `application-local.properties` alli.

Flyway corre automaticamente al iniciar el backend.

**Windows / OneDrive — problemas al arrancar el backend**

- **`Found more than one migration with version 35` apuntando a `target\classes\db\migration`:** en `src\main\resources\db\migration` no debería haber dos `V35__...`; el duplicado suele ser un **.sql viejo** que quedó solo en `backend\target` tras renombrar un archivo. Borra la carpeta **`backend\target`** entera y vuelve a compilar (ver siguiente punto si `mvn clean` falla).

- **`mvn clean` no puede borrar `target\...` (p. ej. `mockito-extensions`):** algún proceso tiene archivos abiertos (Java/Spring aún en ejecución, IDE, indexador). Cierra la app, el terminal que dejó colgado `spring-boot:run`, y en el Administrador de tareas termina procesos **`java.exe`**. Luego borra **a mano** la carpeta `backend\target` en el Explorador o con PowerShell: `Remove-Item -Recurse -Force .\target` desde `backend`. Si el repo está en OneDrive y sigue bloqueado, prueba “Pausar sincronización” un momento o reiniciar.

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

## GitHub Pages (si lo tienes encendido)

Si en el repo activaste **GitHub Pages** con publicacion desde la rama `main` (raiz o `/docs`), GitHub intenta pasar el contenido por **Jekyll** y aparece el workflow `pages-build-deployment` con logs de `jekyll-theme-primer`.

Este proyecto **no es un sitio Jekyll**: el frontend es Vite/React en `frontend/`. En la raiz hay un archivo **`.nojekyll`** para indicar a Pages que **no** use Jekyll y sirva archivos estaticos tal cual.

Si solo quieres hosting del SPA compilado, lo habitual es publicar `frontend/dist` con **GitHub Actions** (Settings > Pages > Source: GitHub Actions) y un workflow propio; si no usas Pages, desactivalo en Settings para evitar builds extra.
