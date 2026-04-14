import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import StatusBadge from '../components/StatusBadge'
import TimelineItem from '../components/TimelineItem'
import FeedingModal from '../components/FeedingModal'
import MoltModal from '../components/MoltModal'
import BehaviorModal from '../components/BehaviorModal'
import QRModal from '../components/QRModal'
import PhotoGallery from '../components/PhotoGallery'
import tarantulaService from '../services/tarantulaService'
import logsService from '../services/logsService'

const HABITAT_ICON  = { terrestrial: '🌎', arboreal: '🌳', fossorial: '🕳️' }
const STAGE_LABEL   = { sling: 'Sling', juvenile: 'Juvenil', subadult: 'Subadulto', adult: 'Adulto' }
const SEX_LABEL     = { male: '♂ Macho', female: '♀ Hembra', unsexed: '? Sin determinar' }
const GROWTH_LABEL  = { slow: 'Lento', moderate: 'Moderado', fast: 'Rápido' }
const LEVEL_LABEL   = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' }
const LEVEL_COLOR   = { beginner: 'success', intermediate: 'warning', advanced: 'danger' }
const VENT_LABEL    = { low: 'Baja', moderate: 'Moderada', high: 'Alta' }

function formatDate(iso) {
  if (!iso) return '–'
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TarantulaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [tarantula, setTarantula] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // 'feeding' | 'molt' | 'behavior' | 'qr'

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
    if (!confirm('¿Eliminar este registro?')) return
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
    if (!confirm(`¿Eliminar a "${tarantula.name}"? Esta acción no se puede deshacer.`)) return
    await tarantulaService.delete(id)
    navigate('/')
  }

  if (loading) return (
    <div><Navbar /><div className="container mt-4 text-muted">Cargando...</div></div>
  )
  if (!tarantula) return (
    <div><Navbar /><div className="container mt-4 text-danger">Tarántula no encontrada.</div></div>
  )

  const { species } = tarantula

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

      <div className="container mt-4">
        {/* Breadcrumb */}
        <div className="d-flex align-items-center gap-2 mb-3">
          <button className="btn btn-link p-0 text-dark text-decoration-none" onClick={() => navigate('/')}>
            ← Colección
          </button>
          <span className="text-muted">/</span>
          <span className="fw-semibold">{tarantula.name}</span>
        </div>

        <div className="row g-4">
          {/* ─── Columna izquierda: perfil ─────────────────────────────── */}
          <div className="col-md-4">
            <div className="card border-0 shadow-sm">
              {/* Foto */}
              <div className="d-flex align-items-center justify-content-center overflow-hidden rounded-top"
                   style={{ height: 220, background: 'linear-gradient(135deg,#1a1a2e,#2d2d44)' }}>
                {tarantula.profilePhoto ? (
                  <img src={`/uploads/${tarantula.profilePhoto}`} alt={tarantula.name}
                       style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '5rem', opacity: 0.5 }}>🕷️</span>
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
                    <span className="badge bg-light text-dark border">{STAGE_LABEL[tarantula.stage]}</span>
                  )}
                  {tarantula.sex && (
                    <span className="badge bg-light text-dark border">{SEX_LABEL[tarantula.sex]}</span>
                  )}
                  {tarantula.currentSizeCm && (
                    <span className="badge bg-light text-dark border">📏 {tarantula.currentSizeCm} cm</span>
                  )}
                </div>

                <div className="small text-muted">
                  <div>📅 Compra: {formatDate(tarantula.purchaseDate)}</div>
                  <div>🍽️ Última comida: {formatDate(tarantula.lastFedAt)}</div>
                  <div>🕸️ Última muda: {formatDate(tarantula.lastMoltAt)}</div>
                </div>

                {tarantula.notes && (
                  <p className="small mt-2 border-top pt-2 mb-0">{tarantula.notes}</p>
                )}
              </div>

              <div className="card-footer bg-transparent border-top-0 d-flex gap-2 flex-wrap">
                <Link to={`/tarantulas/${id}/edit`} className="btn btn-outline-secondary btn-sm flex-fill">
                  ✏️ Editar
                </Link>
                <button className="btn btn-outline-secondary btn-sm flex-fill"
                        onClick={() => setModal('qr')}>
                  📱 QR
                </button>
                <button
                  className={`btn btn-sm flex-fill ${tarantula.isPublic ? 'btn-success' : 'btn-outline-secondary'}`}
                  onClick={handleTogglePublic}
                  title={tarantula.isPublic ? 'Perfil público — click para hacer privado' : 'Perfil privado — click para hacer público'}>
                  {tarantula.isPublic ? '🌐 Público' : '🔒 Privado'}
                </button>
                <button className="btn btn-outline-danger btn-sm flex-fill"
                        onClick={handleDelete}>
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          </div>

          {/* ─── Columna derecha: ficha especie + timeline ─────────────── */}
          <div className="col-md-8">
            {/* Ficha de especie */}
            {species && (
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <h6 className="fw-bold mb-3">📋 Ficha de especie</h6>
                  <div className="row g-2 small">
                    <div className="col-6 col-md-4">
                      <div className="text-muted">Origen</div>
                      <div className="fw-semibold">{species.originRegion ?? '–'}</div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="text-muted">Hábitat</div>
                      <div className="fw-semibold">
                        {HABITAT_ICON[species.habitatType]} {species.habitatType ?? '–'}
                      </div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="text-muted">Tamaño adulto</div>
                      <div className="fw-semibold">
                        {species.adultSizeCmMin ?? '?'}–{species.adultSizeCmMax ?? '?'} cm
                      </div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="text-muted">Crecimiento</div>
                      <div className="fw-semibold">{GROWTH_LABEL[species.growthRate] ?? '–'}</div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="text-muted">Humedad</div>
                      <div className="fw-semibold">{species.humidityMin ?? '?'}–{species.humidityMax ?? '?'}%</div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="text-muted">Ventilación</div>
                      <div className="fw-semibold">{VENT_LABEL[species.ventilation] ?? '–'}</div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="text-muted">Nivel</div>
                      <div>
                        <span className={`badge bg-${LEVEL_COLOR[species.experienceLevel] ?? 'secondary'}`}>
                          {LEVEL_LABEL[species.experienceLevel] ?? '–'}
                        </span>
                      </div>
                    </div>
                    <div className="col-md-8">
                      <div className="text-muted">Temperamento</div>
                      <div className="fw-semibold">{species.temperament ?? '–'}</div>
                    </div>
                    {species.substrateType && (
                      <div className="col-12">
                        <div className="text-muted">Sustrato</div>
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
                  </div>
                </div>
              </div>
            )}

            {/* Recomendación de terrario */}
            {terrariumRec && (
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <h6 className="fw-bold mb-2">🏠 Recomendación de terrario</h6>
                  <p className="small mb-2 text-muted">
                    Basado en tamaño actual de <strong>{tarantula.currentSizeCm} cm</strong>
                    {terrariumRec.adultSizeCmMax && ` · Adulto esperado: ${terrariumRec.adultSizeCmMax} cm`}
                  </p>
                  <div className="fw-semibold small mb-2">📐 {terrariumRec.enclosure}</div>
                  {terrariumRec.pct !== null && (
                    <div>
                      <div className="d-flex justify-content-between small text-muted mb-1">
                        <span>Crecimiento hacia adulto</span>
                        <span>{terrariumRec.pct}%</span>
                      </div>
                      <div className="progress" style={{ height: 6 }}>
                        <div className={`progress-bar ${terrariumRec.pct >= 80 ? 'bg-success' : terrariumRec.pct >= 50 ? 'bg-warning' : 'bg-info'}`}
                             style={{ width: `${terrariumRec.pct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Acciones de registro */}
            <div className="d-flex gap-2 mb-4 flex-wrap">
              <button className="btn btn-outline-primary btn-sm" onClick={() => setModal('feeding')}>
                🍽️ + Alimentación
              </button>
              <button className="btn btn-outline-purple btn-sm" style={{ color: '#6f42c1', borderColor: '#6f42c1' }}
                      onClick={() => setModal('molt')}>
                🕸️ + Muda
              </button>
              <button className="btn btn-outline-warning btn-sm" onClick={() => setModal('behavior')}>
                🔍 + Comportamiento
              </button>
            </div>

            {/* Photo gallery */}
            <PhotoGallery tarantulaId={id} />

            {/* Timeline */}
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h6 className="fw-bold mb-3">📅 Historial</h6>
                {timeline.length === 0 ? (
                  <p className="text-muted small mb-0">
                    Aún no hay eventos registrados. Empieza registrando una alimentación o muda.
                  </p>
                ) : (
                  timeline.map(event => (
                    <TimelineItem key={event.id} event={event} onDelete={handleDeleteEvent} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
