import { useEffect } from 'react'

/** Debe coincidir con `index.html` (SEO por defecto de la SPA). */
export const SITE_DEFAULT_TITLE = 'TarantulApp'
export const SITE_DEFAULT_DESCRIPTION =
  'Gestiona tu colección de tarántulas: fichas, recordatorios, QR por terrario y catálogo de especies.'

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
 */
export function usePageSeo({ title, description, imageUrl, canonicalHref, jsonLd, jsonLdId = 'page-jsonld' }) {
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

    upsertMeta('name', 'description', desc)
    upsertMeta('property', 'og:title', title ?? '')
    upsertMeta('property', 'og:description', desc)
    upsertMeta('property', 'og:url', pageUrl)
    if (imageUrl) upsertMeta('property', 'og:image', imageUrl)

    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', title ?? '')
    upsertMeta('name', 'twitter:description', desc)
    if (imageUrl) upsertMeta('name', 'twitter:image', imageUrl)

    if (jsonLd) {
      removeJsonLd(jsonLdId)
      const script = document.createElement('script')
      script.id = jsonLdId
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(script)
    }

    return () => {
      document.title = SITE_DEFAULT_TITLE
      upsertMeta('name', 'description', SITE_DEFAULT_DESCRIPTION)
      upsertMeta('property', 'og:title', SITE_DEFAULT_TITLE)
      upsertMeta('property', 'og:description', SITE_DEFAULT_DESCRIPTION)
      removeMeta('property', 'og:url')
      removeMeta('property', 'og:image')
      removeMeta('name', 'twitter:card')
      removeMeta('name', 'twitter:title')
      removeMeta('name', 'twitter:description')
      removeMeta('name', 'twitter:image')
      removeJsonLd(jsonLdId)

      const lc = document.querySelector('link[rel="canonical"]')
      if (lc && canonicalHref) {
        if (createdCanonical) lc.remove()
        else if (prevCanonicalHref) lc.setAttribute('href', prevCanonicalHref)
        else lc.remove()
      }
    }
  }, [title, description, imageUrl, canonicalHref, jsonLd, jsonLdId])
}
