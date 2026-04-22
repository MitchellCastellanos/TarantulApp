import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import userPublicService from '../services/userPublicService'
import marketplaceService from '../services/marketplaceService'
import { imgUrl } from '../services/api'

export default function PublicKeeperProfilePage() {
  const { handle } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(null)
  const [keeperData, setKeeperData] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setProfile(null)
    setKeeperData(null)
    userPublicService.byHandle(handle || '')
      .then(async (p) => {
        if (cancelled) return
        setProfile(p || null)
        if (p?.id) {
          const k = await marketplaceService.getKeeperPublic(p.id).catch(() => null)
          if (!cancelled) setKeeperData(k)
        }
      })
      .catch(() => {
        if (!cancelled) setError('No encontramos este perfil publico.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [handle])

  return (
    <div>
      <Navbar variant="public" />
      <div className="container mt-4 mb-5" style={{ maxWidth: 860 }}>
        {loading && <div className="text-muted small">Cargando perfil...</div>}
        {!loading && error && <div className="alert alert-warning small py-2">{error}</div>}
        {!loading && !error && profile && (
          <>
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <img
                    src={imgUrl(profile.profilePhoto) || '/spider-default.png'}
                    alt={`@${profile.publicHandle || 'keeper'}`}
                    style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 999 }}
                  />
                  <div>
                    <div className="fw-bold">{profile.displayName || 'Keeper'}</div>
                    <div className="small text-muted">@{profile.publicHandle || 'keeper'}</div>
                  </div>
                </div>
                {profile.location ? <p className="small mb-1 text-muted">{profile.location}</p> : null}
                <p className="small mb-0">{profile.bio || 'Este keeper aun no comparte bio publica.'}</p>
              </div>
            </div>

            {keeperData && (
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                    <h2 className="h6 mb-0">Marketplace del keeper</h2>
                    {profile.id ? (
                      <Link className="btn btn-sm btn-outline-secondary" to={`/marketplace/keeper/${profile.id}`}>
                        Ver perfil detallado
                      </Link>
                    ) : null}
                  </div>
                  <div className="small text-muted mb-2">
                    Reputacion: {keeperData?.reputation?.tier || 'Bronze'} ({keeperData?.reputation?.score ?? 0})
                  </div>
                  {(keeperData?.activeListings || []).length === 0 ? (
                    <p className="small text-muted mb-0">No tiene listings activos por ahora.</p>
                  ) : (
                    <div className="row g-2">
                      {(keeperData.activeListings || []).slice(0, 6).map((l) => (
                        <div key={l.id} className="col-md-6">
                          <div className="border rounded p-2 h-100 small">
                            <div className="fw-semibold">{l.title}</div>
                            <div className="text-muted">{l.speciesName || '-'}</div>
                            <div>{l.priceAmount != null ? `${l.priceAmount} ${l.currency || ''}` : 'Precio por acordar'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
