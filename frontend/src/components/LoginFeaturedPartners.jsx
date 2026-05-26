import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import marketplaceService from '../services/marketplaceService'
import OfficialPartnerShield from './OfficialPartnerShield'
import { partnerStorefrontPath, vendorHasInAppStorefront } from '../utils/partnerStorefront'
import { isFoundingPartnerTier } from '../utils/partnerProgramTier'

export default function LoginFeaturedPartners({ compact = false }) {
  const { t } = useTranslation()
  const [partners, setPartners] = useState([])

  useEffect(() => {
    marketplaceService
      .listOfficialVendors()
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : []
        const featured = list
          .filter((v) => vendorHasInAppStorefront(v) && partnerStorefrontPath(v.slug))
          .sort((a, b) => {
            const af = isFoundingPartnerTier(a) ? 1 : 0
            const bf = isFoundingPartnerTier(b) ? 1 : 0
            if (af !== bf) return bf - af
            return (b.influenceScore ?? 0) - (a.influenceScore ?? 0)
          })
          .slice(0, compact ? 3 : 6)
        setPartners(featured)
      })
      .catch(() => setPartners([]))
  }, [compact])

  if (partners.length === 0) return null

  return (
    <section className={`ta-login-partners${compact ? ' ta-login-partners--compact' : ''}`} aria-labelledby="login-partners-title">
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-2">
        <div>
          <h3 id="login-partners-title" className="h6 fw-semibold mb-0" style={{ color: 'var(--ta-gold)' }}>
            {t('auth.loginPage.featuredPartnersTitle')}
          </h3>
          <p className="small mb-0" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.45 }}>
            {t('auth.loginPage.featuredPartnersLead')}
          </p>
        </div>
        <Link to="/partners" className="small fw-semibold text-decoration-none" style={{ color: 'var(--ta-brown-light)' }}>
          {t('auth.loginPage.featuredPartnersApply')}
        </Link>
      </div>
      <div className="d-flex gap-2 overflow-auto pb-1">
        {partners.map((v) => {
          const founding = isFoundingPartnerTier(v)
          const href = partnerStorefrontPath(v.slug)
          const location = [v.city, v.country].filter(Boolean).join(' · ')
          return (
            <Link
              key={v.id}
              to={href}
              className={`ta-login-partners__card flex-shrink-0 text-decoration-none${founding ? ' ta-login-partners__card--founding' : ''}`}
            >
              <div className="d-flex align-items-center gap-1 mb-1">
                {founding ? <OfficialPartnerShield width={14} height={16} idPrefix={`lp-${v.id}`} /> : null}
                <span className={`badge ${founding ? 'bg-warning text-dark' : 'bg-dark'}`} style={{ fontSize: '0.55rem' }}>
                  {founding ? t('marketplace.foundingPartnerBadge') : t('marketplace.officialPartnerBadge')}
                </span>
              </div>
              <div className="small fw-semibold text-truncate" style={{ color: 'var(--ta-parchment)' }}>
                {v.name}
              </div>
              {location ? (
                <div className="small text-truncate" style={{ color: 'var(--ta-text-muted)', fontSize: '0.68rem' }}>
                  {location}
                </div>
              ) : null}
              <div className="small mt-1" style={{ color: 'var(--ta-text-muted)', fontSize: '0.68rem' }}>
                {t('marketplace.partnerVendorListingCount', { count: v.activeListingCount ?? 0 })}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
