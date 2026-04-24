import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import StatusBadge from '../components/StatusBadge'
import TimelineItem from '../components/TimelineItem'
import FeedingModal from '../components/FeedingModal'
import MoltModal from '../components/MoltModal'
import BehaviorModal from '../components/BehaviorModal'
import QRModal from '../components/QRModal'
import PhotoGallery from '../components/PhotoGallery'
import FangPanel from '../components/FangPanel'
import ChitinCardFrame from '../components/ChitinCardFrame'
import SpeciesProfileCard from '../components/SpeciesProfileCard'
import ProTrialCtaLink from '../components/ProTrialCtaLink'
import tarantulaService from '../services/tarantulaService'
import logsService from '../services/logsService'
import { imgUrl } from '../services/api'
import { publicUrl } from '../utils/publicAssets.js'
import { PARCHMENT_HISTORY_PAGE_SIZE } from '../constants/parchmentHistory.js'
import { formatDateInUserZone } from '../utils/dateFormat'
import { exportTarantulaPdf } from '../services/pdfExportService'
import { computeTerrariumRecommendation } from '../utils/terrariumEstimate'

const HABITAT_ICON = { terrestrial: '🌎', arboreal: '🌳', fossorial: '🕳️' }

export default function TarantulaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const hasProFeatures = user?.hasProFeatures === true

  const [tarantula, setTarantula] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // 'feeding' | 'molt' | 'behavior' | 'qr' | 'deceased'
  const [deceasedNotes, setDeceasedNotes] = useState('')
  const [deceasedDate, setDeceasedDate] = useState(new Date().toISOString().slice(0, 10))
  const [historyPageIndex, setHistoryPageIndex] = useState(0)

  /** En plan Free sin prueba, solo las 6 más antiguas son editables; el resto viene con locked=true desde el API. */
  const mayEdit = tarantula ? !tarantula.locked : false
  const canDeleteSpider = true

  const load = useCallback((showFullPageLoading = true) => {
    if (showFullPageLoading) setLoading(true)
    Promise.all([
      tarantulaService.getById(id),
      tarantulaService.getTimeline(id),
    ]).then(([t, tl]) => {
      setTarantula(t)
      setTimeline(tl)
    }).finally(() => {
      if (showFullPageLoading) setLoading(false)
    })
  }, [id])

  useEffect(() => { load(true) }, [load])

  useEffect(() => {
    setHistoryPageIndex(0)
  }, [id])

  const historyTotalPages = Math.max(1, Math.ceil(timeline.length / PARCHMENT_HISTORY_PAGE_SIZE))
  const historyPageSafe = Math.min(historyPageIndex, historyTotalPages - 1)
  const historyPageStart = historyPageSafe * PARCHMENT_HISTORY_PAGE_SIZE
  const timelinePage = timeline.slice(historyPageStart, historyPageStart + PARCHMENT_HISTORY_PAGE_SIZE)
  const showHistoryPager = timeline.length > PARCHMENT_HISTORY_PAGE_SIZE

  useEffect(() => {
    setHistoryPageIndex(i => Math.min(i, Math.max(0, Math.ceil(timeline.length / PARCHMENT_HISTORY_PAGE_SIZE) - 1)))
  }, [timeline.length])

  const handleLogSaved = () => { setModal(null); load(false) }

  const handleDeleteEvent = async (logId, type) => {
    if (!confirm(t('tarantula.deleteEvent'))) return
    if (type === 'feeding')  await logsService.deleteFeeding(logId)
    if (type === 'molt')     await logsService.deleteMolt(logId)
    if (type === 'behavior') await logsService.deleteBehavior(logId)
    load(false)
  }

  const handleTogglePublic = async () => {
    const updated = await tarantulaService.togglePublic(id)
    setTarantula(updated)
  }

  const handleDelete = async () => {
    if (!confirm(t('tarantula.deleteConfirm', { name: tarantula.name }))) return
    await tarantulaService.delete(id)
    navigate('/')
  }

  const handleMarkDeceased = async () => {
    const updated = await tarantulaService.markDeceased(id, {
      notes: deceasedNotes || null,
      deceasedAt: deceasedDate ? new Date(deceasedDate).toISOString() : null,
    })
    setTarantula(updated)
    setModal(null)
  }

  const handleExportPdf = () => {
    exportTarantulaPdf({
      tarantula,
      species,
      timeline,
      t,
      language: i18n.language,
      i18n,
    }).catch(() => {})
  }
  const publicProfileUrl = tarantula?.shortId ? `${window.location.origin}/t/${tarantula.shortId}` : ''

  if (loading) return (
    <div><Navbar /><div className="container mt-4 text-muted">{t('tarantula.loading')}</div></div>
  )
  if (!tarantula) return (
    <div><Navbar /><div className="container mt-4 text-danger">{t('tarantula.notFound')}</div></div>
  )

  const { species } = tarantula
  const spiderPlaceholder = publicUrl('spider-default.png')
  const displayProfilePhoto = tarantula.profilePhoto
    ? imgUrl(tarantula.profilePhoto)
    : imgUrl(species?.referencePhotoUrl) || spiderPlaceholder

  // ─── Terrarium recommendation ──────────────────────────────────────────────
  const terrariumRec = computeTerrariumRecommendation(tarantula.currentSizeCm, species)

  return (
    <div>
      <Navbar />
      {modal === 'feeding'  && <FeedingModal  tarantulaId={id} onClose={() => setModal(null)} onSaved={handleLogSaved} />}
      {modal === 'molt'     && <MoltModal     tarantulaId={id} onClose={() => setModal(null)} onSaved={handleLogSaved} />}
      {modal === 'behavior' && <BehaviorModal tarantulaId={id} onClose={() => setModal(null)} onSaved={handleLogSaved} />}
      {modal === 'qr'       && <QRModal tarantula={tarantula}  onClose={() => setModal(null)} />}

      {modal === 'deceased' && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.7)' }}
             onClick={() => setModal(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('tarantula.deceasedModal')}</h5>
                <button className="btn-close" onClick={() => setModal(null)} />
              </div>
              <div className="modal-body">
                <p className="text-muted small mb-3"
                   dangerouslySetInnerHTML={{ __html: t('tarantula.deceasedDesc', { name: `<strong>${tarantula.name}</strong>` }) }} />
                <div className="mb-3">
                  <label className="form-label fw-semibold small">{t('tarantula.deceasedDate')}</label>
                  <input type="date" className="form-control"
                         value={deceasedDate}
                         onChange={e => setDeceasedDate(e.target.value)} />
                </div>
                <div className="mb-1">
                  <label className="form-label fw-semibold small">{t('tarantula.deceasedNotes')}</label>
                  <textarea className="form-control" rows={3}
                            placeholder={t('logModals.optional')}
                            value={deceasedNotes}
                            onChange={e => setDeceasedNotes(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setModal(null)}>
                  {t('common.cancel')}
                </button>
                <button className="btn btn-sm" style={{ background: 'rgba(140,90,10,0.6)', color: '#ffd9a0', border: '1px solid rgba(200,140,30,0.4)' }}
                        onClick={handleMarkDeceased}>
                  🕯️ {t('tarantula.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mt-4">
        {/* Breadcrumb */}
        <div className="d-flex align-items-center gap-2 mb-3">
          <button className="btn btn-link p-0 text-collection text-decoration-none" onClick={() => navigate('/')}>
            {t('common.back')}
          </button>
          <span className="text-collection">/</span>
          <span className="text-collection">{tarantula.name}</span>
        </div>

        <div className="row g-4">
          {/* ─── Columna izquierda: perfil ─────────────────────────────── */}
          <div className="col-md-4">
            <FangPanel>
            <div className="card border-0 shadow-sm">
              {/* Foto */}
              <div className="d-flex align-items-center justify-content-center overflow-hidden rounded-top"
                   style={{ height: 220, background: 'linear-gradient(135deg,#0c0c1e,#1a1040)' }}>
                <img
                  src={displayProfilePhoto}
                  alt={tarantula.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = spiderPlaceholder
                  }}
                />
              </div>

              <div className="card-body">
                {!mayEdit && (
                  <div className="alert alert-warning small py-2 mb-2">
                    Esta tarantula esta bloqueada por limite Free. Sigue visible, pero para editarla necesitas liberar cupo o pasar a Pro.
                    <ProTrialCtaLink className="btn btn-sm ms-2">{t('pro.upgradeNow')}</ProTrialCtaLink>
                  </div>
                )}
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h5 className="fw-bold mb-0">{tarantula.name}</h5>
                  <StatusBadge status={tarantula.status} />
                </div>

                {species && (
                  <p className="text-muted small fst-italic mb-2">
                    {HABITAT_ICON[species.habitatType]} {species.scientificName}
                    {species.commonName && ` · ${species.commonName}`}
                  </p>
                )}

                <div className="d-flex flex-wrap gap-1 mb-3">
                  {tarantula.stage && (
                    <span className="badge bg-light text-dark border">{t(`stages.${tarantula.stage}`)}</span>
                  )}
                  {tarantula.sex && (
                    <span className="badge bg-light text-dark border">{t(`sex.${tarantula.sex}`)}</span>
                  )}
                  {tarantula.currentSizeCm && (
                    <span className="badge bg-light text-dark border">📏 {tarantula.currentSizeCm} cm</span>
                  )}
                </div>

                <div className="small text-muted">
                  <div>📅 {t('tarantula.purchaseDate')}: {formatDateInUserZone(tarantula.purchaseDate, i18n.language)}</div>
                  <div>{t('tarantula.lastFed')}: {formatDateInUserZone(tarantula.lastFedAt, i18n.language)}</div>
                  <div>{t('tarantula.lastMolt')}: {formatDateInUserZone(tarantula.lastMoltAt, i18n.language)}</div>
                </div>

                {tarantula.notes && (
                  <p className="small mt-2 border-top pt-2 mb-0">{tarantula.notes}</p>
                )}
              </div>

              <div className="card-footer bg-transparent border-top-0 d-flex gap-2 flex-wrap">
                {!tarantula.deceasedAt && (
                  <>
                    {!mayEdit ? (
                      <button type="button" className="btn btn-outline-secondary btn-sm flex-fill" disabled title={t('tarantula.lockedEditHint')}>
                        ✏️ {t('common.edit')}
                      </button>
                    ) : (
                      <Link to={`/tarantulas/${id}/edit`} className="btn btn-outline-secondary btn-sm flex-fill">
                        ✏️ {t('common.edit')}
                      </Link>
                    )}
                    <button className="btn btn-outline-secondary btn-sm flex-fill"
                            onClick={() => setModal('qr')}>
                      📱 {t('tarantula.qrCode')}
                    </button>
                    <button className="btn btn-outline-secondary btn-sm flex-fill" onClick={handleExportPdf}>
                      📄 {t('share.exportPdf')}
                    </button>
                    {hasProFeatures ? (
                      <button
                        className={`btn btn-sm flex-fill ${tarantula.isPublic ? 'btn-success' : 'btn-outline-secondary'}`}
                        onClick={mayEdit ? handleTogglePublic : undefined}
                        disabled={!mayEdit}
                        title={!mayEdit ? t('tarantula.lockedEditHint') : undefined}>
                        {tarantula.isPublic ? `🌐 ${t('tarantula.publicOn')}` : `🔒 ${t('tarantula.publicOff')}`}
                      </button>
                    ) : (
                      <ProTrialCtaLink
                        className="btn btn-sm flex-fill btn-outline-secondary"
                        style={{ background: 'transparent', color: 'var(--ta-gold)', borderColor: 'var(--ta-border-gold)' }}
                        title={t('pro.publicToggleProOnlyHint')}
                      >
                        {t('pro.publicToggleProOnly')}
                      </ProTrialCtaLink>
                    )}
                    <button className="btn btn-sm flex-fill btn-outline-secondary"
                            style={{ borderColor: 'var(--ta-border-gold)', color: 'var(--ta-gold)' }}
                            onClick={() => mayEdit && setModal('deceased')}
                            disabled={!mayEdit}
                            title={!mayEdit ? t('tarantula.lockedEditHint') : undefined}>
                      {t('tarantula.markDeceased')}
                    </button>
                  </>
                )}
                <button className="btn btn-outline-danger btn-sm flex-fill"
                        onClick={canDeleteSpider ? handleDelete : undefined}
                        disabled={!canDeleteSpider}
                        title={!canDeleteSpider ? t('tarantula.lockedEditHint') : undefined}>
                  🗑️ {t('common.delete')}
                </button>
              </div>
              <div className="px-3 pb-3 text-center">
                <Link
                  to="/tools/qr?mode=bulk"
                  className="small text-decoration-none"
                  style={{ color: 'var(--ta-gold)' }}
                  title={t('dashboard.qrBulkPrintTitle')}
                >
                  {t('tarantula.qrBulkPrintLink')}
                  {!hasProFeatures && (
                    <span className="badge bg-dark ms-1 align-middle" style={{ fontSize: '0.6rem' }}>PRO</span>
                  )}
                </Link>
              </div>
            </div>
            </FangPanel>
          </div>

          {/* ─── Columna derecha: ficha especie + timeline ─────────────── */}
          <div className="col-md-8">
            {/* Banner memorial */}
            {tarantula.deceasedAt && (
              <div className="alert mb-4 ta-memorial">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span style={{ fontSize: '1.4rem' }}>🕯️</span>
                  <strong style={{ fontFamily: 'Cinzel, serif' }}>{t('tarantula.inMemoryOf')} {tarantula.name}</strong>
                </div>
                <div className="small" style={{ opacity: 0.85 }}>
                  {t('tarantula.deceasedOn')} {formatDateInUserZone(tarantula.deceasedAt, i18n.language)}.
                  {tarantula.deathNotes && <> {tarantula.deathNotes}</>}
                </div>
              </div>
            )}
            {/* Ficha de especie — marco chitin + siluetas opcionales (assets en public/) */}
            {species && (
              <ChitinCardFrame className="mb-4">
                <SpeciesProfileCard species={species} tarantula={tarantula} t={t} />
              </ChitinCardFrame>
            )}

            {/* Recomendación de terrario */}
            {terrariumRec && (
              <FangPanel className="mb-4">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="ta-section-header mb-3">
                    <span>🏠 {t('terrarium.title')}</span>
                  </div>
                  <p className="small mb-2 text-muted">
                    {t('terrarium.basedOn')} <strong>{tarantula.currentSizeCm} cm</strong>
                    {terrariumRec.adultSizeCmMax && ` · ${t('terrarium.expectedAdult')}: ${terrariumRec.adultSizeCmMax} cm`}
                  </p>
                  <div className="fw-semibold small mb-2">📐 {t(terrariumRec.enclosureI18n.key, terrariumRec.enclosureI18n.params)}</div>
                  {terrariumRec.pct !== null && (
                    <div>
                      <div className="d-flex justify-content-between small text-muted mb-1">
                        <span>{t('terrarium.growthToAdult')}</span>
                        <span>{terrariumRec.pct}%</span>
                      </div>
                      <div className="progress" style={{ height: 6 }}>
                        <div className={`progress-bar ${terrariumRec.pct >= 80 ? 'bg-success' : terrariumRec.pct >= 50 ? 'bg-warning' : 'bg-info'}`}
                             style={{ width: `${terrariumRec.pct}%` }} />
                      </div>
                    </div>
                  )}
                  <p className="text-muted mb-0 mt-2" style={{ fontSize: '0.7rem' }}>
                    {t('terrarium.estimatedNote')}
                  </p>
                </div>
              </div>
              </FangPanel>
            )}

            {/* Acciones de registro */}
            <div className="d-flex gap-2 mb-4 flex-wrap">
              <button className="btn btn-outline-primary btn-sm" onClick={() => setModal('feeding')}
                      disabled={!mayEdit} title={!mayEdit ? t('tarantula.lockedEditHint') : undefined}>
                {t('tarantula.addFeeding')}
              </button>
              <button className="btn btn-outline-purple btn-sm" style={{ color: '#6f42c1', borderColor: '#6f42c1' }}
                      onClick={() => setModal('molt')}
                      disabled={!mayEdit}
                      title={!mayEdit ? t('tarantula.lockedEditHint') : undefined}>
                {t('tarantula.addMolt')}
              </button>
              <button className="btn btn-outline-warning btn-sm" onClick={() => setModal('behavior')}
                      disabled={!mayEdit} title={!mayEdit ? t('tarantula.lockedEditHint') : undefined}>
                {t('tarantula.addBehavior')}
              </button>
            </div>

            {/* Photo gallery */}
            <PhotoGallery
              tarantulaId={id}
              readOnly={!mayEdit}
              shareMeta={{ tarantulaName: tarantula.name, speciesName: species?.scientificName, profileUrl: publicProfileUrl }}
            />

            {/* Timeline — pergamino */}
            <div className="ta-parchment-float-wrap">
            <div className="card border-0 ta-parchment-history">
              <div className="card-body ta-parchment-scroll p-0">
                <img
                  className="ta-parchment-bg-img"
                  src={publicUrl('parchment-bg.png')}
                  alt=""
                  decoding="async"
                  draggable={false}
                />
                <div className="ta-parchment-scroll-inner">
                  <header className="ta-parchment-page-title">
                    <span className="ta-parchment-page-title__icons" aria-hidden>📜</span>
                    <span className="ta-parchment-page-title__text">{t('tarantula.history')}</span>
                  </header>
                  {timeline.length === 0 ? (
                    <p className="small mb-0 ta-parchment-muted text-center">{t('tarantula.historyEmpty')}</p>
                  ) : (
                    <>
                      <div className="ta-parchment-events flex-grow-1">
                        {timelinePage.map(event => (
                          <TimelineItem
                            key={event.id}
                            event={event}
                            onDelete={mayEdit ? handleDeleteEvent : undefined}
                            shareMeta={{ tarantulaName: tarantula.name, speciesName: species?.scientificName, profileUrl: publicProfileUrl }}
                          />
                        ))}
                      </div>
                      {showHistoryPager && (
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 ta-parchment-pager mt-auto">
                          <button
                            type="button"
                            className="btn btn-sm ta-parchment-pager__btn"
                            disabled={historyPageSafe <= 0}
                            onClick={() => setHistoryPageIndex(p => Math.max(0, p - 1))}
                          >
                            {t('tarantula.historyPrev')}
                          </button>
                          <span className="small ta-parchment-muted mb-0">
                            {t('tarantula.historyPage', { current: historyPageSafe + 1, total: historyTotalPages })}
                          </span>
                          <button
                            type="button"
                            className="btn btn-sm ta-parchment-pager__btn"
                            disabled={historyPageSafe >= historyTotalPages - 1}
                            onClick={() => setHistoryPageIndex(p => Math.min(historyTotalPages - 1, p + 1))}
                          >
                            {t('tarantula.historyNext')}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
