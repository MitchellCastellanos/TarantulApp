import { useState } from 'react'
import QRCodeSvg from 'react-qr-code'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { downloadBrandedQrPng } from '../utils/qrBrandComposite'

export default function QRModal({ tarantula, onClose }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const hasProFeatures = user?.hasProFeatures === true
  const url = `${window.location.origin}/t/${tarantula.shortId}`
  const [copied, setCopied] = useState(false)
  const qrName = tarantula?.name?.trim() || tarantula?.shortId || 'Sin nombre'
  const qrSpecies = tarantula?.species?.scientificName?.trim() || 'Especie no definida'

  const downloadQR = async () => {
    await downloadBrandedQrPng({
      url,
      nameLine: qrName,
      speciesLine: qrSpecies,
      shortIdLine: tarantula.shortId ? `ID: ${tarantula.shortId}` : '',
      filenameBase: qrName,
    })
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
              <QRCodeSvg
                value={url}
                size={220}
                level="H"
                imageSettings={{
                  src: '/logo-black.png?v=2',
                  height: 48,
                  width: 48,
                  excavate: true,
                }}
              />
            </div>
            <p className="fw-bold mb-0">{qrName}</p>
            <p className="text-muted small mb-1">{qrSpecies}</p>
            <p className="text-muted small">ID: {tarantula.shortId}</p>

            {!tarantula.isPublic && (
              <div className="alert alert-warning small py-2 mt-2 text-start">
                {hasProFeatures
                  ? t('tarantula.qrPrivateHelpPro')
                  : t('tarantula.qrPrivateHelpFree')}
              </div>
            )}
          </div>
          <div className="modal-footer justify-content-center gap-2 flex-wrap">
            <button type="button" className="btn btn-dark" onClick={() => downloadQR().catch(() => {})}>
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
