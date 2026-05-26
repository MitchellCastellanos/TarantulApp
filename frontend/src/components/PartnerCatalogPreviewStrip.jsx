import { Link } from 'react-router-dom'
import { decodeListingTitle, partnerListingImageUrl } from '../utils/listingDisplay'
import { formatListingPrice } from '../utils/formatPrice'
import { publicUrl } from '../utils/publicAssets'

const SPIDER_PH = publicUrl('spider-default.png')

export default function PartnerCatalogPreviewStrip({ items, t }) {
  if (!items?.length) return null
  return (
    <div className="ta-discover-sellers-strip__previews mt-2" aria-label={t('marketplace.verifiedVendorsStripPreviewAria')}>
      <div className="small text-muted mb-1" style={{ fontSize: '0.62rem' }}>
        {t('marketplace.verifiedVendorsStripPreviewLabel')}
      </div>
      <div className="d-flex gap-1">
        {items.map((item) => {
          const thumb = partnerListingImageUrl(item.imageUrl) || SPIDER_PH
          const price = formatListingPrice(item.priceAmount, item.currency, t)
          return (
            <div key={item.id} className="ta-discover-sellers-strip__preview flex-grow-1 min-w-0">
              <Link
                to={`/marketplace/listing/${item.id}`}
                className="d-block text-decoration-none"
                title={decodeListingTitle(item.title)}
              >
                <div
                  className="rounded overflow-hidden mb-1"
                  style={{ height: 52, background: 'var(--ta-bg-panel)' }}
                >
                  <img
                    src={thumb}
                    alt=""
                    className="w-100 h-100"
                    style={{ objectFit: 'cover' }}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = SPIDER_PH
                    }}
                  />
                </div>
                <div
                  className="small text-truncate fw-semibold"
                  style={{ fontSize: '0.62rem', color: 'var(--ta-parchment)' }}
                >
                  {decodeListingTitle(item.title)}
                </div>
                <div className="small" style={{ fontSize: '0.62rem', color: 'var(--ta-gold)' }}>
                  {price}
                </div>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
