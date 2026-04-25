import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import marketplaceService from '../services/marketplaceService'

/** Old marketplace keeper URLs ? canonical public keeper card at `/u/:handle`. */
export default function MarketplaceKeeperRedirect() {
  const { t } = useTranslation()
  const { sellerUserId } = useParams()
  const [target, setTarget] = useState(null)

  useEffect(() => {
    let cancelled = false
    const id = String(sellerUserId || '').trim()
    if (!id) {
      setTarget('/marketplace')
      return undefined
    }
    marketplaceService
      .getKeeperPublic(id)
      .then((data) => {
        if (cancelled) return
        const h = String(data?.profile?.handle || '').trim()
        setTarget(h ? `/u/${encodeURIComponent(h)}` : '/marketplace')
      })
      .catch(() => {
        if (!cancelled) setTarget('/marketplace')
      })
    return () => {
      cancelled = true
    }
  }, [sellerUserId])

  if (target === null) {
    return (
      <div>
        <Navbar variant="public" />
        <div className="container mt-4 text-muted small">{t('public.keeperLoading')}</div>
      </div>
    )
  }

  return <Navigate to={target} replace />
}
