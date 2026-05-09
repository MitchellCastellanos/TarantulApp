const STORAGE_KEY = 'tarantulapp.androidUpdateBanner.v1'

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (_) {
    return {}
  }
}

/**
 * El usuario pulsó "Más tarde" para esta versión publicada en Play ({@code latestVersionCode} del servidor).
 * Si subes el código en el backend, el aviso vuelve a mostrarse.
 */
export function isDismissedForLatestVersion(latestVersionCode) {
  const code = Number(latestVersionCode)
  if (!Number.isFinite(code)) return false
  const dismissed = Number(readRaw().dismissedForLatestCode)
  return Number.isFinite(dismissed) && dismissed >= code
}

export function markDismissedForLatestVersion(latestVersionCode) {
  const code = Number(latestVersionCode)
  if (!Number.isFinite(code)) return
  const next = { ...readRaw(), dismissedForLatestCode: code }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}
