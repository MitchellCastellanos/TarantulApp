import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import TarantulaCard from '../components/TarantulaCard'
import RemindersPanel from '../components/RemindersPanel'
import tarantulaService from '../services/tarantulaService'
import { useAuth } from '../context/AuthContext'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
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
  const plan = user?.plan || 'FREE'
  const isFreePlan = plan !== 'PRO'
  const tarantulaLimit = isFreePlan ? 6 : null
  const atLimit = isFreePlan && tarantulas.length >= tarantulaLimit

  const HABITAT_FILTERS = [
    { key: 'all',         label: t('dashboard.filterAll') },
    { key: 'terrestrial', label: t('dashboard.filterTerrestrial') },
    { key: 'arboreal',    label: t('dashboard.filterArboreal') },
    { key: 'fossorial',   label: t('dashboard.filterFossorial') },
  ]
  const STAGE_FILTERS = [
    { key: '', label: t('stages.label') },
    { key: 'sling',    label: t('stages.sling') },
    { key: 'juvenile', label: t('stages.juvenile') },
    { key: 'subadult', label: t('stages.subadult') },
    { key: 'adult',    label: t('stages.adult') },
  ]
  const STATUS_FILTERS = [
    { key: '', label: t('dashboard.filterStatus') },
    { key: 'active',          label: t('dashboard.filterActive') },
    { key: 'pre_molt',        label: t('dashboard.filterPreMolt') },
    { key: 'pending_feeding', label: t('dashboard.filterHungry') },
  ]

  return (
    <div>
      <Navbar />
      <div className="container mt-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h4 className="fw-bold mb-0">{t('dashboard.title')}</h4>
            <p className="text-collection small mb-0">
              {tarantulas.length} {t('dashboard.inCollection')}
              {isFreePlan && ` · ${tarantulas.length}/${tarantulaLimit} ${t('dashboard.planUsage')}`}
            </p>
          </div>
          {atLimit ? (
            <button type="button" className="btn btn-outline-secondary" disabled title={t('dashboard.limitReached')}>
              {t('dashboard.add')}
            </button>
          ) : (
            <Link to="/tarantulas/new" className="btn btn-dark">
              {t('dashboard.add')}
            </Link>
          )}
        </div>

        {atLimit && (
          <div className="alert alert-warning small py-2">
            {t('dashboard.limitReached')}{' '}
            <Link to="/pro" className="alert-link">
              {t('pro.learnMore')}
            </Link>
          </div>
        )}

        {/* Recordatorios próximos */}
        <RemindersPanel />

        {/* Filtros */}
        {tarantulas.length > 0 && (
          <div className="mb-4">
            <div className="input-group input-group-sm mb-2" style={{ maxWidth: 320 }}>
              <span className="input-group-text border-end-0">🔍</span>
              <input type="text" className="form-control border-start-0"
                     placeholder={t('dashboard.search')}
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
                  {t('dashboard.clearFilters')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Contenido */}
        {loading ? (
          <div className="text-center py-5 text-muted">{t('common.loading')}</div>
        ) : tarantulas.length === 0 ? (
          <div className="card border-0 shadow-sm text-center py-5">
            <div className="fs-1 mb-2">🕸️</div>
            <p className="fw-semibold mb-1">{t('dashboard.empty')}</p>
            <p className="text-collection small mb-3">{t('dashboard.emptyDesc')}</p>
            <div>
              <Link to="/tarantulas/new" className="btn btn-dark btn-sm">
                {t('dashboard.addFirst')}
              </Link>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted small">
            {t('dashboard.noResults')}{' '}
            {hasActiveFilters && (
              <button className="btn btn-link btn-sm p-0 text-muted"
                      onClick={() => { setHabitat('all'); setStage(''); setStatus(''); setSearch('') }}>
                {t('dashboard.clearFilters')}
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
              {t('dashboard.inMemory')} ({deceased.length})
            </summary>
            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3 mt-1">
              {deceased.map(d => (
                <div className="col" key={d.id}>
                  <Link to={`/tarantulas/${d.id}`} className="text-decoration-none">
                    <div className="card h-100 tarantula-card" style={{ opacity: 0.72 }}>
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <h6 className="card-title fw-bold mb-0 text-truncate me-2">{d.name}</h6>
                          <span className="badge bg-secondary">🕯️</span>
                        </div>
                        {d.species && (
                          <p className="text-muted small mb-1 fst-italic text-truncate">
                            {d.species.scientificName}
                          </p>
                        )}
                        <p className="text-muted small mb-0">† {formatDate(d.deceasedAt)}</p>
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
