import { useState } from 'react'
import QRCodeSvg from 'react-qr-code'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import {
  BRAND_LOGO_FOR_LIGHT_BG,
  downloadBrandedQrPng,
  qrCenterLogoOverlayStyles,
} from '../utils/qrBrandComposite'
import { buildQrLabelLines } from '../utils/qrLabelOptions'
import { specimenPublicUrl } from '../utils/publicFrontBaseUrl'

export default function QRModal({ tarantula, onClose }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const hasProFeatures = user?.hasProFeatures === true
  const url = specimenPublicUrl(tarantula.shortId)
  const [copied, setCopied] = useState(false)
  const { titleLine1, titleLine2, filenameBase } = buildQrLabelLines(tarantula, 'specimen', t)

  const downloadQR = async () => {
    try {
      await downloadBrandedQrPng({
        url,
        nameLine: titleLine1,
        speciesLine: titleLine2,
        filenameBase,
      })
    } catch (e) {
      console.warn('downloadBrandedQrPng', e)
      window.alert(t('qrTool.pngDownloadFailed'))
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const shareLink = async () => {
    if (!navigator.share) return
    try {
      await navigator.share({
        title: t('tarantula.qrModalTitle', { name: tarantula.name }),
        text: t('qrTool.shareText'),
        url,
      })
    } catch (e) {
      if (e?.name !== 'AbortError') copyLink()
    }
  }

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{t('tarantula.qrModalTitle', { name: tarantula.name })}</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body text-center">
            <div className="d-inline-block p-3 border rounded mb-3" style={{ background: '#fff' }}>
              <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
                <QRCodeSvg value={url} size={220} level="H" />
                <img
                  src={BRAND_LOGO_FOR_LIGHT_BG}
                  alt=""
                  aria-hidden="true"
                  style={qrCenterLogoOverlayStyles(220)}
                />
              </div>
            </div>
            <p className="fw-bold mb-0">{titleLine1}</p>
            {titleLine2 ? <p className="text-muted small mb-1">{titleLine2}</p> : null}

            {!tarantula.isPublic && (
              <div className="alert alert-warning small py-2 mt-2 text-start">
                {hasProFeatures
                  ? t('tarantula.qrPrivateHelpPro')
                  : t('tarantula.qrPrivateHelpFree')}
              </div>
            )}
          </div>
          <div className="modal-footer justify-content-center gap-2 flex-wrap">
            <button type="button" className="btn btn-dark" onClick={() => downloadQR()}>
              ⬇ {t('tarantula.qrDownloadPng')}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={copyLink}>
              📋 {copied ? t('tarantula.qrCopied') : t('tarantula.qrCopyLink')}
            </button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button type="button" className="btn btn-outline-secondary" onClick={shareLink}>
                {t('tarantula.qrShare')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
