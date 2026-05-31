import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import marketplaceService from '../services/marketplaceService'
import OfficialPartnerShield from './OfficialPartnerShield'
import PartnerCatalogPreviewStrip from './PartnerCatalogPreviewStrip'
import {
  partnerFeaturedHref,
  vendorHasInAppStorefront,
  vendorIsFeaturedOfficialPartner,
} from '../utils/partnerStorefront'
import { isFoundingPartnerTier } from '../utils/partnerProgramTier'
import { fetchPartnerCatalogMeta, resolvePartnerCatalogCount } from '../utils/partnerCatalogMeta'
import { imgUrl } from '../services/api'

function PartnerCardLink({ vendor, className, style, children }) {
  const target = partnerFeaturedHref(vendor)
  if (!target) return <div className={className} style={style}>{children}</div>
  if (target.external) {
    return (
      <a href={target.href} className={className} style={style} target="_blank" rel="noreferrer">
        {children}
      </a>
    )
  }
  return (
    <Link to={target.href} className={className} style={style}>
      {children}
    </Link>
  )
}

export default function LoginFeaturedPartners({ compact = false }) {
  const { t } = useTranslation()
  const [partners, setPartners] = useState([])
  const [partnerCatalogMeta, setPartnerCatalogMeta] = useState({})

  useEffect(() => {
    marketplaceService
      .listOfficialVendors()
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : []
        const featured = list
          .filter((v) => vendorIsFeaturedOfficialPartner(v))
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

  useEffect(() => {
    if (!partners.length) {
      setPartnerCatalogMeta({})
      return undefined
    }
    let cancelled = false
    Promise.all(
      partners.map(async (v) => {
        const slug = String(v.slug || '').trim()
        if (!slug || !vendorHasInAppStorefront(v)) {
          return [slug, { catalogTotal: 0, previewItems: [] }]
        }
        const meta = await fetchPartnerCatalogMeta(slug)
        return [slug, meta]
      }),
    ).then((pairs) => {
      if (cancelled) return
      setPartnerCatalogMeta(Object.fromEntries(pairs.filter(([slug]) => slug)))
    })
    return () => {
      cancelled = true
    }
  }, [partners])

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
          const location = [v.city, v.country].filter(Boolean).join(' · ')
          const meta = partnerCatalogMeta[v.slug] || {}
          const previews = meta.previewItems || []
          const count = resolvePartnerCatalogCount(v, meta)
          const hasStorefront = vendorHasInAppStorefront(v)
          const logoSrc = imgUrl(v.logoUrl)
          return (
            <div
              key={v.id}
              className={`ta-login-partners__card flex-shrink-0${founding ? ' ta-login-partners__card--founding' : ''}${previews.length ? ' ta-login-partners__card--with-previews' : ''}`}
            >
              <PartnerCardLink
                vendor={v}
                className="text-decoration-none d-block"
                style={{ color: 'inherit' }}
              >
                <div className="d-flex align-items-start gap-2 mb-1">
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      alt=""
                      className="flex-shrink-0 rounded"
                      style={{ width: 28, height: 28, objectFit: 'contain', background: 'rgba(255,255,255,0.9)' }}
                    />
                  ) : null}
                  <div className="min-w-0 flex-grow-1">
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
                      {hasStorefront
                        ? t('marketplace.partnerVendorListingCount', { count })
                        : vendor.websiteUrl
                          ? t('auth.loginPage.featuredPartnerVisitSite')
                          : t('auth.loginPage.featuredPartnerBadgeOnly')}
                    </div>
                  </div>
                </div>
              </PartnerCardLink>
              {!compact && hasStorefront && <PartnerCatalogPreviewStrip items={previews} t={t} />}
            </div>
          )
        })}
      </div>
    </section>
  )
}
