import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import marketplaceService from '../services/marketplaceService'
import { imgUrl } from '../services/api'
import OfficialPartnerShield from './OfficialPartnerShield'
import PartnerCatalogPreviewStrip from './PartnerCatalogPreviewStrip'
import { partnerStorefrontPath, vendorHasInAppStorefront } from '../utils/partnerStorefront'
import { isFoundingPartnerTier } from '../utils/partnerProgramTier'
import { fetchPartnerCatalogMeta, resolvePartnerCatalogCount } from '../utils/partnerCatalogMeta'

function sortPartners(rows) {
  return [...rows].sort((a, b) => {
    const af = isFoundingPartnerTier(a) ? 1 : 0
    const bf = isFoundingPartnerTier(b) ? 1 : 0
    if (af !== bf) return bf - af
    return (b.influenceScore ?? 0) - (a.influenceScore ?? 0)
  })
}

export default function VerifiedVendorsStrip() {
  const { t } = useTranslation()
  const [partners, setPartners] = useState([])
  const [verified, setVerified] = useState([])
  const [partnerCatalogMeta, setPartnerCatalogMeta] = useState({})

  useEffect(() => {
    let cancelled = false
    Promise.all([
      marketplaceService.listOfficialVendors().catch(() => []),
      marketplaceService.listVerifiedVendors(12).catch(() => []),
    ]).then(([officialRows, verifiedRows]) => {
      if (cancelled) return
      const official = Array.isArray(officialRows) ? officialRows : []
      const peer = Array.isArray(verifiedRows) ? verifiedRows : []
      const storefrontPartners = sortPartners(
        official.filter((v) => vendorHasInAppStorefront(v) && partnerStorefrontPath(v.slug)),
      )
      setPartners(storefrontPartners)
      setVerified(peer)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!partners.length) {
      setPartnerCatalogMeta({})
      return undefined
    }
    let cancelled = false
    Promise.all(
      partners.map(async (v) => {
        const slug = String(v.slug || '').trim()
        if (!slug) return [slug, { catalogTotal: 0, previewItems: [] }]
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

  const cards = useMemo(() => {
    const out = []
    for (const v of partners) {
      out.push({ kind: 'partner', key: `partner-${v.id}`, vendor: v })
    }
    for (const v of verified) {
      out.push({ kind: 'verified', key: `verified-${v.userId}`, vendor: v })
    }
    return out
  }, [partners, verified])

  if (cards.length === 0) return null

  return (
    <section className="mb-4 ta-discover-sellers-strip" aria-labelledby="verified-vendors-strip-title">
      <div className="d-flex align-items-center justify-content-between mb-1">
        <h2 id="verified-vendors-strip-title" className="h6 mb-0 fw-semibold">
          {t('marketplace.verifiedVendorsStripTitle')}
        </h2>
        <Link to="/marketplace" className="small">
          {t('marketplace.verifiedVendorsStripSeeAll')}
        </Link>
      </div>
      <p className="small text-muted mb-2">{t('marketplace.verifiedVendorsStripSub')}</p>
      <div className="d-flex gap-3 overflow-auto pb-2">
        {cards.map((card) => {
          if (card.kind === 'partner') {
            const v = card.vendor
            const founding = isFoundingPartnerTier(v)
            const href = partnerStorefrontPath(v.slug)
            const location = [v.city, v.state, v.country].filter(Boolean).join(' · ')
            const meta = partnerCatalogMeta[v.slug] || {}
            const previews = meta.previewItems || []
            const count = resolvePartnerCatalogCount(v, meta)
            return (
              <div
                key={card.key}
                className={`card border-0 shadow-sm flex-shrink-0 ta-discover-sellers-strip__card${founding ? ' ta-discover-sellers-strip__card--founding' : ''}`}
                style={{ width: previews.length ? 220 : 188 }}
              >
                <div className="card-body py-2 px-3">
                  <Link to={href} className="text-decoration-none d-block" style={{ color: 'inherit' }}>
                    <div className="d-flex align-items-center gap-1 mb-1">
                      {founding ? <OfficialPartnerShield width={16} height={18} idPrefix={`dv-${v.id}`} /> : null}
                      <span
                        className={`badge ${founding ? 'bg-warning text-dark' : 'bg-dark'}`}
                        style={{ fontSize: '0.58rem' }}
                      >
                        {founding
                          ? t('marketplace.foundingPartnerBadge')
                          : v.badge || t('marketplace.officialPartnerBadge')}
                      </span>
                    </div>
                    <div className="small fw-semibold text-truncate">{v.name}</div>
                    {location ? (
                      <div className="small text-muted text-truncate" style={{ fontSize: '0.68rem' }}>
                        {location}
                      </div>
                    ) : null}
                    <div className="small text-muted mt-1">
                      {t('marketplace.partnerVendorListingCount', { count })}
                    </div>
                  </Link>
                  <PartnerCatalogPreviewStrip items={previews} t={t} />
                </div>
              </div>
            )
          }

          const v = card.vendor
          const name = v.storefrontName || v.displayName || v.handle || 'Vendor'
          const href = v.handle ? `/u/${encodeURIComponent(v.handle)}` : `/marketplace/keeper/${v.userId}`
          return (
            <Link
              key={card.key}
              to={href}
              className="card border-0 shadow-sm flex-shrink-0 text-decoration-none ta-discover-sellers-strip__card"
              style={{ width: 160, color: 'inherit' }}
            >
              <div className="card-body py-2 px-3">
                <span className="badge bg-secondary mb-1" style={{ fontSize: '0.58rem' }}>
                  {t('marketplace.verifiedBreederBadge')}
                </span>
                {v.profilePhoto ? (
                  <img
                    src={imgUrl(v.profilePhoto)}
                    alt=""
                    className="rounded-circle mb-2"
                    width={40}
                    height={40}
                    style={{ objectFit: 'cover' }}
                  />
                ) : null}
                <div className="small fw-semibold text-truncate">{name}</div>
                <div className="small text-muted">
                  {t('marketplace.verifiedVendorListingCount', { count: v.activeListingCount ?? 0 })}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
