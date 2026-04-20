import { useMemo, useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import QRCode from 'react-qr-code'
import { useTranslation } from 'react-i18next'
import PublicShell from '../components/PublicShell'
import FangPanel from '../components/FangPanel'
import { useAuth } from '../context/AuthContext'
import { usePageSeo } from '../hooks/usePageSeo'
import tarantulaService from '../services/tarantulaService'

function getQrLabelParts(specimen) {
  const name = specimen?.name?.trim() || specimen?.shortId || 'Sin nombre'
  const species = specimen?.species?.scientificName?.trim() || 'Especie no definida'
  return { name, species }
}

/** PNG export: QR + nombre y especie + marca TarantulApp. */
function downloadQrPng({ svgEl, filenameBase, name, species }) {
  const svg = svgEl?.querySelector?.('svg')
  if (!svg) return

  const svgData = new XMLSerializer().serializeToString(svg)
  const canvas = document.createElement('canvas')
  const W = 320
  const H = 340
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const img = new Image()
  img.onload = () => {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
    const qrSize = 220
    const ox = (W - qrSize) / 2
    ctx.drawImage(img, ox, 16, qrSize, qrSize)

    ctx.fillStyle = '#111'
    ctx.font = 'bold 15px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(name, W / 2, 266)

    ctx.fillStyle = '#555'
    ctx.font = '12px sans-serif'
    ctx.fillText(species, W / 2, 286)

    ctx.font = '11px sans-serif'
    ctx.fillStyle = '#888'
    ctx.textAlign = 'center'
    ctx.fillText('TarantulApp', W / 2, H - 16)

    const link = document.createElement('a')
    link.download = `${filenameBase}-QR.png`.replace(/[/\\?%*:|"<>]/g, '-')
    link.href = canvas.toDataURL('image/png')
    link.click()
  }
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
}

export default function QrToolPage() {
  const { t, i18n } = useTranslation()
  const { token } = useAuth()
  const [searchParams] = useSearchParams()
  const svgRef = useRef(null)

  const [copied, setCopied] = useState(false)
  const [collection, setCollection] = useState([])
  const [collectionLoading, setCollectionLoading] = useState(false)
  const [pickId, setPickId] = useState('')

  const selected = useMemo(
    () => collection.find((x) => String(x.id) === pickId) ?? null,
    [collection, pickId],
  )

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const qrHref = selected?.shortId ? `${origin}/t/${selected.shortId}` : ''
  const parsed = useMemo(() => {
    if (!qrHref) return { ok: false, empty: true, href: '' }
    return { ok: true, empty: false, href: qrHref }
  }, [qrHref])

  const ogImage = `${origin}/icon-512.png`

  const jsonLd = useMemo(() => {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    return {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: t('qrTool.schemaName'),
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web',
      description: t('qrTool.schemaDescription'),
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      url: `${base}/herramientas/qr`,
    }
  }, [t, i18n.language])

  usePageSeo({
    title: t('qrTool.pageTitle'),
    description: t('qrTool.metaDescription'),
    imageUrl: ogImage,
    canonicalHref: origin ? `${origin}/herramientas/qr` : undefined,
    jsonLd,
    jsonLdId: 'qr-tool-jsonld',
  })

  useEffect(() => {
    if (!token) {
      setCollection([])
      setCollectionLoading(false)
      setPickId('')
      return
    }
    let cancelled = false
    setCollectionLoading(true)
    tarantulaService
      .getAll()
      .then((rows) => {
        if (!cancelled) setCollection((Array.isArray(rows) ? rows : []).filter((r) => !r.deceasedAt))
      })
      .catch(() => {
        if (!cancelled) setCollection([])
      })
      .finally(() => {
        if (!cancelled) setCollectionLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!collection.length) {
      setPickId('')
      return
    }
    const shortId = searchParams.get('shortId')
    if (shortId) {
      const found = collection.find((x) => x.shortId === shortId)
      if (found) {
        setPickId(String(found.id))
        return
      }
    }
    setPickId((prev) => {
      if (prev && collection.some((x) => String(x.id) === prev)) return prev
      return String(collection[0].id)
    })
  }, [collection, searchParams])

  const copyLink = async () => {
    if (!parsed.ok) return
    try {
      await navigator.clipboard.writeText(parsed.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const shareLink = async () => {
    if (!parsed.ok || !navigator.share) return
    try {
      await navigator.share({
        title: t('qrTool.shareTitle'),
        text: t('qrTool.shareText'),
        url: parsed.href,
      })
    } catch (e) {
      if (e?.name !== 'AbortError') copyLink()
    }
  }

  const handleDownload = () => {
    if (!parsed.ok || !selected) return
    const { name, species } = getQrLabelParts(selected)
    downloadQrPng({
      svgEl: svgRef.current,
      filenameBase: name,
      name,
      species,
    })
  }

  return (
    <PublicShell>
      <div className="mx-auto" style={{ maxWidth: 560 }}>
        <p className="small mb-2">
          <Link to="/descubrir" className="text-decoration-none" style={{ color: 'var(--ta-gold)' }}>
            ← {t('discover.navTitle')}
          </Link>
        </p>

        <h1 className="h3 fw-bold mb-2" style={{ color: 'var(--ta-parchment)' }}>
          {t('qrTool.heading')}
        </h1>
        <p className="small mb-4" style={{ color: 'var(--ta-text-muted)', maxWidth: 520 }}>
          {t('qrTool.intro')}
        </p>

        <FangPanel>
          <div className="card border-0 shadow-sm" style={{ background: 'rgba(18,16,28,0.65)' }}>
            <div className="card-body p-4">
              {!token && (
                <p className="small mb-4" style={{ color: 'var(--ta-text)' }}>
                  {t('qrTool.loginRequiredBody')}{' '}
                  <Link to="/login" className="alert-link" style={{ color: 'var(--ta-gold)' }}>
                    {t('nav.login', 'Login')}
                  </Link>
                </p>
              )}

              {token && collectionLoading && (
                <p className="small text-muted mb-4">{t('qrTool.loadingCollection')}</p>
              )}

              {token && !collectionLoading && collection.length === 0 && (
                <p className="small text-warning mb-4">{t('qrTool.emptyCollection')}</p>
              )}

              {token && collection.length > 0 && (
                <div className="mb-4">
                  <label className="form-label small fw-semibold" style={{ color: 'var(--ta-parchment)' }}>
                    {t('qrTool.pickSpecimen')}
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={pickId}
                    onChange={(e) => setPickId(e.target.value)}
                  >
                    {collection.map((tar) => (
                      <option key={tar.id} value={String(tar.id)}>
                        {tar.name}
                        {tar.species?.scientificName ? ` · ${tar.species.scientificName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="text-center mb-4">
                {parsed.ok ? (
                  <>
                    <div ref={svgRef} className="d-inline-block p-3 border rounded" style={{ borderColor: 'rgba(200,170,100,0.35)', background: '#fff' }}>
                      <QRCode value={parsed.href} size={220} />
                    </div>
                    {selected && (
                      <div className="mt-2">
                        <p className="fw-semibold mb-0" style={{ color: 'var(--ta-parchment)' }}>
                          {getQrLabelParts(selected).name}
                        </p>
                        <p className="small mb-0" style={{ color: 'var(--ta-text-muted)' }}>
                          {getQrLabelParts(selected).species}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    ref={svgRef}
                    className="d-inline-flex align-items-center justify-content-center border rounded p-5"
                    style={{
                      borderColor: 'rgba(200,170,100,0.25)',
                      background: 'rgba(0,0,0,0.25)',
                      minHeight: 268,
                      minWidth: 268,
                    }}
                  >
                    <span className="small text-muted text-center px-2">{t('qrTool.previewPlaceholder')}</span>
                  </div>
                )}
              </div>

              <div className="d-flex flex-wrap gap-2 justify-content-center">
                <button type="button" className="btn btn-dark btn-sm" disabled={!parsed.ok} onClick={handleDownload}>
                  ⬇ {t('qrTool.downloadPng')}
                </button>
                <button type="button" className="btn btn-outline-light btn-sm" disabled={!parsed.ok} onClick={copyLink}>
                  📋 {copied ? t('qrTool.copied') : t('qrTool.copyLink')}
                </button>
                {typeof navigator !== 'undefined' && navigator.share && (
                  <button type="button" className="btn btn-outline-light btn-sm" disabled={!parsed.ok} onClick={shareLink}>
                    {t('qrTool.share')}
                  </button>
                )}
              </div>

            </div>
          </div>
        </FangPanel>

        <p className="small mt-4 mb-0" style={{ color: 'var(--ta-text-muted)' }}>
          {t('qrTool.footerNote')}
        </p>
      </div>
    </PublicShell>
  )
}
