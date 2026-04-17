import Navbar from '../components/Navbar'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import billingService from '../services/billingService'

export default function ProPage() {
  const { t } = useTranslation()
  const { user, setPlan } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [billing, setBilling] = useState(null)
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [error, setError] = useState('')
  const [interval, setInterval] = useState('month')
  const [polling, setPolling] = useState(false)
  const pollingRef = useRef(false)

  const plan = billing?.plan || user?.plan || 'FREE'
  const isPro = plan === 'PRO'
  const checkout = searchParams.get('checkout')

  const loadBilling = () => {
    return billingService.me()
      .then(data => {
        setBilling(data)
        setPlan(data.plan)
        return data
      })
      .catch(() => null)
  }

  useEffect(() => {
    if (user) loadBilling()
  }, [user])

  // Poll for plan upgrade after successful checkout
  useEffect(() => {
    if (checkout !== 'success' || !user) return
    if (user.plan === 'PRO') return // already upgraded, nothing to do

    pollingRef.current = true
    setPolling(true)
    let attempts = 0

    const poll = () => {
      if (!pollingRef.current) return
      attempts++
      billingService.me()
        .then(data => {
          if (!pollingRef.current) return
          if (data.plan === 'PRO') {
            setBilling(data)
            setPlan(data.plan)
            setPolling(false)
          } else if (attempts < 6) {
            setTimeout(poll, 2000)
          } else {
            setPolling(false)
          }
        })
        .catch(() => {
          if (pollingRef.current && attempts < 6) setTimeout(poll, 2000)
          else setPolling(false)
        })
    }

    const timer = setTimeout(poll, 1500)
    return () => { pollingRef.current = false; clearTimeout(timer) }
  }, [checkout, user?.id]) // user.id never changes — avoids infinite loop from setPlan re-triggering this effect

  const handleUpgrade = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    setError('')
    setLoadingCheckout(true)
    try {
      const session = await billingService.createCheckoutSession(interval)
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

        {/* Success screen */}
        {checkout === 'success' && (
          isPro ? (
            <div className="card border-0 shadow-sm mb-4" style={{ background: 'linear-gradient(135deg,#0d2b0d,#1a3d1a)', border: '1px solid #2d6a2d' }}>
              <div className="card-body p-4 text-center">
                <div style={{ fontSize: '3rem', marginBottom: 8 }}>🎉</div>
                <h4 className="fw-bold mb-2" style={{ color: '#a8d8b0' }}>{t('pro.checkoutSuccessTitle')}</h4>
                <p className="mb-3" style={{ color: '#c8e8d0' }}>{t('pro.checkoutSuccessBody')}</p>
                <div className="d-flex justify-content-center gap-2">
                  <span className="badge px-3 py-2" style={{ background: 'var(--ta-gold)', color: '#111', fontSize: '0.9rem' }}>
                    ⭐ Pro
                  </span>
                </div>
                <div className="mt-3">
                  <Link to="/" className="btn btn-sm btn-outline-light">{t('public.backToCollection')}</Link>
                </div>
              </div>
            </div>
          ) : polling ? (
            <div className="alert mb-4 d-flex align-items-center gap-2 py-2" style={{ background: '#fff3cd', color: '#664d03', border: '1px solid #ffda6a' }}>
              <div className="spinner-border spinner-border-sm flex-shrink-0" style={{ color: '#664d03' }} role="status" />
              <span className="small fw-semibold">{t('pro.checkoutUpdating')}</span>
            </div>
          ) : (
            <div className="alert alert-success small py-2">
              {t('pro.checkoutSuccess')}
            </div>
          )
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
                  <ul className="small mb-3">
                    <li>{t('pro.proUnlimited')}</li>
                    <li>{t('pro.proAutoReminders')}</li>
                    <li>{t('pro.proQrActions')}</li>
                  </ul>
                  <div className="border-top pt-2">
                    <span className="fw-bold">{t('pro.priceMonthly')}</span>
                    <span className="text-muted small ms-2">{t('pro.priceOr')}</span>
                    <div className="small text-muted">
                      {t('pro.priceYearly')}{' '}
                      <span className="badge bg-success" style={{ fontSize: '0.65rem' }}>
                        {t('pro.priceSaveLabel')}
                      </span>
                    </div>
                  </div>
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
              <div className="d-flex flex-column gap-3">
                <div className="d-flex gap-2">
                  <button
                    className={`btn btn-sm ${interval === 'month' ? 'btn-dark' : 'btn-outline-secondary'}`}
                    onClick={() => setInterval('month')}
                  >
                    {t('pro.priceMonthly')}
                  </button>
                  <button
                    className={`btn btn-sm ${interval === 'year' ? 'btn-dark' : 'btn-outline-secondary'}`}
                    onClick={() => setInterval('year')}
                  >
                    {t('pro.priceYearly')}{' '}
                    <span className="badge bg-success ms-1" style={{ fontSize: '0.65rem' }}>
                      {t('pro.priceSaveLabel')}
                    </span>
                  </button>
                </div>
                <button
                  className="btn btn-dark btn-sm align-self-start"
                  onClick={handleUpgrade}
                  disabled={loadingCheckout || (user && billing?.checkoutEnabled === false)}
                >
                  {loadingCheckout ? t('common.loading') : !user ? t('pro.loginToUpgrade', 'Login to upgrade') : t('pro.upgradeNow')}
                </button>
                {user && billing?.checkoutEnabled === false && (
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
