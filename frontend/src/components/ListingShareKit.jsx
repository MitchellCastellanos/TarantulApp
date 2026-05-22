import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { buildListingShareText, whatsappShareUrl } from '../utils/listingShareTemplates'
import { buildListingSharePngDataUrl } from '../utils/listingShareCard'
import { shareOrCopyText } from '../utils/shareUtils'
import { shareOrDownloadDataUrl, sanitizeFilename } from '../utils/shareOrDownloadBlob'

const CHANNELS = ['default', 'whatsapp', 'instagram']

export default function ListingShareKit({ listing, sellerName, sellerHandle, listingUrl, imageUrl, onClose }) {
  const { t } = useTranslation()
  const [channel, setChannel] = useState('default')
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)
  const [cardPreview, setCardPreview] = useState(null)
  const [cardError, setCardError] = useState(false)
  const [cardLoading, setCardLoading] = useState(false)

  const text = buildListingShareText({
    listing,
    sellerName,
    sellerHandle,
    profileUrl: listingUrl,
    t,
    channel,
  })

  useEffect(() => {
    let cancelled = false
    setCardLoading(true)
    setCardError(false)
    buildListingSharePngDataUrl({
      listing,
      imageUrl,
      sellerHandle,
      sellerName,
      profileUrl: listingUrl,
      t,
    })
      .then((dataUrl) => {
        if (!cancelled) setCardPreview(dataUrl)
      })
      .catch(() => {
        if (!cancelled) setCardError(true)
      })
      .finally(() => {
        if (!cancelled) setCardLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [listing, imageUrl, sellerHandle, sellerName, listingUrl, t])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(timer)
  }, [toast])

  const copyText = async () => {
    setBusy(true)
    try {
      const result = await shareOrCopyText(text)
      setToast(result === 'shared' ? t('share.shared') : t('share.copied'))
    } catch {
      setToast(t('share.copyFailed'))
    } finally {
      setBusy(false)
    }
  }

  const openWhatsapp = () => {
    const url = whatsappShareUrl(
      buildListingShareText({
        listing,
        sellerName,
        sellerHandle,
        profileUrl: listingUrl,
        t,
        channel: 'whatsapp',
      }),
    )
    window.open(url, '_blank', 'noopener')
  }

  const downloadCard = async () => {
    if (!cardPreview) return
    setBusy(true)
    try {
      const base = sanitizeFilename(listing?.title || 'tarantulapp-listing')
      await shareOrDownloadDataUrl(cardPreview, `${base}.png`, {
        mimeType: 'image/png',
        title: listing?.title || 'TarantulApp',
        dialogTitle: t('share.listing.dialogTitle', { defaultValue: 'Share listing' }),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="modal show d-block"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-dialog modal-dialog-centered modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{t('share.listing.title')}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label={t('common.cancel')} />
          </div>
          <div className="modal-body">
            <p className="small text-muted mb-3">{t('share.listing.blurb')}</p>

            <div className="d-flex gap-2 mb-3 flex-wrap" role="tablist" aria-label={t('share.listing.channelGroup')}>
              {CHANNELS.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={channel === key}
                  className={`btn btn-sm ${channel === key ? 'btn-dark' : 'btn-outline-secondary'}`}
                  onClick={() => setChannel(key)}
                >
                  {t(`share.listing.channel.${key}`)}
                </button>
              ))}
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <label className="small fw-semibold mb-1 d-block">{t('share.listing.previewText')}</label>
                <textarea
                  className="form-control form-control-sm"
                  rows={10}
                  value={text}
                  readOnly
                  onFocus={(e) => e.target.select()}
                  style={{ whiteSpace: 'pre-wrap' }}
                />
                <div className="d-flex gap-2 mt-2 flex-wrap">
                  <button type="button" className="btn btn-dark btn-sm" onClick={copyText} disabled={busy}>
                    {t('share.listing.copy')}
                  </button>
                  <button type="button" className="btn btn-outline-success btn-sm" onClick={openWhatsapp}>
                    {t('share.listing.openWhatsapp')}
                  </button>
                </div>
              </div>

              <div className="col-md-6">
                <label className="small fw-semibold mb-1 d-block">{t('share.listing.previewCard')}</label>
                <div
                  className="rounded-2 border d-flex align-items-center justify-content-center"
                  style={{ aspectRatio: '1 / 1', background: 'rgba(0,0,0,0.05)', overflow: 'hidden' }}
                >
                  {cardLoading && <span className="small text-muted">{t('common.loading')}</span>}
                  {!cardLoading && cardError && (
                    <span className="small text-muted text-center px-3">{t('share.listing.cardError')}</span>
                  )}
                  {!cardLoading && !cardError && cardPreview && (
                    <img src={cardPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-dark btn-sm mt-2 w-100"
                  onClick={downloadCard}
                  disabled={busy || cardLoading || cardError || !cardPreview}
                >
                  {t('share.listing.download')}
                </button>
                <p className="small text-muted mt-2 mb-0">{t('share.listing.cardHint')}</p>
              </div>
            </div>

            {toast && <div className="alert alert-success small py-2 mt-3 mb-0">{toast}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-light btn-sm" onClick={onClose}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
