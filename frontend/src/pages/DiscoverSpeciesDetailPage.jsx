import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PublicShell from '../components/PublicShell'
import DiscoverSpeciesProfileSnippet from '../components/DiscoverSpeciesProfileSnippet'
import speciesService from '../services/speciesService'
import { useAuth } from '../context/AuthContext'
import { usePageSeo } from '../hooks/usePageSeo'
import { discoverHeroImageAbsoluteUrl, formatDiscoverSeoMetaLine } from '../utils/discoverSeo'
import SpeciesReferenceImage from '../components/SpeciesReferenceImage'

function DiscoverSpeciesDetailSeo({ view, speciesId }) {
  const { t, i18n } = useTranslation()
  const sp = view.species
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const path = `/descubrir/especie/${speciesId}`
  const canonicalHref = origin ? `${origin}${path}` : undefined
  const fallback512 = origin ? `${origin}/icon-512.png` : null
  const ogImage = discoverHeroImageAbsoluteUrl(sp, view.fallbackPhoto) || fallback512

  const metaLine = useMemo(() => formatDiscoverSeoMetaLine(sp, t), [sp, t, i18n.language])

  const description = useMemo(() => {
    const commonFrag = sp.commonName ? t('discover.seoCommonFragment', { common: sp.commonName }) : ''
    return t('discover.seoSpeciesDescription', {
      name: sp.scientificName,
      common: commonFrag,
      meta: metaLine,
    })
  }, [sp.scientificName, sp.commonName, metaLine, t, i18n.language])

  const title = useMemo(
    () => t('discover.seoSpeciesTitle', { name: sp.scientificName }),
    [sp.scientificName, t, i18n.language]
  )

  const jsonLd = useMemo(() => {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const pageUrl = canonicalHref || (base ? `${base}${path}` : path)
    const gbif = sp.gbifUsageKey != null ? `https://www.gbif.org/species/${sp.gbifUsageKey}` : null
    return {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description,
      url: pageUrl,
      inLanguage: i18n.language,
      isPartOf: {
        '@type': 'WebSite',
        name: 'TarantulApp',
        url: base || undefined,
      },
      about: {
        '@type': 'Taxon',
        name: sp.scientificName,
        ...(sp.commonName ? { alternateName: sp.commonName } : {}),
        ...(gbif ? { sameAs: gbif } : {}),
      },
    }
  }, [title, description, canonicalHref, path, sp, i18n.language])

  usePageSeo({
    title,
    description,
    imageUrl: ogImage,
    canonicalHref,
    jsonLd,
    jsonLdId: 'discover-species-jsonld',
  })
  return null
}

export default function DiscoverSpeciesDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const hasPro = user?.hasProFeatures === true
  const [view, setView] = useState(null)
  const [err, setErr] = useState(false)
  const [clientPhoto, setClientPhoto] = useState(null)
  const [dbReferenceBroken, setDbReferenceBroken] = useState(false)

  useEffect(() => {
    setClientPhoto(null)
    setDbReferenceBroken(false)
  }, [id])

  useEffect(() => {
    const sid = Number(id)
    if (!Number.isFinite(sid)) {
      setErr(true)
      return
    }
    speciesService
      .getDiscoverSpeciesView(sid)
      .then(setView)
      .catch(() => setErr(true))
  }, [id])

  useEffect(() => {
    if (!view?.species) return
    const sp = view.species
    const hasRef = Boolean(sp.referencePhotoUrl?.trim()) && !dbReferenceBroken
    if (hasRef) return
    if (view.fallbackPhoto?.url) return
    const n = (sp.scientificName || '').trim()
    if (!n) return
    let cancelled = false
    speciesService.photoFallback(n).then((p) => {
      if (!cancelled && p?.url) setClientPhoto(p)
    })
    return () => {
      cancelled = true
    }
  }, [
    view?.species?.id,
    view?.fallbackPhoto?.url,
    view?.species?.referencePhotoUrl,
    view?.species?.scientificName,
    dbReferenceBroken,
  ])

  if (err) {
    return (
      <PublicShell>
        <p className="text-muted">{t('discover.speciesNotFound')}</p>
        <Link to="/descubrir">{t('common.back')}</Link>
      </PublicShell>
    )
  }

  if (!view?.species) {
    return (
      <PublicShell>
        <p className="text-muted">{t('common.loading')}</p>
      </PublicShell>
    )
  }

  const sp = view.species
  const addNewHref = `/tarantulas/new?speciesId=${sp.id}`
  const credit = view.fallbackPhoto || clientPhoto

  return (
    <PublicShell>
      <DiscoverSpeciesDetailSeo view={view} speciesId={id} />
      <div className="mx-auto" style={{ maxWidth: 720 }}>
        <button
          type="button"
          className="btn btn-link btn-sm text-decoration-none ps-0 mb-3"
          style={{ color: 'var(--ta-gold)' }}
          onClick={() => navigate(-1)}
        >
          {t('common.back')}
        </button>

        <DiscoverSpeciesProfileSnippet species={sp} variant="discover" nameAs="h1" />

        <figure className="mt-3 mb-3">
          <SpeciesReferenceImage
            storedUrl={sp.referencePhotoUrl}
            fallbackUrl={view.fallbackPhoto?.url || clientPhoto?.url}
            alt=""
            className="img-fluid rounded border"
            style={{ borderColor: 'var(--ta-border)' }}
            onStoredUrlFailed={() => setDbReferenceBroken(true)}
          />
          {(!sp.referencePhotoUrl?.trim() || dbReferenceBroken) && credit?.attribution && (
            <figcaption className="small mt-1" style={{ color: 'var(--ta-text-muted)' }}>
              {credit.attribution}
              {credit.licenseCode ? ` · ${credit.licenseCode}` : ''}
              {credit.taxonPageUrl && (
                <>
                  {' '}
                  <a href={credit.taxonPageUrl} target="_blank" rel="noreferrer" className="text-reset">
                    {t('discover.sourceLink')}
                  </a>
                </>
              )}
            </figcaption>
          )}
        </figure>

        <p className="small mt-2 mb-0" style={{ color: 'var(--ta-text)' }}>
          {t('discover.seoSpeciesLead')}
        </p>

        <p className="small mt-3" style={{ color: 'var(--ta-text-muted)' }}>
          {t('discover.dataDisclaimer')}
        </p>

        <div className="mt-4 d-flex flex-column gap-2">
          {token ? (
            <Link
              to={addNewHref}
              className="btn btn-sm fw-semibold align-self-start"
              style={{
                background: 'linear-gradient(135deg, #3d7a4f 0%, #2d5c3c 100%)',
                color: '#f0fff4',
                border: '1px solid rgba(120, 200, 140, 0.5)',
              }}
            >
              {t('discover.addToCollection')}
            </Link>
          ) : (
            <>
              <p className="small mb-0" style={{ color: 'var(--ta-text-muted)' }}>
                {t('discover.loginToAddHint')}
              </p>
              <Link
                to="/login"
                state={{ redirectAfterAuth: addNewHref }}
                className="btn btn-sm fw-semibold align-self-start"
                style={{
                  border: '1px solid var(--ta-gold)',
                  color: 'var(--ta-gold)',
                  background: 'transparent',
                }}
              >
                {t('discover.loginOrRegisterToAdd')}
              </Link>
            </>
          )}
        </div>

        {hasPro && (
          <div className="mt-3">
            <Link
              to={`/descubrir/comparar?a=${sp.id}`}
              className="btn btn-sm"
              style={{ border: '1px solid var(--ta-gold)', color: 'var(--ta-gold)', background: 'transparent' }}
            >
              {t('discover.comparePickSecond')}
            </Link>
          </div>
        )}
        {!hasPro && (
          <p className="small mt-3 mb-0" style={{ color: 'var(--ta-text-muted)' }}>
            {t('discover.compareProTeaser')}{' '}
            <Link to="/pro" style={{ color: 'var(--ta-gold)' }}>
              Pro
            </Link>
            {t('discover.compareProTeaserEnd')}
          </p>
        )}
      </div>
    </PublicShell>
  )
}
