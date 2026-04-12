import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'

const HABITAT_ICON = { terrestrial: '🌎', arboreal: '🌳', fossorial: '🕳️' }
const STAGE_LABEL  = { sling: 'Sling', juvenile: 'Juvenil', subadult: 'Subadulto', adult: 'Adulto' }
const SEX_LABEL    = { male: '♂ Macho', female: '♀ Hembra', unsexed: '? Sin determinar' }
const STATUS_CFG   = {
  active:          { label: 'Activa',     color: 'success' },
  pre_molt:        { label: 'Pre-muda',   color: 'warning' },
  pending_feeding: { label: 'Sin comer',  color: 'danger'  },
}

function formatDate(iso) {
  if (!iso) return '–'
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PublicProfilePage() {
  const { shortId } = useParams()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    axios.get(`/api/public/t/${shortId}`)
      .then(r => setProfile(r.data))
      .catch(() => setError('Perfil no encontrado o no es público.'))
  }, [shortId])

  if (error) return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark text-white">
      <div className="text-center">
        <div className="fs-1 mb-2">🕸️</div>
        <p>{error}</p>
        <Link to="/" className="btn btn-outline-light btn-sm">Ir al inicio</Link>
      </div>
    </div>
  )

  if (!profile) return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark text-white">
      <p>Cargando...</p>
    </div>
  )

  const statusCfg = STATUS_CFG[profile.status] || { label: profile.status, color: 'secondary' }

  return (
    <div className="min-vh-100" style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
      <div className="container py-5" style={{ maxWidth: 480 }}>
        <div className="card border-0 shadow-lg">
          {/* Foto */}
          <div className="d-flex align-items-center justify-content-center overflow-hidden rounded-top"
               style={{ height: 240, background: 'linear-gradient(135deg,#1a1a2e,#2d2d44)' }}>
            {profile.profilePhoto ? (
              <img src={`/uploads/${profile.profilePhoto}`} alt={profile.name}
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
              {profile.stage && (
                <span className="badge bg-light text-dark border">{STAGE_LABEL[profile.stage] ?? profile.stage}</span>
              )}
              {profile.sex && (
                <span className="badge bg-light text-dark border">{SEX_LABEL[profile.sex] ?? profile.sex}</span>
              )}
              {profile.currentSizeCm && (
                <span className="badge bg-light text-dark border">📏 {profile.currentSizeCm} cm</span>
              )}
            </div>

            <div className="small text-muted">
              <div>🍽️ Última comida: {formatDate(profile.lastFedAt)}</div>
              <div>🕸️ Última muda: {formatDate(profile.lastMoltAt)}</div>
            </div>
          </div>

          <div className="card-footer bg-transparent text-center small text-muted">
            <span>🕷️ TarantulApp</span>
          </div>
        </div>
      </div>
    </div>
  )
}
