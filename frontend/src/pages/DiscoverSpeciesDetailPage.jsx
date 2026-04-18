import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PublicShell from '../components/PublicShell'
import DiscoverSpeciesProfileSnippet from '../components/DiscoverSpeciesProfileSnippet'
import speciesService from '../services/speciesService'
import { useAuth } from '../context/AuthContext'

export default function DiscoverSpeciesDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const hasPro = user?.hasProFeatures === true
  const [view, setView] = useState(null)
  const [err, setErr] = useState(false)

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

  return (
    <PublicShell>
      <div className="mx-auto" style={{ maxWidth: 720 }}>
        <button
          type="button"
          className="btn btn-link btn-sm text-decoration-none ps-0 mb-3"
          style={{ color: 'var(--ta-gold)' }}
          onClick={() => navigate(-1)}
        >
          {t('common.back')}
        </button>

        <DiscoverSpeciesProfileSnippet species={sp} variant="discover" />

        <p className="small mt-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
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
          <p className="small mt-3 mb-0" style={{ color: 'rgba(255,255,255,0.45)' }}>
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
