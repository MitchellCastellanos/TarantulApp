import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import speciesWatchService from '../services/speciesWatchService'
import { usePageSeo } from '../hooks/usePageSeo'

export default function WishlistPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [message, setMessage] = useState('')

  usePageSeo({
    title: t('wishlist.seoTitle'),
    description: t('wishlist.seoDescription'),
  })

  const reload = async () => {
    setLoading(true)
    try {
      const data = await speciesWatchService.listMine()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  const remove = async (speciesId) => {
    setBusyId(speciesId)
    setMessage('')
    try {
      await speciesWatchService.unwatch(speciesId)
      setItems((prev) => prev.filter((it) => it.speciesId !== speciesId))
      setMessage(t('wishlist.removed'))
    } catch {
      setMessage(t('wishlist.removeError'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <Navbar />
      <div className="container mt-4 mb-5" style={{ maxWidth: 720 }}>
        <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
          <h1 className="h5 fw-bold mb-0">{t('wishlist.title')}</h1>
          <Link to="/discover" className="btn btn-sm btn-outline-secondary ms-auto">
            {t('wishlist.discoverCta')}
          </Link>
        </div>
        <p className="small text-muted mb-3">{t('wishlist.blurb')}</p>

        {message && <div className="alert alert-success small py-2">{message}</div>}

        {loading && <p className="small text-muted">{t('common.loading')}</p>}

        {!loading && items.length === 0 && (
          <div className="text-center py-4 text-muted">
            <div className="fs-3 mb-2">🔔</div>
            <p className="mb-2">{t('wishlist.empty')}</p>
            <Link to="/discover" className="btn btn-sm btn-dark">
              {t('wishlist.emptyCta')}
            </Link>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="d-flex flex-column gap-2">
            {items.map((it) => (
              <div key={it.id} className="card border-0 shadow-sm">
                <div className="card-body p-3 d-flex align-items-center gap-2">
                  <span aria-hidden style={{ fontSize: '1.25rem' }}>🕷️</span>
                  <div className="flex-grow-1 min-w-0">
                    <Link
                      to={`/discover/species/${it.speciesId}`}
                      className="fw-semibold text-decoration-none"
                      style={{ overflowWrap: 'anywhere' }}
                    >
                      {it.scientificName || t('wishlist.unknownSpecies')}
                    </Link>
                    {it.commonName && (
                      <div className="small text-muted text-truncate">{it.commonName}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger flex-shrink-0"
                    disabled={busyId === it.speciesId}
                    onClick={() => remove(it.speciesId)}
                  >
                    {busyId === it.speciesId ? t('common.saving') : t('wishlist.remove')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
