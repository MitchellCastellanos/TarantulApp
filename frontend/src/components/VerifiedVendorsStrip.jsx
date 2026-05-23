import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import marketplaceService from '../services/marketplaceService'

export default function VerifiedVendorsStrip() {
  const { t } = useTranslation()
  const [vendors, setVendors] = useState([])

  useEffect(() => {
    marketplaceService
      .listVerifiedVendors(12)
      .then((rows) => setVendors(Array.isArray(rows) ? rows : []))
      .catch(() => setVendors([]))
  }, [])

  if (vendors.length === 0) return null

  return (
    <section className="mb-4" aria-labelledby="verified-vendors-strip-title">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h2 id="verified-vendors-strip-title" className="h6 mb-0 fw-semibold">
          {t('marketplace.verifiedVendorsStripTitle')}
        </h2>
        <Link to="/marketplace?verifiedOnly=1" className="small">
          {t('marketplace.verifiedVendorsStripSeeAll')}
        </Link>
      </div>
      <div className="d-flex gap-3 overflow-auto pb-2">
        {vendors.map((v) => {
          const name = v.storefrontName || v.displayName || v.handle || 'Vendor'
          const href = v.handle ? `/u/${encodeURIComponent(v.handle)}` : `/marketplace/keeper/${v.userId}`
          return (
            <Link
              key={v.userId}
              to={href}
              className="card border-0 shadow-sm flex-shrink-0 text-decoration-none"
              style={{ width: 160, color: 'inherit' }}
            >
              <div className="card-body py-2 px-3">
                {v.profilePhoto ? (
                  <img
                    src={v.profilePhoto}
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
