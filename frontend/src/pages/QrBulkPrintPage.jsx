import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import ChitinCardFrame from '../components/ChitinCardFrame'
import ProTrialCtaLink from '../components/ProTrialCtaLink'
import tarantulaService from '../services/tarantulaService'
import { useAuth } from '../context/AuthContext'
import QRCode from 'react-qr-code'
import {
  QR_BULK_MAX,
  buildQrBulkDocxBlob,
  cmToDocxDisplayPx,
  triggerDocxDownload,
} from '../utils/buildQrBulkDocx.js'
import marketplaceService from '../services/marketplaceService'

function specimenQrUrl(shortId) {
  if (!shortId || typeof window === 'undefined') return ''
  return `${window.location.origin}/t/${shortId}`
}

export default function QrBulkPrintPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const hasProFeatures = user?.hasProFeatures === true

  const [tarantulas, setTarantulas] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(() => new Set())
  const [includeDeceased, setIncludeDeceased] = useState(false)
  const [sizeCm, setSizeCm] = useState(5)
  const [busy, setBusy] = useState(false)
  const [busyKind, setBusyKind] = useState('')

  useEffect(() => {
    tarantulaService
      .getAll()
      .then((list) => {
        setTarantulas(Array.isArray(list) ? list : [])
        const alive = (Array.isArray(list) ? list : []).filter((x) => !x.deceasedAt)
        setSelected(new Set(alive.map((x) => x.id)))
      })
      .catch(() => setTarantulas([]))
      .finally(() => setLoading(false))
  }, [])

  const list = useMemo(() => {
    if (includeDeceased) return tarantulas
    return tarantulas.filter((x) => !x.deceasedAt)
  }, [tarantulas, includeDeceased])

  const selectedList = useMemo(
    () => list.filter((x) => selected.has(x.id)),
    [list, selected],
  )

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllInView = () => setSelected(new Set(list.map((x) => x.id)))
  const clearSelection = () => setSelected(new Set())

  const buildItems = () =>
    selectedList.slice(0, QR_BULK_MAX).map((ta) => {
      const url = specimenQrUrl(ta.shortId)
      const name = ta.name?.trim() || ta.shortId || 'Sin nombre'
      const sci = ta.species?.scientificName?.trim() || 'Especie no definida'
      return {
        url,
        titleLine1: name,
        titleLine2: sci,
        subtitle: ta.shortId ? `ID: ${ta.shortId}` : '',
      }
    })

  const downloadFixed = async () => {
    if (!selectedList.length || busy) return
    setBusy(true)
    setBusyKind('fixed')
    try {
      const blob = await buildQrBulkDocxBlob({
        items: buildItems(),
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

  const downloadFlex = async () => {
    if (!selectedList.length || busy) return
    setBusy(true)
    setBusyKind('flex')
    try {
      const blob = await buildQrBulkDocxBlob({
        items: buildItems(),
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

  const previewPx = cmToDocxDisplayPx(Math.min(sizeCm, 4))

  return (
    <div>
      <Navbar />
      <div className="container mt-4" style={{ maxWidth: 720 }}>
        <ChitinCardFrame showSilhouettes={false}>
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
            <div>
              <h4 className="fw-bold mb-1">📄 {t('qrBulk.pageTitle')}</h4>
              <p className="text-muted small mb-0">{t('qrBulk.pageSubtitle')}</p>
            </div>
            <Link to="/" className="btn btn-sm btn-outline-secondary">
              {t('qrBulk.backCollection')}
            </Link>
          </div>

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

          {loading ? (
            <p className="text-muted small">{t('tarantula.loading')}</p>
          ) : list.length === 0 ? (
            <p className="text-muted">{t('qrBulk.empty')}</p>
          ) : (
            <>
              <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={selectAllInView}>
                  {t('qrBulk.selectAll')}
                </button>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clearSelection}>
                  {t('qrBulk.selectNone')}
                </button>
                <div className="form-check ms-1">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="incDec"
                    checked={includeDeceased}
                    onChange={(e) => setIncludeDeceased(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="incDec">
                    {t('qrBulk.includeDeceased')}
                  </label>
                </div>
                <span className="small text-muted ms-auto">
                  {selectedList.length}/{list.length} · max {QR_BULK_MAX}
                </span>
              </div>

              <div className="list-group list-group-flush border rounded mb-4" style={{ maxHeight: 360, overflowY: 'auto' }}>
                {list.map((ta) => {
                  const url = specimenQrUrl(ta.shortId)
                  const on = selected.has(ta.id)
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
                        onChange={() => toggle(ta.id)}
                        disabled={!hasProFeatures}
                      />
                      <div className="flex-shrink-0 bg-white p-1 rounded border" style={{ lineHeight: 0, opacity: hasProFeatures ? 1 : 0.35 }}>
                        <QRCode value={url || ' '} size={44} />
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
                      {selectedList[0] ? (
                        <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
                          <QRCode
                            value={specimenQrUrl(selectedList[0].shortId) || ' '}
                            size={previewPx}
                            level="H"
                          />
                          <img
                            src="/logo-black.png?v=2"
                            alt=""
                            aria-hidden="true"
                            style={{
                              position: 'absolute',
                              top: '50%', left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: Math.round(previewPx * 0.2),
                              height: Math.round(previewPx * 0.2),
                              objectFit: 'contain',
                              borderRadius: '50%',
                              background: '#fff',
                              padding: 2,
                              boxShadow: '0 0 0 2px #fff',
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{ width: previewPx, height: previewPx }} className="bg-light" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="d-flex flex-column flex-sm-row gap-2 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-dark"
                    disabled={!selectedList.length || busy}
                    onClick={downloadFixed}
                  >
                    {busy && busyKind === 'fixed' ? t('qrBulk.generating') : t('qrBulk.downloadFixed')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    disabled={!selectedList.length || busy}
                    onClick={downloadFlex}
                  >
                    {busy && busyKind === 'flex' ? t('qrBulk.generating') : t('qrBulk.downloadFlex')}
                  </button>
                </div>
                {selectedList.length > QR_BULK_MAX && (
                  <p className="small text-warning mt-2 mb-0">{t('qrBulk.trimWarning', { max: QR_BULK_MAX })}</p>
                )}
              </div>
            </>
          )}
        </ChitinCardFrame>
      </div>
    </div>
  )
}
