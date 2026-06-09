import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { buildFullLabelPngDataUrl } from '../utils/qrBrandComposite'
import {
  buildQrLabelExtras,
  buildQrLabelLines,
  resolveEffectiveLayoutMode,
  resolveQrUrl,
} from '../utils/qrLabelOptions'

/**
 * PNG preview of the full printed label (simple, care facts, or vendor-passport).
 */
export default function QrLabelPreview({
  tarantula,
  qrTargetMode,
  careFactsOn,
  t,
  locale,
  className = '',
  layoutMode = null,
  physicalSizeId = 'medium',
  partnerLogoSrc = null,
  vendorName = null,
  verifiedOrigin = false,
  captionLine = null,
  vendorUser = null,
}) {
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
    const effectiveLayout = resolveEffectiveLayoutMode(layoutMode, careFactsOn)
    const lines = buildQrLabelLines(tarantula, qrTargetMode, t, effectiveLayout)
    const extras = buildQrLabelExtras(tarantula.species, t, locale, careFactsOn)
    const url = resolveQrUrl(tarantula, qrTargetMode, vendorUser)
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
      layoutMode: effectiveLayout,
      physicalSizeId,
      partnerLogoSrc,
      vendorName,
      verifiedOrigin,
      captionLine,
      shortIdLine: tarantula.shortId || null,
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
  }, [
    tarantula,
    qrTargetMode,
    careFactsOn,
    t,
    locale,
    layoutMode,
    physicalSizeId,
    partnerLogoSrc,
    vendorName,
    verifiedOrigin,
    captionLine,
    vendorUser,
  ])

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
