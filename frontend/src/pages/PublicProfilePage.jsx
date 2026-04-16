import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api, { imgUrl } from '../services/api'
import { useAuth } from '../context/AuthContext'
import logsService from '../services/logsService'

const HABITAT_ICON = { terrestrial: '🌎', arboreal: '🌳', fossorial: '🕳️' }
const STAGE_LABEL  = { sling: 'Sling', juvenile: 'Juvenil', subadult: 'Subadulto', adult: 'Adulto' }
const SEX_LABEL    = { male: '♂ Macho', female: '♀ Hembra', unsexed: '? Sin determinar' }
const STATUS_CFG   = {
  active:          { label: 'Activa',     color: 'success' },
  pre_molt:        { label: 'Pre-muda',   color: 'warning' },
  pending_feeding: { label: 'Sin comer',  color: 'danger'  },
  deceased:        { label: '🕯️ Fallecida', color: 'secondary' },
}

const PREY_TYPES = ['Grillo', 'Dubia', 'Superworm', 'Lombriz', 'Mealworm', 'Otro']
const MOODS      = [
  { value: 'calm',       label: '😌 Tranquila' },
  { value: 'active',     label: '⚡ Activa' },
  { value: 'defensive',  label: '⚠️ Defensiva' },
  { value: 'hiding',     label: '🕳️ Escondida' },
  { value: 'pre_molt',   label: '🌙 Pre-muda' },
]

function formatDate(iso) {
  if (!iso) return '–'
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function nowISO() {
  return new Date().toISOString().slice(0, 16)
}

export default function PublicProfilePage() {
  const { shortId } = useParams()
  const { user }    = useAuth()
  const [profile, setProfile]   = useState(null)
  const [error, setError]       = useState('')
  const [quickLog, setQuickLog] = useState(null) // 'feeding' | 'molt' | 'behavior'
  const [saved, setSaved]       = useState('')
  const [busy, setBusy]         = useState(false)

  // Quick-log form state
  const [feed, setFeed] = useState({ preyType: 'Grillo', preySize: 'medium', quantity: 1, accepted: true, notes: '' })
  const [molt, setMolt] = useState({ preSizeCm: '', postSizeCm: '', notes: '' })
  const [behav, setBehav] = useState({ mood: 'active', notes: '' })

  const load = () =>
    api.get(`/public/t/${shortId}`)
       .then(r => setProfile(r.data))
       .catch(() => setError('Perfil no encontrado o no es público.'))

  useEffect(() => { load() }, [shortId])

  const isOwner = !!(user && profile && String(user.id) === String(profile.ownerId))

  const doSave = async (fn) => {
    setBusy(true)
    setSaved('')
    try {
      await fn()
      setSaved('✅ Registrado')
      setQuickLog(null)
      load() // refresh lastFedAt etc.
    } catch {
      setSaved('❌ Error al guardar')
    } finally {
      setBusy(false)
    }
  }

  const saveFeed = () => doSave(() =>
    logsService.addFeeding(profile.tarantulaId, { ...feed, fedAt: nowISO(), quantity: Number(feed.quantity) }))

  const saveMolt = () => doSave(() =>
    logsService.addMolt(profile.tarantulaId, {
      moltedAt: nowISO(),
      preSizeCm:  molt.preSizeCm  ? Number(molt.preSizeCm)  : null,
      postSizeCm: molt.postSizeCm ? Number(molt.postSizeCm) : null,
      notes: molt.notes || null,
    }))

  const saveBehav = () => doSave(() =>
    logsService.addBehavior(profile.tarantulaId, { ...behav, loggedAt: nowISO() }))

  if (error) return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center"
         style={{ background: 'linear-gradient(135deg, #1a0e06 0%, #131c09 100%)' }}>
      <div className="text-center" style={{ color: 'var(--ta-parchment)' }}>
        <div className="fs-1 mb-2">🕸️</div>
        <p>{error}</p>
        <Link to="/" className="btn btn-outline-light btn-sm">Ir al inicio</Link>
      </div>
    </div>
  )

  if (!profile) return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center"
         style={{ background: 'linear-gradient(135deg, #1a0e06 0%, #131c09 100%)' }}>
      <p style={{ color: 'var(--ta-parchment)' }}>Cargando...</p>
    </div>
  )

  const statusCfg = STATUS_CFG[profile.status] || { label: profile.status, color: 'secondary' }

  return (
    <div className="min-vh-100" style={{ background: 'linear-gradient(135deg, #1a0e06 0%, #131c09 100%)' }}>
      <div className="container py-4" style={{ maxWidth: 480 }}>

        {/* ─── Ficha pública ──────────────────────────── */}
        <div className="card shadow-lg mb-3">
          {/* Foto */}
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
                {statusCfg.label}
              </span>
            </div>

            {(profile.scientificName || profile.commonName) && (
              <p className="text-muted fst-italic mb-3">
                {HABITAT_ICON[profile.habitatType]} {profile.scientificName}
                {profile.commonName && ` · ${profile.commonName}`}
              </p>
            )}

            <div className="d-flex flex-wrap gap-2 mb-3">
              {profile.stage && <span className="badge bg-light text-dark border">{STAGE_LABEL[profile.stage] ?? profile.stage}</span>}
              {profile.sex   && <span className="badge bg-light text-dark border">{SEX_LABEL[profile.sex] ?? profile.sex}</span>}
              {profile.currentSizeCm && <span className="badge bg-light text-dark border">📏 {profile.currentSizeCm} cm</span>}
            </div>

            <div className="small text-muted">
              <div>🍽️ Última comida: {formatDate(profile.lastFedAt)}</div>
              <div>🕸️ Última muda: {formatDate(profile.lastMoltAt)}</div>
            </div>
          </div>

          <div className="card-footer text-center small text-muted">
            🕷️ TarantulApp
          </div>
        </div>

        {/* ─── Panel de registro rápido (solo propietario) ── */}
        {isOwner && (
          <div className="card shadow-sm">
            <div className="card-body p-3">
              <p className="fw-semibold mb-2 small" style={{ color: 'var(--ta-brown)' }}>
                📋 Registro rápido
              </p>

              {saved && <div className="alert py-1 small mb-2" style={{ background: '#1a2e1a', color: '#a8d8b0', border: '1px solid #3d5a2a' }}>{saved}</div>}

              {/* Selector de acción */}
              <div className="d-flex gap-2 mb-3 flex-wrap">
                {[
                  { key: 'feeding',  icon: '🍽️', label: 'Alimentación' },
                  { key: 'molt',     icon: '🌙', label: 'Muda' },
                  { key: 'behavior', icon: '📊', label: 'Comportamiento' },
                ].map(({ key, icon, label }) => (
                  <button key={key}
                          className={`btn btn-sm ${quickLog === key ? 'btn-dark' : 'btn-outline-secondary'}`}
                          onClick={() => setQuickLog(quickLog === key ? null : key)}>
                    {icon} {label}
                  </button>
                ))}
              </div>

              {/* ─── Formulario alimentación ─── */}
              {quickLog === 'feeding' && (
                <div className="border rounded p-3 small">
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label mb-1 small fw-semibold">Presa</label>
                      <select className="form-select form-select-sm"
                              value={feed.preyType} onChange={e => setFeed(f => ({ ...f, preyType: e.target.value }))}>
                        {PREY_TYPES.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="col-3">
                      <label className="form-label mb-1 small fw-semibold">Tamaño</label>
                      <select className="form-select form-select-sm"
                              value={feed.preySize} onChange={e => setFeed(f => ({ ...f, preySize: e.target.value }))}>
                        <option value="small">S</option>
                        <option value="medium">M</option>
                        <option value="large">L</option>
                      </select>
                    </div>
                    <div className="col-3">
                      <label className="form-label mb-1 small fw-semibold">Cant.</label>
                      <input type="number" className="form-control form-control-sm" min={1} max={20}
                             value={feed.quantity} onChange={e => setFeed(f => ({ ...f, quantity: e.target.value }))} />
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3 mb-2">
                    <div className="form-check mb-0">
                      <input type="checkbox" className="form-check-input" id="accepted"
                             checked={feed.accepted} onChange={e => setFeed(f => ({ ...f, accepted: e.target.checked }))} />
                      <label className="form-check-label small" htmlFor="accepted">Aceptó</label>
                    </div>
                  </div>
                  <input type="text" className="form-control form-control-sm mb-2" placeholder="Notas (opcional)"
                         value={feed.notes} onChange={e => setFeed(f => ({ ...f, notes: e.target.value }))} />
                  <button className="btn btn-dark btn-sm w-100" onClick={saveFeed} disabled={busy}>
                    {busy ? 'Guardando...' : '💾 Guardar alimentación'}
                  </button>
                </div>
              )}

              {/* ─── Formulario muda ─── */}
              {quickLog === 'molt' && (
                <div className="border rounded p-3 small">
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label mb-1 small fw-semibold">Talla pre (cm)</label>
                      <input type="number" step="0.1" className="form-control form-control-sm"
                             placeholder="Ej: 4.5"
                             value={molt.preSizeCm} onChange={e => setMolt(m => ({ ...m, preSizeCm: e.target.value }))} />
                    </div>
                    <div className="col-6">
                      <label className="form-label mb-1 small fw-semibold">Talla post (cm)</label>
                      <input type="number" step="0.1" className="form-control form-control-sm"
                             placeholder="Ej: 5.2"
                             value={molt.postSizeCm} onChange={e => setMolt(m => ({ ...m, postSizeCm: e.target.value }))} />
                    </div>
                  </div>
                  <input type="text" className="form-control form-control-sm mb-2" placeholder="Notas (opcional)"
                         value={molt.notes} onChange={e => setMolt(m => ({ ...m, notes: e.target.value }))} />
                  <button className="btn btn-dark btn-sm w-100" onClick={saveMolt} disabled={busy}>
                    {busy ? 'Guardando...' : '💾 Guardar muda'}
                  </button>
                </div>
              )}

              {/* ─── Formulario comportamiento ─── */}
              {quickLog === 'behavior' && (
                <div className="border rounded p-3 small">
                  <label className="form-label mb-2 small fw-semibold">Estado observado</label>
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    {MOODS.map(({ value, label }) => (
                      <button key={value}
                              className={`btn btn-sm ${behav.mood === value ? 'btn-dark' : 'btn-outline-secondary'}`}
                              onClick={() => setBehav(b => ({ ...b, mood: value }))}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <input type="text" className="form-control form-control-sm mb-2" placeholder="Notas (opcional)"
                         value={behav.notes} onChange={e => setBehav(b => ({ ...b, notes: e.target.value }))} />
                  <button className="btn btn-dark btn-sm w-100" onClick={saveBehav} disabled={busy}>
                    {busy ? 'Guardando...' : '💾 Guardar comportamiento'}
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
