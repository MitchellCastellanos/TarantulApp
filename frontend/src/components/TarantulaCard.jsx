import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import FangPanel from './FangPanel'
import { imgUrl } from '../services/api'

const HABITAT_ICON = { terrestrial: '🌎', arboreal: '🌳', fossorial: '🕳️' }
const STAGE_LABEL  = { sling: 'Sling', juvenile: 'Juvenil', subadult: 'Subadulto', adult: 'Adulto' }
const SEX_LABEL    = { male: '♂ Macho', female: '♀ Hembra', unsexed: '? Sin determinar' }
const defaultSpiderStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  opacity: 0.92,
  transform: 'scale(1.28)',
  transformOrigin: 'center',
}

export default function TarantulaCard({ tarantula }) {
  const { id, name, species, stage, sex, currentSizeCm, profilePhoto, status } = tarantula
  // Use own photo first, then species reference photo from iNaturalist, then placeholder
  const displayPhoto = profilePhoto
    ? imgUrl(profilePhoto)
    : species?.referencePhotoUrl ?? null

  return (
    <Link to={`/tarantulas/${id}`} className="text-decoration-none">
      <FangPanel className="h-100">
      <div className="card h-100 shadow-sm border-0 tarantula-card">
        {/* Foto o placeholder */}
        <div className="card-img-top d-flex align-items-center justify-content-center overflow-hidden position-relative"
             style={{ height: '160px', background: 'linear-gradient(135deg, #0c0c1e 0%, #1a1040 100%)' }}>
          {displayPhoto ? (
            <>
              <img src={displayPhoto} alt={name}
                   style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {!profilePhoto && species?.referencePhotoUrl && (
                <span className="position-absolute bottom-0 end-0 m-1 badge"
                      style={{ background: 'rgba(0,0,0,0.6)', fontSize: '0.6rem', backdropFilter: 'blur(2px)' }}
                      title="Foto referencia de la especie (iNaturalist)">
                  📸 especie
                </span>
              )}
            </>
          ) : (
<<<<<<< HEAD
            <img src="/spider-default.svg" alt="spider"
                 style={defaultSpiderStyle} />
=======
            <img src="/spider-default.png" alt="spider"
                 style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
>>>>>>> 8908fa84aa8d4aba6aa56acfa6f8d1434bfdb981
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
      </FangPanel>
    </Link>
  )
}
