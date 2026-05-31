import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import FangPanel from '../components/FangPanel'
import OfficialPartnerShield from '../components/OfficialPartnerShield'
import { useCapabilities } from '../hooks/useCapabilities'
import mePartnerService from '../services/mePartnerService'
import meBrandingService from '../services/meBrandingService'
import LogoUploader from '../components/LogoUploader'
import { isFoundingPartnerTier } from '../utils/partnerProgramTier'

export default function PartnerHubPage() {
  const { t } = useTranslation()
  const { data: capabilities, isLoading: capsLoading } = useCapabilities()
  const [hub, setHub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingMode, setSavingMode] = useState(false)

  useEffect(() => {
    if (!capabilities?.officialPartner) {
      setLoading(false)
      return
    }
    let cancelled = false
    mePartnerService
      .hub()
      .then((data) => {
        if (!cancelled) setHub(data)
      })
      .catch(() => {
        if (!cancelled) setError(t('partnerHub.loadError'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [capabilities?.officialPartner, t])

  if (capsLoading || loading) {
    return (
      <div>
        <Navbar />
        <div className="container py-4"><p>{t('common.loading')}</p></div>
      </div>
    )
  }

  if (!capabilities?.officialPartner || !hub?.eligible) {
    return <Navigate to="/partners" replace />
  }

  const vendor = hub.vendor || {}
  const ops = vendor.opsSummary || {}
  const founding = isFoundingPartnerTier(vendor)
  const checkout = vendor.checkout || {}

  const changeCheckoutMode = async (mode) => {
    setSavingMode(true)
    setError('')
    try {
      const next = await mePartnerService.setCheckoutMode(mode)
      setHub(next)
    } catch {
      setError(t('partnerHub.checkoutModeError'))
    } finally {
      setSavingMode(false)
    }
  }

  return (
    <div>
      <Navbar />
      <div className="container py-4" style={{ maxWidth: 720 }}>
        <div className="d-flex align-items-start gap-2 mb-3">
          {founding && <OfficialPartnerShield width={28} height={30} />}
          <div>
            <h1 className="h4 mb-1">{t('partnerHub.title')}</h1>
            <p className="small text-muted mb-0">{vendor.name}</p>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="row g-2 mb-4">
          <div className="col-6 col-md-3">
            <FangPanel>
              <div className="small text-muted">{t('partnerHub.listings')}</div>
              <div className="fs-5 fw-bold">{vendor.activeListingCount ?? vendor.catalogTotal ?? 0}</div>
            </FangPanel>
          </div>
          <div className="col-6 col-md-3">
            <FangPanel>
              <div className="small text-muted">{t('partnerHub.handoffs30d')}</div>
              <div className="fs-5 fw-bold">{ops.handoffs30d ?? 0}</div>
            </FangPanel>
          </div>
        </div>

        {ops.latestSync && (
          <FangPanel className="mb-3">
            <h2 className="h6 mb-2">{t('partnerHub.syncTitle')}</h2>
            <p className="small mb-0">
              {t('partnerHub.syncSummary', {
                status: ops.latestSync.status || '—',
                upserted: ops.latestSync.upsertedCount ?? 0,
                processed: ops.latestSync.processedCount ?? 0,
              })}
            </p>
          </FangPanel>
        )}

        <FangPanel className="mb-3">
          <h2 className="h6 mb-2">{t('partnerHub.actionsTitle')}</h2>
          <div className="d-flex flex-wrap gap-2">
            {hub.storefrontPath && (
              <Link to={hub.storefrontPath} className="btn btn-sm btn-dark">
                {t('partnerHub.openStorefront')}
              </Link>
            )}
            {vendor.websiteUrl && (
              <a href={vendor.websiteUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary">
                {t('partnerHub.openWebsite')}
              </a>
            )}
            <Link to="/marketplace" className="btn btn-sm btn-outline-secondary">
              {t('partnerHub.viewMarketplace')}
            </Link>
          </div>
          <p className="small text-muted mt-3 mb-0">{t('partnerHub.adminSyncHint')}</p>
        </FangPanel>

        {checkout.inAppEligible && (
          <FangPanel className="mb-3">
            <h2 className="h6 mb-2">{t('partnerHub.checkoutModeTitle')}</h2>
            <p className="small text-muted mb-2">{t('partnerHub.checkoutModeHint')}</p>
            <div className="btn-group" role="group" aria-label={t('partnerHub.checkoutModeTitle')}>
              <button
                type="button"
                className={`btn btn-sm ${checkout.preferredMode === 'tarantulapp' ? 'btn-outline-secondary' : 'btn-dark'}`}
                disabled={savingMode}
                onClick={() => changeCheckoutMode('website')}
              >
                {t('partnerHub.checkoutModeWebsite')}
              </button>
              <button
                type="button"
                className={`btn btn-sm ${checkout.preferredMode === 'tarantulapp' ? 'btn-success' : 'btn-outline-secondary'}`}
                disabled={savingMode}
                onClick={() => changeCheckoutMode('tarantulapp')}
              >
                {t('partnerHub.checkoutModeInApp')}
              </button>
            </div>
          </FangPanel>
        )}

        {capabilities?.branding && (
          <FangPanel className="mt-3">
            <LogoUploader service={meBrandingService} />
          </FangPanel>
        )}
      </div>
    </div>
  )
}
