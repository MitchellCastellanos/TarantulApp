import Navbar from '../components/Navbar'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import billingService from '../services/billingService'

export default function ProPage() {
  const { t } = useTranslation()
  const { user, setPlan } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [billing, setBilling] = useState(null)
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [error, setError] = useState('')
  const plan = billing?.plan || user?.plan || 'FREE'

  const isPro = plan === 'PRO'
  const checkout = searchParams.get('checkout')

  const loadBilling = () => {
    billingService.me()
      .then(data => {
        setBilling(data)
        setPlan(data.plan)
      })
      .catch(() => {})
  }

  useEffect(() => {
    if (user) loadBilling()
  }, [user])

  const handleUpgrade = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    setError('')
    setLoadingCheckout(true)
    try {
      const session = await billingService.createCheckoutSession()
      if (!session?.url) throw new Error('checkout-url-missing')
      window.location.href = session.url
    } catch (e) {
      setError(t('pro.checkoutError'))
      setLoadingCheckout(false)
    }
  }

  return (
    <div>
      <Navbar />
      <div className="container mt-4" style={{ maxWidth: 720 }}>
        <div className="mb-3">
          <span className="badge bg-dark me-2">TarantulApp</span>
          <span className={`badge ${isPro ? 'bg-success' : 'bg-secondary'}`}>
            {isPro ? t('pro.currentPro') : t('pro.currentFree')}
          </span>
        </div>
        {checkout === 'success' && (
          <div className="alert alert-success small py-2">
            {t('pro.checkoutSuccess')}
          </div>
        )}
        {checkout === 'cancel' && (
          <div className="alert alert-warning small py-2">
            {t('pro.checkoutCancel')}
          </div>
        )}
        {error && (
          <div className="alert alert-danger small py-2">
            {error}
          </div>
        )}

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h4 className="fw-bold mb-2">{t('pro.title')}</h4>
            <p className="text-muted mb-3">{t('pro.subtitle')}</p>

            <div className="row g-3">
              <div className="col-md-6">
                <div className="border rounded p-3 h-100">
                  <h6 className="fw-bold mb-2">{t('pro.freeTitle')}</h6>
                  <ul className="small mb-0">
                    <li>{t('pro.freeLimit')}</li>
                    <li>{t('pro.freeReminders')}</li>
                    <li>{t('pro.freeQr')}</li>
                  </ul>
                </div>
              </div>
              <div className="col-md-6">
                <div className="border border-dark rounded p-3 h-100 position-relative">
                  <span className="badge bg-dark position-absolute" style={{ top: -10, right: 12 }}>
                    PRO
                  </span>
                  <h6 className="fw-bold mb-2">{t('pro.proTitle')}</h6>
                  <ul className="small mb-0">
                    <li>{t('pro.proUnlimited')}</li>
                    <li>{t('pro.proAutoReminders')}</li>
                    <li>{t('pro.proQrActions')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h6 className="fw-bold mb-2">{t('pro.statusTitle')}</h6>
            <p className="small text-muted mb-3">
              {isPro ? t('pro.statusPro') : t('pro.statusFree')}
            </p>
            {!isPro && (
              <div className="d-flex flex-column gap-2">
                <p className="small mb-0">{t('pro.soonPayments')}</p>
                <button
                  className="btn btn-dark btn-sm align-self-start"
                  onClick={handleUpgrade}
                  disabled={loadingCheckout || (user && billing?.checkoutEnabled === false)}
                >
                  {loadingCheckout ? t('common.loading') : !user ? t('pro.loginToUpgrade', 'Login to upgrade') : t('pro.upgradeNow')}
                </button>
                {billing?.checkoutEnabled === false && (
                  <p className="small text-muted mb-0">{t('pro.checkoutNotConfigured')}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

