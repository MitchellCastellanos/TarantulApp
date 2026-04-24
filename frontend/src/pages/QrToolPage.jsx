import { useMemo, useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import QRCodeSvg from 'react-qr-code'
import { useTranslation } from 'react-i18next'
import PublicShell from '../components/PublicShell'
import FangPanel from '../components/FangPanel'
import ProTrialCtaLink from '../components/ProTrialCtaLink'
import { useAuth } from '../context/AuthContext'
import { usePageSeo } from '../hooks/usePageSeo'
import tarantulaService from '../services/tarantulaService'
import marketplaceService from '../services/marketplaceService'
import {
  BRAND_LOGO_FOR_LIGHT_BG,
  downloadBrandedQrPng,
  qrCenterLogoOverlayStyles,
} from '../utils/qrBrandComposite'
import {
  QR_BULK_MAX,
  buildQrBulkDocxBlob,
  cmToDocxDisplayPx,
  triggerDocxDownload,
} from '../utils/buildQrBulkDocx'

function getQrLabelParts(specimen) {
  const name = specimen?.name?.trim() || specimen?.shortId || 'Sin nombre'
  const species = specimen?.species?.scientificName?.trim() || 'Especie no definida'
  return { name, species }
}

export default function QrToolPage() {
  const { t, i18n } = useTranslation()
  const { token, user } = useAuth()
  const [searchParams] = useSearchParams()
  const svgRef = useRef(null)
  const hasProFeatures = user?.hasProFeatures === true
  const mode = searchParams.get('mode') === 'bulk' ? 'bulk' : 'single'

  const [copied, setCopied] = useState(false)
  const [collection, setCollection] = useState([])
  const [collectionLoading, setCollectionLoading] = useState(false)
  const [pickId, setPickId] = useState('')
  const [bulkSelected, setBulkSelected] = useState(() => new Set())
  const [includeDeceased, setIncludeDeceased] = useState(false)
  const [sizeCm, setSizeCm] = useState(5)
  const [busy, setBusy] = useState(false)
  const [busyKind, setBusyKind] = useState('')

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
      url: `${base}/tools/qr`,
    }
  }, [t, i18n.language])

  usePageSeo({
    title: t('qrTool.pageTitle'),
    description: t('qrTool.metaDescription'),
    imageUrl: ogImage,
    canonicalHref: origin ? `${origin}/tools/qr` : undefined,
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

  useEffect(() => {
    setBulkSelected(new Set(collection.filter((x) => !x.deceasedAt).map((x) => x.id)))
  }, [collection])

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

  const handleDownload = async () => {
    if (!parsed.ok || !selected) return
    const { name, species } = getQrLabelParts(selected)
    await downloadBrandedQrPng({
      url: parsed.href,
      nameLine: name,
      speciesLine: species,
      shortIdLine: selected.shortId ? `ID: ${selected.shortId}` : '',
      filenameBase: name,
    })
  }

  const bulkList = useMemo(() => {
    if (includeDeceased) return collection
    return collection.filter((x) => !x.deceasedAt)
  }, [collection, includeDeceased])

  const bulkSelectedList = useMemo(
    () => bulkList.filter((x) => bulkSelected.has(x.id)),
    [bulkList, bulkSelected],
  )

  const toggleBulk = (id) => {
    setBulkSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllInView = () => setBulkSelected(new Set(bulkList.map((x) => x.id)))
  const clearBulkSelection = () => setBulkSelected(new Set())

  const buildBulkItems = () =>
    bulkSelectedList.slice(0, QR_BULK_MAX).map((ta) => {
      const url = ta.shortId ? `${origin}/t/${ta.shortId}` : ''
      const name = ta.name?.trim() || ta.shortId || 'Sin nombre'
      const sci = ta.species?.scientificName?.trim() || 'Especie no definida'
      return {
        url,
        titleLine1: name,
        titleLine2: sci,
        subtitle: ta.shortId ? `ID: ${ta.shortId}` : '',
      }
    })

  const downloadBulkFixed = async () => {
    if (!bulkSelectedList.length || busy) return
    setBusy(true)
    setBusyKind('fixed')
    try {
      const blob = await buildQrBulkDocxBlob({
        items: buildBulkItems(),
        layout: 'fixed',
        sizeCm,
        docTitle: t('qrBulk.docTitle'),
        footerNote: t('qrBulk.docFooterNote'),
      })
      triggerDocxDownload(blob, `tarantulapp-qr-fixed-${sizeCm}cm.docx`)
      await marketplaceService.registerQrPrint().catch(() => {})
    } finally {
      setBusy(false)
      setBusyKind('')
    }
  }

  const downloadBulkFlex = async () => {
    if (!bulkSelectedList.length || busy) return
    setBusy(true)
    setBusyKind('flex')
    try {
      const blob = await buildQrBulkDocxBlob({
        items: buildBulkItems(),
        layout: 'flex',
        sizeCm: 2.8,
        docTitle: t('qrBulk.docTitleFlex'),
        footerNote: t('qrBulk.docFooterNoteFlex'),
      })
      triggerDocxDownload(blob, 'tarantulapp-qr-flex.docx')
      await marketplaceService.registerQrPrint().catch(() => {})
    } finally {
      setBusy(false)
      setBusyKind('')
    }
  }

  const bulkPreviewPx = cmToDocxDisplayPx(Math.min(sizeCm, 4))

  return (
    <PublicShell>
      <div className="mx-auto" style={{ maxWidth: 560 }}>
        <p className="small mb-2">
          <Link to="/discover" className="text-decoration-none" style={{ color: 'var(--ta-gold)' }}>
            ← {t('discover.navTitle')}
          </Link>
        </p>

        <h1 className="h3 fw-bold mb-2" style={{ color: 'var(--ta-parchment)' }}>
          {t('qrTool.heading')}
        </h1>
        <p className="small mb-4" style={{ color: 'var(--ta-text-muted)', maxWidth: 520 }}>
          {t('qrTool.intro')}
        </p>
        <div className="d-flex gap-2 mb-4 flex-wrap">
          <Link
            to="/tools/qr"
            className={`btn btn-sm ${mode === 'single' ? 'btn-dark' : 'btn-outline-light'}`}
          >
            {t('tarantula.qrCode')}
          </Link>
          <Link
            to="/tools/qr?mode=bulk"
            className={`btn btn-sm ${mode === 'bulk' ? 'btn-dark' : 'btn-outline-light'}`}
          >
            {t('dashboard.qrBulkPrint')}
          </Link>
        </div>

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

              {token && collection.length > 0 && mode === 'single' && (
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

              {mode === 'single' && (
                <>
              <div className="text-center mb-4">
                {parsed.ok ? (
                  <>
                    <div ref={svgRef} className="d-inline-block p-3 border rounded" style={{ borderColor: 'rgba(200,170,100,0.35)', background: '#fff' }}>
                      <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
                        <QRCodeSvg value={parsed.href} size={220} level="H" />
                        <img
                          src={BRAND_LOGO_FOR_LIGHT_BG}
                          alt=""
                          aria-hidden="true"
                          style={qrCenterLogoOverlayStyles(220)}
                        />
                      </div>
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
                </>
              )}

              {mode === 'bulk' && (
                <>
                  {!hasProFeatures && (
                    <div
                      className="mb-4 p-3 rounded"
                      style={{
                        background: 'rgba(200, 160, 60, 0.1)',
                        border: '1px solid rgba(200, 160, 60, 0.35)',
                      }}
                    >
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="badge bg-dark">PRO</span>
                        <span className="fw-semibold" style={{ color: 'var(--ta-gold)' }}>
                          {t('qrBulk.proOnlyTitle')}
                        </span>
                      </div>
                      <p className="small text-muted mb-3">{t('qrBulk.proOnlyBody')}</p>
                      <div className="d-flex flex-column flex-sm-row gap-2">
                        <Link to="/pro" className="btn btn-dark btn-sm">
                          {t('pro.learnMore')}
                        </Link>
                        <ProTrialCtaLink className="btn btn-outline-dark btn-sm" />
                      </div>
                    </div>
                  )}
                  {!token || collection.length === 0 ? null : (
                    <>
                      <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={selectAllInView}>
                          {t('qrBulk.selectAll')}
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clearBulkSelection}>
                          {t('qrBulk.selectNone')}
                        </button>
                        <div className="form-check ms-1">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="incDecQrTool"
                            checked={includeDeceased}
                            onChange={(e) => setIncludeDeceased(e.target.checked)}
                          />
                          <label className="form-check-label small" htmlFor="incDecQrTool">
                            {t('qrBulk.includeDeceased')}
                          </label>
                        </div>
                        <span className="small text-muted ms-auto">
                          {bulkSelectedList.length}/{bulkList.length} · max {QR_BULK_MAX}
                        </span>
                      </div>

                      <div className="list-group list-group-flush border rounded mb-4" style={{ maxHeight: 360, overflowY: 'auto' }}>
                        {bulkList.map((ta) => {
                          const url = ta.shortId ? `${origin}/t/${ta.shortId}` : ''
                          const on = bulkSelected.has(ta.id)
                          return (
                            <label
                              key={ta.id}
                              className={`list-group-item list-group-item-action d-flex gap-3 align-items-center py-2 ${on ? 'active' : ''}`}
                              style={{ cursor: 'pointer', ...(on ? { background: 'rgba(40,35,28,0.95)' } : {}) }}
                            >
                              <input
                                type="checkbox"
                                className="form-check-input flex-shrink-0 mt-0"
                                checked={on}
                                onChange={() => toggleBulk(ta.id)}
                                disabled={!hasProFeatures}
                              />
                              <div className="flex-shrink-0 bg-white p-1 rounded border" style={{ lineHeight: 0, opacity: hasProFeatures ? 1 : 0.35 }}>
                                <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
                                  <QRCodeSvg value={url || ' '} size={44} level="H" />
                                  <img
                                    src={BRAND_LOGO_FOR_LIGHT_BG}
                                    alt=""
                                    aria-hidden="true"
                                    style={qrCenterLogoOverlayStyles(44)}
                                  />
                                </div>
                              </div>
                              <div className="min-w-0 flex-grow-1">
                                <div className="fw-semibold text-truncate">{ta.name}</div>
                                <div className="small text-truncate" style={{ opacity: 0.85 }}>
                                  {ta.species?.scientificName || '—'}
                                  {ta.deceasedAt ? ` · ${t('qrBulk.deceasedBadge')}` : ''}
                                  {!ta.isPublic ? ` · ${t('qrBulk.privateBadge')}` : ''}
                                </div>
                              </div>
                            </label>
                          )
                        })}
                      </div>

                      <div className={`${!hasProFeatures ? 'opacity-50 pointer-events-none' : ''}`}>
                        <h6 className="fw-bold mb-2">{t('qrBulk.exportSection')}</h6>
                        <p className="small text-muted mb-3">{t('qrBulk.exportHint')}</p>

                        <div className="row g-3 mb-3">
                          <div className="col-md-6">
                            <label className="form-label small fw-semibold">{t('qrBulk.sizeLabel')}</label>
                            <select
                              className="form-select form-select-sm"
                              value={String(sizeCm)}
                              onChange={(e) => setSizeCm(Number(e.target.value))}
                            >
                              {[3, 4, 5, 6].map((n) => (
                                <option key={n} value={n}>
                                  {t('qrBulk.sizeCm', { n })}
                                </option>
                              ))}
                            </select>
                            <p className="small text-muted mt-2 mb-0">{t('qrBulk.sizeHelp')}</p>
                          </div>
                          <div className="col-md-6 d-flex flex-column align-items-center justify-content-center">
                            <span className="small text-muted mb-1">{t('qrBulk.previewApprox')}</span>
                            <div className="bg-white p-2 rounded border" style={{ lineHeight: 0 }}>
                              {bulkSelectedList[0] ? (
                                <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
                                  <QRCodeSvg
                                    value={bulkSelectedList[0].shortId ? `${origin}/t/${bulkSelectedList[0].shortId}` : ' '}
                                    size={bulkPreviewPx}
                                    level="H"
                                  />
                                  <img
                                    src={BRAND_LOGO_FOR_LIGHT_BG}
                                    alt=""
                                    aria-hidden="true"
                                    style={qrCenterLogoOverlayStyles(bulkPreviewPx)}
                                  />
                                </div>
                              ) : (
                                <div style={{ width: bulkPreviewPx, height: bulkPreviewPx }} className="bg-light" />
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="d-flex flex-column flex-sm-row gap-2 flex-wrap">
                          <button
                            type="button"
                            className="btn btn-dark"
                            disabled={!bulkSelectedList.length || busy}
                            onClick={downloadBulkFixed}
                          >
                            {busy && busyKind === 'fixed' ? t('qrBulk.generating') : t('qrBulk.downloadFixed')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-dark"
                            disabled={!bulkSelectedList.length || busy}
                            onClick={downloadBulkFlex}
                          >
                            {busy && busyKind === 'flex' ? t('qrBulk.generating') : t('qrBulk.downloadFlex')}
                          </button>
                        </div>
                        {bulkSelectedList.length > QR_BULK_MAX && (
                          <p className="small text-warning mt-2 mb-0">{t('qrBulk.trimWarning', { max: QR_BULK_MAX })}</p>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

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
