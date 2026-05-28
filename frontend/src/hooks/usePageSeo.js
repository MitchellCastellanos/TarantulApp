import { useEffect } from 'react'
import { BRAND_WITH_TM } from '../constants/brand'

/** Debe coincidir con `index.html` (SEO por defecto de la SPA). */
export const SITE_DEFAULT_TITLE =
  `${BRAND_WITH_TM} — Tarantula keeper logbook, species catalog & marketplace`
export const SITE_DEFAULT_DESCRIPTION =
  'Manage your tarantula collection: profiles, feeding & molt reminders, terrarium QR labels, a sourced species catalog (WSC/GBIF), and a keeper marketplace.'
export const SITE_DEFAULT_IMAGE_PATH = '/og-social.png'

function siteDefaultImageUrl() {
  if (typeof window === 'undefined' || !window.location?.origin) return undefined
  return `${window.location.origin}${SITE_DEFAULT_IMAGE_PATH}`
}

function upsertMeta(attr, key, content) {
  if (content == null || content === '') return
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function removeMeta(attr, key) {
  document.querySelector(`meta[${attr}="${key}"]`)?.remove()
}

function removeJsonLd(id) {
  document.getElementById(id)?.remove()
}

/**
 * Actualiza &lt;title&gt;, meta OG/Twitter y JSON-LD. Al desmontar restaura los valores por defecto del sitio.
 * @param {{ noindex?: boolean }} opts — `noindex` evita indexar rutas autenticadas o borradores.
 */
export function usePageSeo({
  title,
  description,
  imageUrl,
  canonicalHref,
  jsonLd,
  jsonLdId = 'page-jsonld',
  ogType = 'website',
  noindex = false,
}) {
  useEffect(() => {
    const prevTitle = document.title
    if (title) document.title = title

    const pageUrl = typeof window !== 'undefined' ? window.location.href : ''

    let prevCanonicalHref = null
    let createdCanonical = false
    if (canonicalHref) {
      let linkCanonical = document.querySelector('link[rel="canonical"]')
      prevCanonicalHref = linkCanonical?.getAttribute('href') ?? null
      if (!linkCanonical) {
        linkCanonical = document.createElement('link')
        linkCanonical.setAttribute('rel', 'canonical')
        document.head.appendChild(linkCanonical)
        createdCanonical = true
      }
      linkCanonical.setAttribute('href', canonicalHref)
    }

    const desc = description ?? ''
    const ogImage = imageUrl || siteDefaultImageUrl()

    upsertMeta('name', 'description', desc)
    upsertMeta('property', 'og:type', ogType)
    upsertMeta('property', 'og:title', title ?? SITE_DEFAULT_TITLE)
    upsertMeta('property', 'og:description', desc)
    upsertMeta('property', 'og:url', pageUrl)
    if (ogImage) upsertMeta('property', 'og:image', ogImage)

    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', title ?? SITE_DEFAULT_TITLE)
    upsertMeta('name', 'twitter:description', desc)
    if (ogImage) upsertMeta('name', 'twitter:image', ogImage)

    if (jsonLd) {
      removeJsonLd(jsonLdId)
      const script = document.createElement('script')
      script.id = jsonLdId
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(script)
    }

    if (noindex) {
      upsertMeta('name', 'robots', 'noindex, nofollow')
    }

    return () => {
      const defaultImage = siteDefaultImageUrl()
      document.title = SITE_DEFAULT_TITLE
      upsertMeta('name', 'description', SITE_DEFAULT_DESCRIPTION)
      upsertMeta('property', 'og:type', 'website')
      upsertMeta('property', 'og:title', SITE_DEFAULT_TITLE)
      upsertMeta('property', 'og:description', SITE_DEFAULT_DESCRIPTION)
      removeMeta('property', 'og:url')
      if (defaultImage) upsertMeta('property', 'og:image', defaultImage)
      upsertMeta('name', 'twitter:card', 'summary_large_image')
      upsertMeta('name', 'twitter:title', SITE_DEFAULT_TITLE)
      upsertMeta('name', 'twitter:description', SITE_DEFAULT_DESCRIPTION)
      if (defaultImage) upsertMeta('name', 'twitter:image', defaultImage)
      if (noindex) removeMeta('name', 'robots')
      removeJsonLd(jsonLdId)

      const lc = document.querySelector('link[rel="canonical"]')
      if (lc && canonicalHref) {
        if (createdCanonical) lc.remove()
        else if (prevCanonicalHref) lc.setAttribute('href', prevCanonicalHref)
        else lc.remove()
      }
    }
  }, [title, description, imageUrl, canonicalHref, jsonLd, jsonLdId, ogType, noindex])
}
