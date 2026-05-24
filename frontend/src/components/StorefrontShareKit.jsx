import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { buildStorefrontSharePngDataUrl } from '../utils/storefrontShareCard'
import { shareOrCopyText } from '../utils/shareUtils'
import { whatsappShareUrl } from '../utils/listingShareTemplates'
import { shareOrDownloadDataUrl, sanitizeFilename } from '../utils/shareOrDownloadBlob'

function buildStorefrontShareText({ vendorName, storefrontUrl, location, t }) {
  const lines = [
    t('share.storefront.captionLead', { name: vendorName }),
    location ? t('share.storefront.captionLocation', { location }) : null,
    storefrontUrl,
    t('share.storefront.captionFooter'),
  ].filter(Boolean)
  return lines.join('\n')
}

export default function StorefrontShareKit({
  vendorName,
  storefrontUrl,
  location,
  vendorNote,
  catalogTotal,
  imageUrl,
  isFounding,
  onClose,
}) {
  const { t } = useTranslation()
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)
  const [cardPreview, setCardPreview] = useState(null)
  const [cardError, setCardError] = useState(false)
  const [cardLoading, setCardLoading] = useState(false)

  const text = buildStorefrontShareText({ vendorName, storefrontUrl, location, t })

  useEffect(() => {
    let cancelled = false
    setCardLoading(true)
    setCardError(false)
    buildStorefrontSharePngDataUrl({
      vendorName,
      location,
      vendorNote,
      catalogTotal,
      imageUrl,
      storefrontUrl,
      isFounding,
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
  }, [vendorName, location, vendorNote, catalogTotal, imageUrl, storefrontUrl, isFounding, t])

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
    window.open(whatsappShareUrl(text), '_blank', 'noopener')
  }

  const downloadCard = async () => {
    if (!cardPreview) return
    setBusy(true)
    try {
      const base = sanitizeFilename(vendorName || 'tarantulapp-storefront')
      await shareOrDownloadDataUrl(cardPreview, `${base}.png`, {
        mimeType: 'image/png',
        title: vendorName || 'TarantulApp',
        dialogTitle: t('share.storefront.dialogTitle', { defaultValue: 'Share storefront' }),
      })
    } finally {
      setBusy(false)
    }
  }

  const nativeShare = async () => {
    if (!navigator.share) {
      await copyText()
      return
    }
    try {
      await navigator.share({
        title: t('share.storefront.title', { name: vendorName }),
        text,
        url: storefrontUrl,
      })
    } catch (e) {
      if (e?.name !== 'AbortError') await copyText()
    }
  }

  return (
    <div
      className="modal show d-block ta-storefront-share-modal"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="storefront-share-title"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-content ta-storefront-share-modal__content${isFounding ? ' ta-storefront-share-modal__content--founding' : ''}`}>
          <div className="modal-header border-0 pb-0">
            <div>
              <p className="small text-uppercase fw-bold mb-1 ta-storefront-share-modal__eyebrow">
                {t('share.storefront.eyebrow')}
              </p>
              <h5 className="modal-title fw-bold mb-0" id="storefront-share-title">
                {t('share.storefront.title', { name: vendorName })}
              </h5>
            </div>
            <button type="button" className="btn-close" onClick={onClose} aria-label={t('common.cancel')} />
          </div>
          <div className="modal-body pt-3">
            <p className="small text-muted mb-3">{t('share.storefront.blurb')}</p>

            <div className="row g-3">
              <div className="col-md-6">
                <label className="small fw-semibold mb-1 d-block">{t('share.storefront.previewText')}</label>
                <textarea
                  className="form-control form-control-sm"
                  rows={10}
                  value={text}
                  readOnly
                  onFocus={(e) => e.target.select()}
                  style={{ whiteSpace: 'pre-wrap' }}
                  aria-label={t('share.storefront.previewText')}
                />
                <div className="d-flex gap-2 mt-2 flex-wrap">
                  <button type="button" className="btn btn-dark btn-sm" onClick={copyText} disabled={busy}>
                    {t('share.storefront.copy')}
                  </button>
                  <button type="button" className="btn btn-outline-success btn-sm" onClick={openWhatsapp}>
                    {t('share.storefront.openWhatsapp')}
                  </button>
                  {typeof navigator !== 'undefined' && navigator.share && (
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={nativeShare}>
                      {t('share.storefront.nativeShare')}
                    </button>
                  )}
                </div>
              </div>

              <div className="col-md-6">
                <label className="small fw-semibold mb-1 d-block">{t('share.storefront.previewCard')}</label>
                <div
                  className="rounded-2 border d-flex align-items-center justify-content-center"
                  style={{ aspectRatio: '1 / 1', background: 'rgba(0,0,0,0.05)', overflow: 'hidden' }}
                >
                  {cardLoading && <span className="small text-muted">{t('common.loading')}</span>}
                  {!cardLoading && cardError && (
                    <span className="small text-muted text-center px-3">{t('share.storefront.cardError')}</span>
                  )}
                  {!cardLoading && !cardError && cardPreview && (
                    <img src={cardPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <button
                  type="button"
                  className={`btn btn-sm mt-2 w-100${isFounding ? ' btn-warning' : ' btn-dark'}`}
                  onClick={downloadCard}
                  disabled={busy || cardLoading || cardError || !cardPreview}
                >
                  {t('share.storefront.download')}
                </button>
                <p className="small text-muted mt-2 mb-0">{t('share.storefront.cardHint')}</p>
              </div>
            </div>

            {toast && <div className="alert alert-success small py-2 mt-3 mb-0">{toast}</div>}
          </div>
          <div className="modal-footer border-0 pt-0">
            <button type="button" className="btn btn-light btn-sm" onClick={onClose}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
