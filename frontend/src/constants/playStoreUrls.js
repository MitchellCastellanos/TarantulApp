/** Public Play Store listing (closed testing track). Override with `VITE_ANDROID_PLAY_STORE_URL`. */
const DEFAULT_STORE_URL = 'https://play.google.com/store/apps/details?id=com.tarantulapp.app'

/** Closed-testing opt-in page — the only Play link that works for invitees before public launch. */
const DEFAULT_TESTING_URL = 'https://play.google.com/apps/testing/com.tarantulapp.app'

const envStore =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANDROID_PLAY_STORE_URL
    ? String(import.meta.env.VITE_ANDROID_PLAY_STORE_URL).trim()
    : ''

const envTesting =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANDROID_PLAY_TESTING_URL
    ? String(import.meta.env.VITE_ANDROID_PLAY_TESTING_URL).trim()
    : ''

export const ANDROID_PLAY_STORE_URL = envStore || DEFAULT_STORE_URL
export const ANDROID_PLAY_TESTING_URL = envTesting || DEFAULT_TESTING_URL

/**
 * Old internal-testing install URL — referenced only when telling testers to stop using it.
 * @deprecated Install via {@link ANDROID_PLAY_STORE_URL}.
 */
export const ANDROID_PLAY_LEGACY_INTERNAL_TEST_URL =
  'https://play.google.com/apps/internaltest/4700991665399344151'
