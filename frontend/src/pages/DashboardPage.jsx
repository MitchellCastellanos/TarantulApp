import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import TarantulaCard from '../components/TarantulaCard'
import RemindersPanel from '../components/RemindersPanel'
import tarantulaService from '../services/tarantulaService'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

const HABITAT_FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'terrestrial', label: '🌎 Terrestres' },
  { key: 'arboreal', label: '🌳 Arbóreas' },
  { key: 'fossorial', label: '🕳️ Fosoriales' },
]
const STAGE_FILTERS = [
  { key: '', label: 'Etapa' },
  { key: 'sling', label: 'Sling' },
  { key: 'juvenile', label: 'Juvenil' },
  { key: 'subadult', label: 'Subadulto' },
  { key: 'adult', label: 'Adulto' },
]
const STATUS_FILTERS = [
  { key: '', label: 'Estado' },
  { key: 'active', label: '✅ Activas' },
  { key: 'pre_molt', label: '🌙 Pre-muda' },
  { key: 'pending_feeding', label: '🍽️ Sin comer' },
]

export default function DashboardPage() {
  const [tarantulas, setTarantulas] = useState([])
  const [loading, setLoading] = useState(true)
  const [habitat, setHabitat] = useState('all')
  const [stage, setStage] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    tarantulaService.getAll()
      .then(setTarantulas)
      .finally(() => setLoading(false))
  }, [])

  const alive    = tarantulas.filter(t => !t.deceasedAt)
  const deceased = tarantulas.filter(t =>  t.deceasedAt)

  const filtered = alive.filter(t => {
    if (habitat !== 'all' && t.species?.habitatType !== habitat) return false
    if (stage && t.stage !== stage) return false
    if (status && t.status !== status) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
        !t.species?.scientificName?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const hasActiveFilters = habitat !== 'all' || stage || status || search

  return (
    <div>
      <Navbar />
      <div className="container mt-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h4 className="fw-bold mb-0">Mis Tarántulas</h4>
            <p className="text-collection small mb-0">
              {tarantulas.length} en tu colección
            </p>
          </div>
          <Link to="/tarantulas/new" className="btn btn-dark">
            + Agregar
          </Link>
        </div>

        {/* Recordatorios próximos */}
        <RemindersPanel />

        {/* Filtros */}
        {tarantulas.length > 0 && (
          <div className="mb-4">
            <div className="input-group input-group-sm mb-2" style={{ maxWidth: 320 }}>
              <span className="input-group-text bg-white border-end-0">🔍</span>
              <input type="text" className="form-control border-start-0"
                     placeholder="Buscar por nombre o especie..."
                     value={search} onChange={e => setSearch(e.target.value)} />
              {search && (
                <button className="btn btn-outline-secondary" onClick={() => setSearch('')}>✕</button>
              )}
            </div>
            <div className="d-flex gap-2 flex-wrap align-items-center">
              {HABITAT_FILTERS.map(f => (
                <button key={f.key}
                        className={`btn btn-sm ${habitat === f.key ? 'btn-dark' : 'btn-outline-secondary'}`}
                        onClick={() => setHabitat(f.key)}>
                  {f.label}
                </button>
              ))}
              <select className="form-select form-select-sm" style={{ width: 'auto' }}
                      value={stage} onChange={e => setStage(e.target.value)}>
                {STAGE_FILTERS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
              <select className="form-select form-select-sm" style={{ width: 'auto' }}
                      value={status} onChange={e => setStatus(e.target.value)}>
                {STATUS_FILTERS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
              {hasActiveFilters && (
                <button className="btn btn-sm btn-link text-muted p-0"
                        onClick={() => { setHabitat('all'); setStage(''); setStatus(''); setSearch('') }}>
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        )}

        {/* Contenido */}
        {loading ? (
          <div className="text-center py-5 text-muted">Cargando...</div>
        ) : tarantulas.length === 0 ? (
          <div className="card border-0 shadow-sm text-center py-5">
            <div className="fs-1 mb-2">🕸️</div>
            <p className="fw-semibold mb-1">Tu colección está vacía</p>
            <p className="text-collection small mb-3">
              Agrega tu primera tarántula para empezar su expediente.
            </p>
            <div>
              <Link to="/tarantulas/new" className="btn btn-dark btn-sm">
                + Agregar primera tarántula
              </Link>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted small">
            Sin resultados para los filtros seleccionados.{' '}
            {hasActiveFilters && (
              <button className="btn btn-link btn-sm p-0 text-muted"
                      onClick={() => { setHabitat('all'); setStage(''); setStatus(''); setSearch('') }}>
                Limpiar filtros
              </button>
            )}
          </p>
        ) : (
          <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3">
            {filtered.map(t => (
              <div className="col" key={t.id}>
                <TarantulaCard tarantula={t} />
              </div>
            ))}
          </div>
        )}

        {/* ─── En memoria ───────────────────────────────────────────── */}
        {deceased.length > 0 && (
          <details className="mt-4">
            <summary className="small fw-semibold mb-2" style={{ cursor: 'pointer', color: 'var(--ta-gold)', listStyle: 'none' }}>
              🕯️ En memoria ({deceased.length})
            </summary>
            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3 mt-1">
              {deceased.map(t => (
                <div className="col" key={t.id}>
                  <Link to={`/tarantulas/${t.id}`} className="text-decoration-none">
                    <div className="card h-100 tarantula-card" style={{ opacity: 0.72 }}>
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <h6 className="card-title fw-bold mb-0 text-truncate me-2">{t.name}</h6>
                          <span className="badge bg-secondary">🕯️</span>
                        </div>
                        {t.species && (
                          <p className="text-muted small mb-1 fst-italic text-truncate">
                            {t.species.scientificName}
                          </p>
                        )}
                        <p className="text-muted small mb-0">† {formatDate(t.deceasedAt)}</p>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
