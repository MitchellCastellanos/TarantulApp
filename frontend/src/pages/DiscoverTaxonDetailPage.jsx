import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PublicShell from '../components/PublicShell'
import DiscoverSpeciesProfileSnippet from '../components/DiscoverSpeciesProfileSnippet'
import speciesService from '../services/speciesService'
import { imgUrl } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function DiscoverTaxonDetailPage() {
  const { gbifKey } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const hasPro = user?.hasProFeatures === true
  const [data, setData] = useState(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    const key = Number(gbifKey)
    if (!Number.isFinite(key)) {
      setErr(true)
      return
    }
    speciesService
      .discoverTaxon(key)
      .then(setData)
      .catch(() => setErr(true))
  }, [gbifKey])

  if (err) {
    return (
      <PublicShell>
        <p className="text-muted">{t('discover.taxonNotFound')}</p>
        <Link to="/descubrir">{t('common.back')}</Link>
      </PublicShell>
    )
  }

  if (!data) {
    return (
      <PublicShell>
        <p className="text-muted">{t('common.loading')}</p>
      </PublicShell>
    )
  }

  const photo = data.photo
  const taxonImageSrc = photo?.url ? imgUrl(photo.url) : null
  const addNewHref = `/tarantulas/new?gbifKey=${data.gbifKey}`

  return (
    <PublicShell>
      <div className="mx-auto" style={{ maxWidth: 640 }}>
        <button
          type="button"
          className="btn btn-link btn-sm text-decoration-none ps-0 mb-3"
          style={{ color: 'var(--ta-gold)' }}
          onClick={() => navigate(-1)}
        >
          {t('common.back')}
        </button>
        <DiscoverSpeciesProfileSnippet
          variant="discover"
          title={data.canonicalName || data.scientificName}
          subtitle={[
            data.vernacularName,
            `GBIF #${data.gbifKey}`,
            data.family || null,
          ]
            .filter(Boolean)
            .join(' · ')}
        />

        {taxonImageSrc && (
          <figure className="mb-3">
            <img src={taxonImageSrc} alt="" className="img-fluid rounded border" style={{ borderColor: 'var(--ta-border)' }} />
            {photo?.attribution && (
              <figcaption className="small mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {photo.attribution}
                {photo.licenseCode ? ` · ${photo.licenseCode}` : ''}
                {photo.taxonPageUrl && (
                  <>
                    {' '}
                    <a href={photo.taxonPageUrl} target="_blank" rel="noreferrer" className="text-reset">
                      {t('discover.sourceLink')}
                    </a>
                  </>
                )}
              </figcaption>
            )}
          </figure>
        )}

        {!taxonImageSrc && <p className="small text-muted mb-3">{t('discover.noPhoto')}</p>}

        {data.dataAttributionNote && (
          <p className="small" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {data.dataAttributionNote}
          </p>
        )}

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
              <p className="small mb-0" style={{ color: 'rgba(255,255,255,0.55)' }}>
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
          <div className="mt-4">
            <button
              type="button"
              className="btn btn-sm"
              style={{ border: '1px solid var(--ta-gold)', color: 'var(--ta-gold)', background: 'transparent' }}
              onClick={() => navigate(`/descubrir/comparar?gbifA=${data.gbifKey}`)}
            >
              {t('discover.comparePickSecond')}
            </button>
          </div>
        )}
        {!hasPro && (
          <p className="small mt-4 mb-0" style={{ color: 'rgba(255,255,255,0.45)' }}>
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
