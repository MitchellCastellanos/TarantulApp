import { useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

export default function QRModal({ tarantula, onClose }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const hasProFeatures = user?.hasProFeatures === true
  const svgRef = useRef(null)
  const url = `${window.location.origin}/t/${tarantula.shortId}`
  const [copied, setCopied] = useState(false)
  const qrName = tarantula?.name?.trim() || tarantula?.shortId || 'Sin nombre'
  const qrSpecies = tarantula?.species?.scientificName?.trim() || 'Especie no definida'

  const downloadQR = () => {
    const svg = svgRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 300
    canvas.height = 360
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 300, 360)
      ctx.drawImage(img, 25, 10, 250, 250)
      ctx.fillStyle = '#111'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(qrName, 150, 285)
      ctx.font = '12px sans-serif'
      ctx.fillStyle = '#555'
      ctx.fillText(qrSpecies, 150, 305)
      ctx.fillText(tarantula.shortId, 150, 325)
      ctx.fillStyle = '#888'
      ctx.font = '11px sans-serif'
      ctx.fillText('TarantulApp', 150, 348)

      const link = document.createElement('a')
      link.download = `${qrName}-QR.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
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
      <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{t('tarantula.qrModalTitle', { name: tarantula.name })}</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body text-center">
            <div ref={svgRef} className="d-inline-block p-3 border rounded mb-3">
              <QRCode value={url} size={220} />
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
            <button className="btn btn-dark" onClick={downloadQR}>
              ⬇ {t('tarantula.qrDownloadPng')}
            </button>
            <button className="btn btn-outline-secondary" onClick={copyLink}>
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
