/**
 * Closed-beta / invite-only mode: locked navbar for guests, beta-only private routes, landing en {@code /}.
 * Desactivado: registro abierto y navegación normal; el backend sigue gobernado por APP_AUTH_REGISTRATION_MODE.
 * Para volver a activar el gate de beta cerrada, restaura la lectura de {@code VITE_PUBLIC_INVITE_ONLY}.
 */
export function isInviteOnlyEnabled() {
  return false
}
