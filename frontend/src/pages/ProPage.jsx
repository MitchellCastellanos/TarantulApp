import Navbar from '../components/Navbar'
import ChitinCardFrame from '../components/ChitinCardFrame'
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
  const inTrial = billing?.inTrial === true || user?.inTrial === true
  const trialEndsAt = billing?.trialEndsAt ?? user?.trialEndsAt
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
    : 0
  const checkout = searchParams.get('checkout')
  const sessionId = searchParams.get('session_id')

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
  }, [user?.id])

  // Verify plan upgrade after successful checkout
  useEffect(() => {
    if (checkout !== 'success' || !user) return
    if (user.plan === 'PRO') return

    pollingRef.current = true
    setPolling(true)

    const verifyAndUpgrade = async () => {
      // If Stripe passed back a session_id, verify directly — no webhook dependency
      if (sessionId) {
        try {
          const data = await billingService.verifySession(sessionId)
          if (!pollingRef.current) return
          if (data.plan === 'PRO') {
            setBilling(prev => ({ ...(prev || {}), plan: 'PRO', checkoutEnabled: true }))
            setPlan('PRO')
            setPolling(false)
            return
          }
        } catch (_) {
          // fall through to polling
        }
      }

      // Fallback: poll billingService.me() up to 6 times
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
      setTimeout(poll, 1000)
    }

    verifyAndUpgrade()
    return () => { pollingRef.current = false }
  }, [checkout, user?.id, sessionId])

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
        <ChitinCardFrame showSilhouettes={false}>
        <div className="mb-3">
          <span className="badge bg-dark me-2">TarantulApp</span>
          <span className={`badge ${isPro ? 'bg-success' : 'bg-secondary'}`}>
            {isPro ? t('pro.currentPro') : t('pro.currentFree')}
          </span>
        </div>

        {user && inTrial && !isPro && (
          <div className="alert alert-info small py-2 mb-3">
            {t('dashboard.trialBanner')} · {t('pro.trialDaysLeft', { count: trialDaysLeft })}
          </div>
        )}

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
            <div className="alert mb-4 d-flex align-items-center gap-2 py-2" style={{ background: 'rgba(100,75,10,0.45)', color: '#ffdda0', border: '1px solid rgba(200,150,30,0.4)' }}>
              <div className="spinner-border spinner-border-sm flex-shrink-0" style={{ color: '#c9a84c' }} role="status" />
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
            <p className="text-muted mb-2">{t('pro.subtitle')}</p>
            {!isPro && inTrial && (
              <p className="small fw-semibold mb-3 pb-2"
                 style={{ color: 'var(--ta-gold)', borderBottom: '1px solid rgba(200, 170, 90, 0.35)' }}>
                {t('pro.pricingAfterTrial')}
              </p>
            )}
            {!isPro && !inTrial && (
              <p className="small fw-semibold mb-3 pb-2"
                 style={{ color: 'var(--ta-gold)', borderBottom: '1px solid rgba(200, 170, 90, 0.35)' }}>
                {t('pro.trialThenPricing')}
              </p>
            )}

            <div className="row g-3">
              <div className="col-md-6">
                <div className="border rounded p-3 h-100">
                  <h6 className="fw-bold mb-2">
                    {isPro ? t('pro.freeTitleCompare') : t('pro.freeTitle')}
                  </h6>
                  <ul className="small mb-0">
                    <li className="mb-2 fw-semibold" style={{ color: 'var(--ta-gold)' }}>{t('pro.freeTrialLine')}</li>
                    <li>{t('pro.freeLimit')}</li>
                    <li>{t('pro.freeReminders')}</li>
                    <li>{t('pro.freeQr')}</li>
                    <li>{t('pro.freeNoBulkQr')}</li>
                    <li>{t('pro.freeNoExcel')}</li>
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
                    <li className="fw-semibold mb-1" style={{ color: 'var(--ta-gold)' }}>{t('pro.proExcelExport')}</li>
                    <li>{t('pro.proUnlimited')}</li>
                    <li>{t('pro.proAutoReminders')}</li>
                    <li>{t('pro.proQrActions')}</li>
                    <li>{t('pro.proBulkQrWord')}</li>
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
            <p className="small text-muted mb-2">
              {isPro ? t('pro.statusPro') : t('pro.statusFree')}
            </p>
            {!isPro && user && !inTrial && (
              <p className="small text-muted mb-3">{t('pro.ctaRegisterTrialReminder')}</p>
            )}
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
                {!user ? (
                  <button
                    type="button"
                    className="btn btn-dark btn-sm align-self-start"
                    onClick={() => navigate('/login')}
                  >
                    {t('pro.loginToUpgrade', 'Login to upgrade')}
                  </button>
                ) : (
                  <>
                    <button
                      className="btn btn-dark btn-sm align-self-start"
                      onClick={handleUpgrade}
                      disabled={loadingCheckout || billing?.checkoutEnabled === false}
                    >
                      {loadingCheckout ? t('common.loading') : t('pro.upgradeNow')}
                    </button>
                    {billing?.checkoutEnabled === false && (
                      <p className="small text-muted mb-0">{t('pro.checkoutNotConfigured')}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        </ChitinCardFrame>
      </div>
    </div>
  )
}
