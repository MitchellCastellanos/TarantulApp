import { defineConfig, devices } from '@playwright/test'

const PREVIEW_PORT = 4173
const baseURL = `http://127.0.0.1:${PREVIEW_PORT}`

/**
 * E2E minimo (Sprint 1): rutas publicas sin credenciales.
 * `npm run test:e2e` hace build y levanta vite preview (estable en Windows).
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npx vite preview --host 127.0.0.1 --port ${PREVIEW_PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
