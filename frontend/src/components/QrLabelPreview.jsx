import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { buildFullLabelPngDataUrl } from '../utils/qrBrandComposite'
import { buildQrLabelExtras, buildQrLabelLines, resolveQrUrl } from '../utils/qrLabelOptions'

/**
 * PNG preview of the full printed label (simple or care facts).
 */
export default function QrLabelPreview({ tarantula, qrTargetMode, careFactsOn, t, locale, className = '' }) {
  const { t: tUi } = useTranslation()
  const [previewUrl, setPreviewUrl] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!tarantula) {
      setPreviewUrl('')
      return undefined
    }
    let cancelled = false
    setBusy(true)
    const lines = buildQrLabelLines(tarantula, qrTargetMode, t)
    const extras = buildQrLabelExtras(tarantula.species, t, locale, careFactsOn)
    const url = resolveQrUrl(tarantula, qrTargetMode)
    if (!url) {
      setPreviewUrl('')
      setBusy(false)
      return undefined
    }
    void buildFullLabelPngDataUrl({
      url,
      nameLine: lines.titleLine1,
      speciesLine: lines.titleLine2 || '',
      factLines: extras.factLines,
    })
      .catch(() => {
        if (!cancelled) setPreviewUrl('')
        return null
      })
      .then((result) => {
        if (!cancelled && result?.dataUrl) setPreviewUrl(result.dataUrl)
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [tarantula, qrTargetMode, careFactsOn, t, locale])

  if (!tarantula) {
    return <div className={`bg-light ${className}`} style={{ minHeight: 120, minWidth: 120 }} />
  }

  if (!previewUrl) {
    return (
      <div
        className={`d-flex align-items-center justify-content-center bg-light text-muted small ${className}`}
        style={{ minHeight: 120, minWidth: 160 }}
      >
        {busy ? tUi('qr.previewLoading') : ''}
      </div>
    )
  }

  return (
    <img
      src={previewUrl}
      alt=""
      className={className}
      style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
    />
  )
}
