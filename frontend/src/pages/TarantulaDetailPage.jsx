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
import tarantulaService from '../services/tarantulaService'
import logsService from '../services/logsService'
import { imgUrl } from '../services/api'

const HABITAT_ICON = { terrestrial: '🌎', arboreal: '🌳', fossorial: '🕳️' }
const LEVEL_COLOR  = { beginner: 'success', intermediate: 'warning', advanced: 'danger' }

function formatDate(iso) {
  if (!iso) return '–'
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TarantulaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  const isPro = user?.plan === 'PRO'

  const [tarantula, setTarantula] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // 'feeding' | 'molt' | 'behavior' | 'qr' | 'deceased'
  const [deceasedNotes, setDeceasedNotes] = useState('')
  const [deceasedDate, setDeceasedDate] = useState(new Date().toISOString().slice(0, 10))

  const load = useCallback(() => {
    Promise.all([
      tarantulaService.getById(id),
      tarantulaService.getTimeline(id),
    ]).then(([t, tl]) => {
      setTarantula(t)
      setTimeline(tl)
    }).finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  const handleLogSaved = () => { setModal(null); load() }

  const handleDeleteEvent = async (logId, type) => {
    if (!confirm(t('tarantula.deleteEvent'))) return
    if (type === 'feeding')  await logsService.deleteFeeding(logId)
    if (type === 'molt')     await logsService.deleteMolt(logId)
    if (type === 'behavior') await logsService.deleteBehavior(logId)
    load()
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

  if (loading) return (
    <div><Navbar /><div className="container mt-4 text-muted">{t('tarantula.loading')}</div></div>
  )
  if (!tarantula) return (
    <div><Navbar /><div className="container mt-4 text-danger">{t('tarantula.notFound')}</div></div>
  )

  const { species } = tarantula
  const displayProfilePhoto = tarantula.profilePhoto
    ? imgUrl(tarantula.profilePhoto)
    : (species?.referencePhotoUrl ?? null)

  // ─── Terrarium recommendation ──────────────────────────────────────────────
  const terrariumRec = (() => {
    if (!tarantula.currentSizeCm || !species) return null
    const body = Number(tarantula.currentSizeCm)
    const legSpan = body * 2        // rough estimate: leg span ≈ 2× body length
    const { habitatType, adultSizeCmMax } = species

    let enclosure
    if (habitatType === 'arboreal') {
      const w = Math.ceil(legSpan * 1.5)
      const h = Math.ceil(legSpan * 3)
      enclosure = `${w} × ${w} × ${h} cm (ancho × prof × alto)`
    } else if (habitatType === 'fossorial') {
      const floor = Math.ceil(legSpan * 2)
      const substrate = Math.ceil(body * 3)
      enclosure = `${floor} × ${floor} cm piso, ${substrate} cm de sustrato`
    } else {
      // terrestrial (default)
      const floor = Math.ceil(legSpan * 2.5)
      const height = Math.ceil(legSpan * 1.2)
      enclosure = `${floor} × ${floor} × ${height} cm (largo × ancho × alto)`
    }

    const pct = adultSizeCmMax
      ? Math.min(100, Math.round((body / Number(adultSizeCmMax)) * 100))
      : null

    return { enclosure, pct, adultSizeCmMax }
  })()

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
                            placeholder="..."
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
                {displayProfilePhoto ? (
                  <img src={displayProfilePhoto} alt={tarantula.name}
                       style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <img src="/spider-default.svg" alt="spider"
                       style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>

              <div className="card-body">
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
                  <div>📅 {t('tarantula.purchaseDate')}: {formatDate(tarantula.purchaseDate)}</div>
                  <div>{t('tarantula.lastFed')}: {formatDate(tarantula.lastFedAt)}</div>
                  <div>{t('tarantula.lastMolt')}: {formatDate(tarantula.lastMoltAt)}</div>
                </div>

                {tarantula.notes && (
                  <p className="small mt-2 border-top pt-2 mb-0">{tarantula.notes}</p>
                )}
              </div>

              <div className="card-footer bg-transparent border-top-0 d-flex gap-2 flex-wrap">
                {!tarantula.deceasedAt && (
                  <>
                    <Link to={`/tarantulas/${id}/edit`} className="btn btn-outline-secondary btn-sm flex-fill">
                      ✏️ {t('common.edit')}
                    </Link>
                    <button className="btn btn-outline-secondary btn-sm flex-fill"
                            onClick={() => setModal('qr')}>
                      📱 {t('tarantula.qrCode')}
                    </button>
                    {isPro ? (
                      <button
                        className={`btn btn-sm flex-fill ${tarantula.isPublic ? 'btn-success' : 'btn-outline-secondary'}`}
                        onClick={handleTogglePublic}>
                        {tarantula.isPublic ? `🌐 ${t('tarantula.publicOn')}` : `🔒 ${t('tarantula.publicOff')}`}
                      </button>
                    ) : (
                      <Link to="/pro"
                        className="btn btn-sm flex-fill btn-outline-secondary"
                        title={t('pro.publicToggleProOnlyHint')}>
                        {t('pro.publicToggleProOnly')}
                      </Link>
                    )}
                    <button className="btn btn-sm flex-fill btn-outline-secondary"
                            style={{ borderColor: 'rgba(180,120,30,0.4)', color: 'rgba(201,168,76,0.7)' }}
                            onClick={() => setModal('deceased')}>
                      {t('tarantula.markDeceased')}
                    </button>
                  </>
                )}
                <button className="btn btn-outline-danger btn-sm flex-fill"
                        onClick={handleDelete}>
                  🗑️ Eliminar
                </button>
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
                  {t('tarantula.deceasedOn')} {formatDate(tarantula.deceasedAt)}.
                  {tarantula.deathNotes && <> {tarantula.deathNotes}</>}
                </div>
              </div>
            )}
            {/* Ficha de especie */}
            {species && (
              <FangPanel className="mb-4">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  {/* Header: title + source badge */}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold mb-0">{t('species.cardTitle')}</h6>
                    {species.dataSource === 'gbif' && (
                      <span className="badge" style={{ background: 'rgba(20,80,180,0.6)', fontSize: '0.65rem' }}
                            title={t('species.estimatedNoteGbif')}>
                        🌍 GBIF
                      </span>
                    )}
                    {species.dataSource === 'wsc' && (
                      <span className="badge" style={{ background: 'rgba(80,20,140,0.7)', fontSize: '0.65rem' }}
                            title={t('species.estimatedNoteWsc')}>
                        🕷️ WSC
                      </span>
                    )}
                    {species.dataSource === 'seed' && (
                      <span className="badge bg-secondary" style={{ fontSize: '0.65rem' }}>
                        📚 {t('species.catalog')}
                      </span>
                    )}
                  </div>

                  {/* Reference photo from iNaturalist (only shown when no own photo) */}
                  {species.referencePhotoUrl && !tarantula.profilePhoto && (
                    <div className="mb-3 text-center position-relative">
                      <img src={species.referencePhotoUrl} alt={species.scientificName}
                           style={{ maxHeight: 180, borderRadius: 8, objectFit: 'cover', width: '100%' }} />
                      <div className="text-muted" style={{ fontSize: '0.65rem', marginTop: 2 }}>
                        {t('species.refPhoto')}
                      </div>
                    </div>
                  )}

                  <div className="row g-2 small">
                    <div className="col-6 col-md-4">
                      <div className="text-muted">{t('species.origin')}</div>
                      <div className="fw-semibold">{species.originRegion ?? t('common.unknown')}</div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="text-muted">{t('species.habitat')}</div>
                      <div className="fw-semibold">
                        {HABITAT_ICON[species.habitatType]} {species.habitatType ? t(`habitat.${species.habitatType}`) : t('common.unknown')}
                      </div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="text-muted">{t('species.adultSize')} *</div>
                      <div className="fw-semibold">
                        {species.adultSizeCmMin ?? '?'}–{species.adultSizeCmMax ?? '?'} cm
                      </div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="text-muted">{t('species.growth')} *</div>
                      <div className="fw-semibold">{species.growthRate ? t(`species.growth${species.growthRate.charAt(0).toUpperCase() + species.growthRate.slice(1)}`) : t('common.unknown')}</div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="text-muted">{t('species.humidity')} *</div>
                      <div className="fw-semibold">{species.humidityMin ?? '?'}–{species.humidityMax ?? '?'}%</div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="text-muted">{t('species.ventilation')} *</div>
                      <div className="fw-semibold">{species.ventilation ? t(`species.vent${species.ventilation.charAt(0).toUpperCase() + species.ventilation.slice(1)}`) : t('common.unknown')}</div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="text-muted">{t('species.level')} *</div>
                      <div>
                        <span className={`badge bg-${LEVEL_COLOR[species.experienceLevel] ?? 'secondary'}`}>
                          {species.experienceLevel ? t(`species.level${species.experienceLevel.charAt(0).toUpperCase() + species.experienceLevel.slice(1)}`) : t('common.unknown')}
                        </span>
                      </div>
                    </div>
                    <div className="col-md-8">
                      <div className="text-muted">{t('species.temperament')} *</div>
                      <div className="fw-semibold">{species.temperament ?? t('common.unknown')}</div>
                    </div>
                    {species.substrateType && (
                      <div className="col-12">
                        <div className="text-muted">{t('species.substrate')} *</div>
                        <div className="fw-semibold">{species.substrateType}</div>
                      </div>
                    )}
                    {species.careNotes && (
                      <div className="col-12 mt-1">
                        <div className="alert alert-light small py-2 mb-0 border-start border-4 border-dark">
                          {species.careNotes}
                        </div>
                      </div>
                    )}
                    {/* Disclaimer for estimated care fields */}
                    <div className="col-12 mt-2">
                      <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>
                        {t('species.estimatedNote')}
                        {(species.dataSource === 'gbif' || species.dataSource === 'seed') && t('species.estimatedNoteGbif')}
                        {species.dataSource === 'wsc' && t('species.estimatedNoteWsc')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              </FangPanel>
            )}

            {/* Recomendación de terrario */}
            {terrariumRec && (
              <FangPanel className="mb-4">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <h6 className="fw-bold mb-2">{t('terrarium.title')}</h6>
                  <p className="small mb-2 text-muted">
                    {t('terrarium.basedOn')} <strong>{tarantula.currentSizeCm} cm</strong>
                    {terrariumRec.adultSizeCmMax && ` · ${t('terrarium.expectedAdult')}: ${terrariumRec.adultSizeCmMax} cm`}
                  </p>
                  <div className="fw-semibold small mb-2">📐 {terrariumRec.enclosure}</div>
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
              <button className="btn btn-outline-primary btn-sm" onClick={() => setModal('feeding')}>
                {t('tarantula.addFeeding')}
              </button>
              <button className="btn btn-outline-purple btn-sm" style={{ color: '#6f42c1', borderColor: '#6f42c1' }}
                      onClick={() => setModal('molt')}>
                {t('tarantula.addMolt')}
              </button>
              <button className="btn btn-outline-warning btn-sm" onClick={() => setModal('behavior')}>
                {t('tarantula.addBehavior')}
              </button>
            </div>

            {/* Photo gallery */}
            <PhotoGallery tarantulaId={id} />

            {/* Timeline */}
            <FangPanel>
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h6 className="fw-bold mb-3">{t('tarantula.history')}</h6>
                {timeline.length === 0 ? (
                  <p className="text-muted small mb-0">{t('tarantula.historyEmpty')}</p>
                ) : (
                  timeline.map(event => (
                    <TimelineItem key={event.id} event={event} onDelete={handleDeleteEvent} />
                  ))
                )}
              </div>
            </div>
            </FangPanel>
          </div>
        </div>
      </div>
    </div>
  )
}
