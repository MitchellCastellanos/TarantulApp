import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import { imgUrl } from '../services/api'

const HABITAT_ICON = { terrestrial: '🌎', arboreal: '🌳', fossorial: '🕳️' }
const STAGE_LABEL  = { sling: 'Sling', juvenile: 'Juvenil', subadult: 'Subadulto', adult: 'Adulto' }
const SEX_LABEL    = { male: '♂ Macho', female: '♀ Hembra', unsexed: '? Sin determinar' }

export default function TarantulaCard({ tarantula }) {
  const { id, name, species, stage, sex, currentSizeCm, profilePhoto, status } = tarantula

  return (
    <Link to={`/tarantulas/${id}`} className="text-decoration-none">
      <div className="card h-100 shadow-sm border-0 tarantula-card">
        {/* Foto o placeholder */}
        <div className="card-img-top d-flex align-items-center justify-content-center overflow-hidden"
             style={{ height: '160px', background: 'linear-gradient(135deg, #1a1a2e, #2d2d44)' }}>
          {profilePhoto ? (
            <img src={imgUrl(profilePhoto)} alt={name}
                 style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '4rem', opacity: 0.6 }}>🕷️</span>
          )}
        </div>

        <div className="card-body p-3">
          <div className="d-flex justify-content-between align-items-start mb-1">
            <h6 className="card-title fw-bold mb-0 text-truncate me-2">{name}</h6>
            <StatusBadge status={status} />
          </div>

          {species && (
            <p className="text-muted small mb-2 fst-italic text-truncate">
              {HABITAT_ICON[species.habitatType]} {species.scientificName}
            </p>
          )}

          <div className="d-flex gap-2 flex-wrap">
            {stage && (
              <span className="badge bg-light text-dark border">
                {STAGE_LABEL[stage] ?? stage}
              </span>
            )}
            {sex && (
              <span className="badge bg-light text-dark border">
                {SEX_LABEL[sex] ?? sex}
              </span>
            )}
            {currentSizeCm && (
              <span className="badge bg-light text-dark border">
                📏 {currentSizeCm} cm
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
