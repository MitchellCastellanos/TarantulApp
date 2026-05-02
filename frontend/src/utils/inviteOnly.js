/** Mirror backend APP_AUTH_INVITE_ONLY_REGISTRATION — must enable both for closed beta. */
export function isInviteOnlyEnabled() {
  return String(import.meta.env.VITE_PUBLIC_INVITE_ONLY || '').toLowerCase() === 'true'
}
