import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import marketplaceService from '../services/marketplaceService'
import { imgUrl } from '../services/api'

const RANK_LABELS = ['🥇', '🥈', '🥉']

export default function TopVendorsStrip() {
  const { t } = useTranslation()
  const [vendors, setVendors] = useState([])

  useEffect(() => {
    marketplaceService
      .listTopVendors(3)
      .then((rows) => setVendors(Array.isArray(rows) ? rows : []))
      .catch(() => setVendors([]))
  }, [])

  if (vendors.length === 0) return null

  return (
    <section className="mb-4 ta-top-vendors-strip" aria-labelledby="top-vendors-strip-title">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div>
          <h2 id="top-vendors-strip-title" className="h6 mb-0 fw-semibold">
            {t('discover.topVendorsStripTitle')}
          </h2>
          <p className="small text-muted mb-0">{t('discover.topVendorsStripSub')}</p>
        </div>
        <Link to="/marketplace" className="small">
          {t('discover.topVendorsStripCta')}
        </Link>
      </div>
      <div className="d-flex gap-3 overflow-auto pb-2">
        {vendors.map((v, idx) => {
          const name = v.storefrontName || v.displayName || v.handle || 'Vendor'
          const href = v.handle ? `/u/${encodeURIComponent(v.handle)}` : `/marketplace/keeper/${v.userId}`
          const ratePct = Math.round((v.contactTapRate ?? 0) * 1000) / 10
          return (
            <Link
              key={v.userId}
              to={href}
              className="card border-0 shadow-sm flex-shrink-0 text-decoration-none ta-top-vendors-strip__card"
              style={{ width: 180, color: 'inherit' }}
            >
              <div className="card-body py-2 px-3">
                <div className="small fw-bold mb-1" aria-hidden>
                  {RANK_LABELS[idx] || `#${v.rank ?? idx + 1}`}
                </div>
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
                  {t('discover.topVendorTapRate', { rate: ratePct })}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
