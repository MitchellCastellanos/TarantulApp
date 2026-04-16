import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api, { imgUrl } from '../services/api'
import { useAuth } from '../context/AuthContext'
import logsService from '../services/logsService'

const HABITAT_ICON = { terrestrial: '🌎', arboreal: '🌳', fossorial: '🕳️' }
const STATUS_CFG   = {
  active:          { color: 'success' },
  pre_molt:        { color: 'warning' },
  pending_feeding: { color: 'danger'  },
  deceased:        { color: 'secondary' },
}

const PREY_TYPES = ['Cricket', 'Dubia', 'Superworm', 'Worm', 'Mealworm', 'Other']

function formatDate(iso) {
  if (!iso) return '–'
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function nowISO() {
  return new Date().toISOString().slice(0, 16)
}

export default function PublicProfilePage() {
  const { shortId } = useParams()
  const { user }    = useAuth()
  const { t }       = useTranslation()

  const [profile, setProfile]   = useState(null)
  const [timeline, setTimeline] = useState([])
  const [error, setError]       = useState('')
  const [quickLog, setQuickLog] = useState(null)
  const [saved, setSaved]       = useState('')
  const [busy, setBusy]         = useState(false)

  const [feed, setFeed]   = useState({ preyType: 'Cricket', preySize: 'medium', quantity: 1, accepted: true, notes: '' })
  const [molt, setMolt]   = useState({ preSizeCm: '', postSizeCm: '', notes: '' })
  const [behav, setBehav] = useState({ mood: 'active', notes: '' })

  const load = () => {
    api.get(`/public/t/${shortId}`)
       .then(r => {
         setProfile(r.data)
         api.get(`/public/t/${shortId}/timeline`)
            .then(tr => setTimeline(tr.data))
            .catch(() => {})
       })
       .catch(() => setError(t('public.notFound')))
  }

  useEffect(() => { load() }, [shortId])

  const isOwner = !!(user && profile && String(user.id) === String(profile.ownerId))

  const doSave = async (fn) => {
    setBusy(true)
    setSaved('')
    try {
      await fn()
      setSaved(t('quickLog.saved'))
      setQuickLog(null)
      load()
    } catch {
      setSaved(t('quickLog.error'))
    } finally {
      setBusy(false)
    }
  }

  const saveFeed  = () => doSave(() =>
    logsService.addFeeding(profile.tarantulaId, { ...feed, fedAt: nowISO(), quantity: Number(feed.quantity) }))
  const saveMolt  = () => doSave(() =>
    logsService.addMolt(profile.tarantulaId, {
      moltedAt: nowISO(),
      preSizeCm:  molt.preSizeCm  ? Number(molt.preSizeCm)  : null,
      postSizeCm: molt.postSizeCm ? Number(molt.postSizeCm) : null,
      notes: molt.notes || null,
    }))
  const saveBehav = () => doSave(() =>
    logsService.addBehavior(profile.tarantulaId, { ...behav, loggedAt: nowISO() }))

  const eventIcon  = (type) => type === 'feeding' ? '🍽️' : type === 'molt' ? '🕸️' : '📊'
  const eventLabel = (ev) => {
    if (ev.type === 'feeding') return ev.title === 'feeding_rejected' ? t('timeline.feeding_rejected') : t('timeline.feeding')
    if (ev.type === 'molt')    return t('timeline.molt')
    const moodKey = ev.title
    return `${t('quickLog.behavior')}: ${t(`timeline.${moodKey}`) || moodKey}`
  }

  if (error) return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center"
         style={{ background: 'linear-gradient(135deg, #1a0e06 0%, #131c09 100%)' }}>
      <div className="text-center" style={{ color: 'var(--ta-parchment)' }}>
        <div className="fs-1 mb-2">🕸️</div>
        <p>{error}</p>
        <Link to="/" className="btn btn-outline-light btn-sm">{t('public.goHome')}</Link>
      </div>
    </div>
  )

  if (!profile) return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center"
         style={{ background: 'linear-gradient(135deg, #1a0e06 0%, #131c09 100%)' }}>
      <p style={{ color: 'var(--ta-parchment)' }}>{t('common.loading')}</p>
    </div>
  )

  const statusCfg   = STATUS_CFG[profile.status] || { color: 'secondary' }
  const statusLabel = t(`status.${profile.status}`) || profile.status

  const MOODS = [
    { value: 'calm',      label: t('moods.calm') },
    { value: 'active',    label: t('moods.active') },
    { value: 'defensive', label: t('moods.defensive') },
    { value: 'hiding',    label: t('moods.hiding') },
    { value: 'pre_molt',  label: t('moods.pre_molt') },
  ]

  return (
    <div className="min-vh-100" style={{ background: 'linear-gradient(135deg, #1a0e06 0%, #131c09 100%)' }}>
      <div className="container py-4" style={{ maxWidth: 480 }}>

        {/* ─── Ficha pública ──────────────────────────── */}
        <div className="card shadow-lg mb-3">
          <div className="d-flex align-items-center justify-content-center overflow-hidden rounded-top"
               style={{ height: 240, background: 'linear-gradient(135deg,#1a1a2e,#2d2d44)' }}>
            {profile.profilePhoto ? (
              <img src={imgUrl(profile.profilePhoto)} alt={profile.name}
                   style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '5rem', opacity: 0.5 }}>🕷️</span>
            )}
          </div>

          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <h4 className="fw-bold mb-0">{profile.name}</h4>
              <span className={`badge bg-${statusCfg.color} text-${statusCfg.color === 'warning' ? 'dark' : 'white'}`}>
                {statusLabel}
              </span>
            </div>

            {(profile.scientificName || profile.commonName) && (
              <p className="text-muted fst-italic mb-3">
                {HABITAT_ICON[profile.habitatType]} {profile.scientificName}
                {profile.commonName && ` · ${profile.commonName}`}
              </p>
            )}

            <div className="d-flex flex-wrap gap-2 mb-3">
              {profile.stage && <span className="badge bg-light text-dark border">{t(`stages.${profile.stage}`) || profile.stage}</span>}
              {profile.sex   && <span className="badge bg-light text-dark border">{t(`sex.${profile.sex}`) || profile.sex}</span>}
              {profile.currentSizeCm && <span className="badge bg-light text-dark border">📏 {profile.currentSizeCm} cm</span>}
            </div>

            <div className="small text-muted">
              <div>{t('public.lastFed')} {formatDate(profile.lastFedAt)}</div>
              <div>{t('public.lastMolt')} {formatDate(profile.lastMoltAt)}</div>
            </div>
          </div>

          <div className="card-footer text-center small text-muted">
            🕷️ TarantulApp
          </div>
        </div>

        {/* ─── Historial reciente ─────────────────────── */}
        <div className="card shadow-sm mb-3">
          <div className="card-body p-3">
            <p className="fw-semibold mb-2 small" style={{ color: 'var(--ta-brown)' }}>
              {t('public.history')}
            </p>
            {timeline.length === 0 ? (
              <p className="text-muted small mb-0">{t('public.historyEmpty')}</p>
            ) : (
              <ul className="list-unstyled mb-0">
                {timeline.slice(0, 10).map(ev => (
                  <li key={ev.id} className="d-flex align-items-start gap-2 mb-2 pb-2 border-bottom border-light">
                    <span style={{ fontSize: '1.1rem', lineHeight: 1.4 }}>{eventIcon(ev.type)}</span>
                    <div className="small flex-grow-1">
                      <div className="fw-semibold">{eventLabel(ev)}</div>
                      {ev.summary && <div className="text-muted">{ev.summary}</div>}
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>{formatDate(ev.eventDate)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ─── Panel de registro rápido (solo propietario) ── */}
        {isOwner && (
          <div className="card shadow-sm">
            <div className="card-body p-3">
              <p className="fw-semibold mb-2 small" style={{ color: 'var(--ta-brown)' }}>
                {t('quickLog.title')}
              </p>

              {saved && <div className="alert py-1 small mb-2" style={{ background: '#1a2e1a', color: '#a8d8b0', border: '1px solid #3d5a2a' }}>{saved}</div>}

              <div className="d-flex gap-2 mb-3 flex-wrap">
                {[
                  { key: 'feeding',  icon: '🍽️', label: t('quickLog.feeding') },
                  { key: 'molt',     icon: '🌙', label: t('quickLog.molt') },
                  { key: 'behavior', icon: '📊', label: t('quickLog.behavior') },
                ].map(({ key, icon, label }) => (
                  <button key={key}
                          className={`btn btn-sm ${quickLog === key ? 'btn-dark' : 'btn-outline-secondary'}`}
                          onClick={() => setQuickLog(quickLog === key ? null : key)}>
                    {icon} {label}
                  </button>
                ))}
              </div>

              {quickLog === 'feeding' && (
                <div className="border rounded p-3 small">
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label mb-1 small fw-semibold">{t('quickLog.prey')}</label>
                      <select className="form-select form-select-sm"
                              value={feed.preyType} onChange={e => setFeed(f => ({ ...f, preyType: e.target.value }))}>
                        {PREY_TYPES.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="col-3">
                      <label className="form-label mb-1 small fw-semibold">{t('quickLog.size')}</label>
                      <select className="form-select form-select-sm"
                              value={feed.preySize} onChange={e => setFeed(f => ({ ...f, preySize: e.target.value }))}>
                        <option value="small">S</option>
                        <option value="medium">M</option>
                        <option value="large">L</option>
                      </select>
                    </div>
                    <div className="col-3">
                      <label className="form-label mb-1 small fw-semibold">{t('quickLog.qty')}</label>
                      <input type="number" className="form-control form-control-sm" min={1} max={20}
                             value={feed.quantity} onChange={e => setFeed(f => ({ ...f, quantity: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-check mb-2">
                    <input type="checkbox" className="form-check-input" id="accepted"
                           checked={feed.accepted} onChange={e => setFeed(f => ({ ...f, accepted: e.target.checked }))} />
                    <label className="form-check-label small" htmlFor="accepted">{t('quickLog.accepted')}</label>
                  </div>
                  <input type="text" className="form-control form-control-sm mb-2" placeholder={t('quickLog.notes')}
                         value={feed.notes} onChange={e => setFeed(f => ({ ...f, notes: e.target.value }))} />
                  <button className="btn btn-dark btn-sm w-100" onClick={saveFeed} disabled={busy}>
                    {busy ? t('common.saving') : t('quickLog.saveFeeding')}
                  </button>
                </div>
              )}

              {quickLog === 'molt' && (
                <div className="border rounded p-3 small">
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label mb-1 small fw-semibold">{t('quickLog.preMoltSize')}</label>
                      <input type="number" step="0.1" className="form-control form-control-sm" placeholder="4.5"
                             value={molt.preSizeCm} onChange={e => setMolt(m => ({ ...m, preSizeCm: e.target.value }))} />
                    </div>
                    <div className="col-6">
                      <label className="form-label mb-1 small fw-semibold">{t('quickLog.postMoltSize')}</label>
                      <input type="number" step="0.1" className="form-control form-control-sm" placeholder="5.2"
                             value={molt.postSizeCm} onChange={e => setMolt(m => ({ ...m, postSizeCm: e.target.value }))} />
                    </div>
                  </div>
                  <input type="text" className="form-control form-control-sm mb-2" placeholder={t('quickLog.notes')}
                         value={molt.notes} onChange={e => setMolt(m => ({ ...m, notes: e.target.value }))} />
                  <button className="btn btn-dark btn-sm w-100" onClick={saveMolt} disabled={busy}>
                    {busy ? t('common.saving') : t('quickLog.saveMolt')}
                  </button>
                </div>
              )}

              {quickLog === 'behavior' && (
                <div className="border rounded p-3 small">
                  <label className="form-label mb-2 small fw-semibold">{t('quickLog.mood')}</label>
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    {MOODS.map(({ value, label }) => (
                      <button key={value}
                              className={`btn btn-sm ${behav.mood === value ? 'btn-dark' : 'btn-outline-secondary'}`}
                              onClick={() => setBehav(b => ({ ...b, mood: value }))}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <input type="text" className="form-control form-control-sm mb-2" placeholder={t('quickLog.notes')}
                         value={behav.notes} onChange={e => setBehav(b => ({ ...b, notes: e.target.value }))} />
                  <button className="btn btn-dark btn-sm w-100" onClick={saveBehav} disabled={busy}>
                    {busy ? t('common.saving') : t('quickLog.saveBehavior')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
