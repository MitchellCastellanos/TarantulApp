/** 1200×630 OG card for community, keeper profile, and social share fallbacks. */
export const SOCIAL_OG_IMAGE_PATH = '/og-social.png'

export function socialOgImageUrl(origin) {
  if (!origin) return undefined
  return `${origin}${SOCIAL_OG_IMAGE_PATH}`
}
