import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import TarantulaCard from '../components/TarantulaCard'
import tarantulaService from '../services/tarantulaService'

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'terrestrial', label: '🌎 Terrestres' },
  { key: 'arboreal', label: '🌳 Arbóreas' },
  { key: 'fossorial', label: '🕳️ Fosoriales' },
]

export default function DashboardPage() {
  const [tarantulas, setTarantulas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    tarantulaService.getAll()
      .then(setTarantulas)
      .finally(() => setLoading(false))
  }, [])

  const filtered = tarantulas.filter(t => {
    if (filter === 'all') return true
    return t.species?.habitatType === filter
  })

  return (
    <div>
      <Navbar />
      <div className="container mt-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h4 className="fw-bold mb-0">Mis Tarántulas</h4>
            <p className="text-muted small mb-0">
              {tarantulas.length} en tu colección
            </p>
          </div>
          <Link to="/tarantulas/new" className="btn btn-dark">
            + Agregar
          </Link>
        </div>

        {/* Filtros */}
        {tarantulas.length > 0 && (
          <div className="d-flex gap-2 mb-4 flex-wrap">
            {FILTERS.map(f => (
              <button key={f.key}
                      className={`btn btn-sm ${filter === f.key ? 'btn-dark' : 'btn-outline-secondary'}`}
                      onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Contenido */}
        {loading ? (
          <div className="text-center py-5 text-muted">Cargando...</div>
        ) : tarantulas.length === 0 ? (
          <div className="card border-0 shadow-sm text-center py-5">
            <div className="fs-1 mb-2">🕸️</div>
            <p className="fw-semibold mb-1">Tu colección está vacía</p>
            <p className="text-muted small mb-3">
              Agrega tu primera tarántula para empezar su expediente.
            </p>
            <div>
              <Link to="/tarantulas/new" className="btn btn-dark btn-sm">
                + Agregar primera tarántula
              </Link>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted">Sin resultados para este filtro.</p>
        ) : (
          <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3">
            {filtered.map(t => (
              <div className="col" key={t.id}>
                <TarantulaCard tarantula={t} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
