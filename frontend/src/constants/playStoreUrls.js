/** Google Play — internal testing (closed beta). Overridable via `VITE_ANDROID_PLAY_INTERNAL_TEST_URL`. */
const envUrl =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANDROID_PLAY_INTERNAL_TEST_URL
    ? String(import.meta.env.VITE_ANDROID_PLAY_INTERNAL_TEST_URL).trim()
    : ''
export const ANDROID_PLAY_INTERNAL_TEST_URL =
  envUrl || 'https://play.google.com/apps/internaltest/4700991665399344151'
