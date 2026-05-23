import { useEffect, useState } from 'react'
import QRCodeSvg from 'react-qr-code'
import { useTranslation } from 'react-i18next'
import {
  BRAND_LOGO_FOR_LIGHT_BG,
  downloadBrandedQrPng,
  qrCenterLogoOverlayStyles,
} from '../utils/qrBrandComposite'
import { shareOrCopyText } from '../utils/shareUtils'
import { whatsappShareUrl } from '../utils/listingShareTemplates'

function buildStorefrontShareText({ vendorName, storefrontUrl, location, t }) {
  const lines = [
    t('share.storefront.captionLead', { name: vendorName }),
    location ? t('share.storefront.captionLocation', { location }) : null,
    storefrontUrl,
    t('share.storefront.captionFooter'),
  ].filter(Boolean)
  return lines.join('\n')
}

export default function StorefrontShareKit({ vendorName, storefrontUrl, location, isFounding, onClose }) {
  const { t } = useTranslation()
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)

  const text = buildStorefrontShareText({ vendorName, storefrontUrl, location, t })

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

  const downloadQr = async () => {
    setBusy(true)
    try {
      await downloadBrandedQrPng({
        url: storefrontUrl,
        nameLine: vendorName,
        speciesLine: t('share.storefront.qrSubtitle'),
        shortIdLine: t('share.storefront.qrPoweredBy'),
        filenameBase: vendorName || 'storefront',
      })
    } catch {
      setToast(t('qrTool.pngDownloadFailed'))
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
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
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

            <div className="ta-storefront-share-modal__card mx-auto mb-3">
              <div className="ta-storefront-share-modal__qr-wrap">
                <QRCodeSvg value={storefrontUrl} size={200} level="H" />
                <img
                  src={BRAND_LOGO_FOR_LIGHT_BG}
                  alt=""
                  aria-hidden="true"
                  style={qrCenterLogoOverlayStyles(200)}
                />
              </div>
              <div className="ta-storefront-share-modal__vendor-name">{vendorName}</div>
              {location ? <div className="small text-muted">{location}</div> : null}
              <div className="small ta-storefront-share-modal__url text-break">{storefrontUrl}</div>
            </div>

            <textarea
              className="form-control form-control-sm mb-3"
              rows={5}
              value={text}
              readOnly
              onFocus={(e) => e.target.select()}
              style={{ whiteSpace: 'pre-wrap' }}
              aria-label={t('share.storefront.previewText')}
            />

            <div className="d-flex gap-2 flex-wrap justify-content-center">
              <button type="button" className="btn btn-dark btn-sm" onClick={copyText} disabled={busy}>
                {t('share.storefront.copy')}
              </button>
              <button type="button" className="btn btn-outline-success btn-sm" onClick={openWhatsapp}>
                {t('share.storefront.openWhatsapp')}
              </button>
              <button type="button" className="btn btn-warning btn-sm" onClick={downloadQr} disabled={busy}>
                {t('share.storefront.downloadQr')}
              </button>
              {typeof navigator !== 'undefined' && navigator.share && (
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={nativeShare}>
                  {t('share.storefront.nativeShare')}
                </button>
              )}
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
