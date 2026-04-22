import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import BrandLogoMark from '../components/BrandLogoMark'
import TarantulaCard from '../components/TarantulaCard'
import RemindersPanel from '../components/RemindersPanel'
import tarantulaService from '../services/tarantulaService'
import marketplaceService from '../services/marketplaceService'
import { useAuth } from '../context/AuthContext'
import { formatDateInUserZone } from '../utils/dateFormat'
import ProTrialCtaLink from '../components/ProTrialCtaLink'
import { exportTarantulaCollectionToExcel } from '../utils/exportCollectionExcel'
import { imgUrl } from '../services/api'

function daysLeftInTrial(iso) {
  if (!iso) return 0
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  return Math.max(0, d)
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [tarantulas, setTarantulas] = useState([])
  const [loading, setLoading] = useState(true)
  const [habitat, setHabitat] = useState('all')
  const [stage, setStage] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)
  const [keeperProfile, setKeeperProfile] = useState(null)

  useEffect(() => {
    tarantulaService.getAll()
      .then(setTarantulas)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return
    marketplaceService.getMyProfile().then(setKeeperProfile).catch(() => setKeeperProfile(null))
  }, [user?.id])

  const alive    = tarantulas.filter(t => !t.deceasedAt)
  const deceased = tarantulas.filter(t =>  t.deceasedAt)
  const speciesSet = new Set(alive.map((t) => t.species?.scientificName).filter(Boolean))
  const profileBadges = Array.isArray(keeperProfile?.badges)
    ? keeperProfile.badges.map((b) => b?.label).filter(Boolean)
    : [
        alive.length >= 1 ? 'Starter keeper' : null,
        alive.length >= 10 ? 'Coleccion 10+' : null,
        alive.length >= 25 ? 'Coleccion 25+' : null,
        speciesSet.size >= 5 ? 'Diversidad 5+ especies' : null,
        speciesSet.size >= 12 ? 'Diversidad 12+ especies' : null,
      ].filter(Boolean)
  const reputation = keeperProfile?.reputation || null
  const badgesProgress = keeperProfile?.badgesProgress || null

  const filtered = alive.filter(t => {
    if (habitat !== 'all' && t.species?.habitatType !== habitat) return false
    if (stage && t.stage !== stage) return false
    if (status && t.status !== status) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
        !t.species?.scientificName?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const hasActiveFilters = habitat !== 'all' || stage || status || search
  const overFreeLimit = user?.overFreeLimit === true
  const hasProFeatures = user?.hasProFeatures === true
  const isFreePlan = !hasProFeatures
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

  const handleExportExcel = async () => {
    if (!tarantulas.length || exporting) return
    setExporting(true)
    try {
      await exportTarantulaCollectionToExcel(tarantulas, t, i18n.language)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <Navbar />
      <div className="container mt-4">
        <div
          className="mb-3 px-3 py-2 rounded-1 small ta-dashboard-atmosphere-strip"
          style={{
            borderLeft: '3px solid rgba(200, 170, 80, 0.55)',
            color: 'var(--ta-parchment)',
            fontFamily: 'Georgia, "Times New Roman", serif',
            letterSpacing: '0.02em',
          }}
        >
          {t('dashboard.keeperAtmosphereStrip')}
        </div>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div>
            <h4 className="fw-bold mb-0">{t('dashboard.title')}</h4>
            <p className="text-collection small mb-0">
              {tarantulas.length} {t('dashboard.inCollection')}
              {isFreePlan && ` · ${tarantulas.length}/${tarantulaLimit} ${t('dashboard.planUsage')}`}
            </p>
          </div>
          <div className="d-flex gap-2 align-items-center flex-wrap justify-content-end">
            {hasProFeatures ? (
              <>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={!tarantulas.length || exporting}
                  title={!tarantulas.length ? t('dashboard.exportEmpty') : undefined}
                  onClick={handleExportExcel}
                >
                  {exporting ? t('dashboard.exporting') : t('dashboard.exportExcel')}
                </button>
                <Link
                  to="/tarantulas/qr-print"
                  className="btn btn-outline-secondary btn-sm"
                  title={t('dashboard.qrBulkPrintTitle')}
                >
                  {t('dashboard.qrBulkPrint')}
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/pro"
                  className="btn btn-outline-secondary btn-sm position-relative"
                  title={t('dashboard.exportExcelProOnly')}
                >
                  {t('dashboard.exportExcel')}
                  <span className="badge bg-dark ms-1 align-middle" style={{ fontSize: '0.65rem' }}>PRO</span>
                </Link>
                <Link
                  to="/tarantulas/qr-print"
                  className="btn btn-outline-secondary btn-sm position-relative"
                  title={t('dashboard.qrBulkPrintProOnly')}
                >
                  {t('dashboard.qrBulkPrint')}
                  <span className="badge bg-dark ms-1 align-middle" style={{ fontSize: '0.65rem' }}>PRO</span>
                </Link>
              </>
            )}
            {atLimit ? (
              <>
                <button type="button" className="btn btn-outline-secondary btn-sm" disabled title={t('dashboard.limitReached')}>
                  {t('dashboard.add')}
                </button>
                <ProTrialCtaLink className="btn btn-dark btn-sm" />
              </>
            ) : (
              <Link to="/tarantulas/new" className="btn btn-dark">
                {t('dashboard.add')}
              </Link>
            )}
          </div>
        </div>

        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body py-3">
            <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
              <div>
                <h6 className="mb-1 fw-bold">{user?.displayName || user?.email}</h6>
                <div className="small text-muted">
                  @{user?.publicHandle || 'keeper'} · {[user?.profileCity, user?.profileState, user?.profileCountry].filter(Boolean).join(', ') || 'Sin ubicación'}
                </div>
                {user?.bio && <p className="small mb-1 mt-2">{user.bio}</p>}
              </div>
              <img
                src={imgUrl(user?.profilePhoto) || '/spider-default.png'}
                alt="keeper"
                style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 999, border: '1px solid var(--ta-border)' }}
              />
              <Link to="/account" className="btn btn-sm btn-outline-secondary">Editar perfil</Link>
            </div>
            {reputation && (
              <div className="mt-2 p-2 rounded" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--ta-border)' }}>
                <div className="small fw-semibold mb-1">
                  Keeper Reputation · {reputation.tier} · {reputation.score}/100
                </div>
                <div className="progress" style={{ height: 8 }}>
                  <div className="progress-bar bg-warning" style={{ width: `${Math.min(100, Number(reputation.score || 0))}%` }} />
                </div>
                {reputation.nextTier !== 'Max' && (
                  <div className="small text-muted mt-1">
                    Next: {reputation.nextTier} ({reputation.nextTierTarget})
                  </div>
                )}
              </div>
            )}
            {badgesProgress && (
              <div className="row g-2 mt-1">
                {Object.entries(badgesProgress).map(([key, p]) => {
                  const target = Number(p?.target || 0)
                  const current = Number(p?.current || 0)
                  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 100
                  return (
                    <div className="col-md-6" key={key}>
                      <div className="small mb-1">{p?.nextLabel}</div>
                      <div className="progress" style={{ height: 6 }}>
                        <div className="progress-bar bg-info" style={{ width: `${percent}%` }} />
                      </div>
                      <div className="small text-muted">{current}/{target || current}</div>
                    </div>
                  )
                })}
              </div>
            )}
            {profileBadges.length > 0 && (
              <div className="d-flex gap-1 flex-wrap mt-2">
                {profileBadges.map((badge) => (
                  <span className="badge bg-light text-dark border" key={badge}>{badge}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {overFreeLimit && (
          <div className="alert alert-warning small py-2 mb-3">
            {t('readOnly.overLimitBanner')}{' '}
            <Link to="/pro" className="alert-link">{t('pro.learnMore')}</Link>
          </div>
        )}

        {user?.inTrial && (
          <div className="alert alert-info small py-2 mb-3">
            {t('dashboard.trialBanner')}
            {user?.trialEndsAt && (
              <span className="ms-1">· {t('pro.trialDaysLeft', { count: daysLeftInTrial(user.trialEndsAt) })}</span>
            )}
          </div>
        )}

        <div
          className="alert small py-2 mb-3 d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2"
          style={{ background: 'rgba(26,22,40,0.65)', border: '1px solid rgba(201,162,39,0.35)', color: 'var(--ta-parchment)' }}
        >
          <span className="mb-0">{t('dashboard.qrBannerLead')}</span>
          <Link to="/herramientas/qr" className="btn btn-sm btn-dark align-self-stretch align-self-sm-auto shrink-0">
            {t('dashboard.qrBannerLink')}
          </Link>
        </div>

        {atLimit && (
          <div className="alert alert-warning small py-2 d-flex flex-column flex-sm-row align-items-sm-center gap-2 justify-content-between">
            <span>
              {t('dashboard.limitReached')}{' '}
              <Link to="/pro" className="alert-link">
                {t('pro.learnMore')}
              </Link>
            </span>
            <ProTrialCtaLink className="btn btn-sm align-self-stretch align-self-sm-auto" />
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
            <div className="d-flex justify-content-center mb-3">
              <BrandLogoMark size={56} showIntro />
            </div>
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
                        <p className="text-muted small mb-0">† {formatDateInUserZone(d.deceasedAt, i18n.language)}</p>
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
