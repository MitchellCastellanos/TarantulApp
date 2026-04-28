import Navbar from '../components/Navbar'
import BrandName from '../components/BrandName'
import ChitinCardFrame from '../components/ChitinCardFrame'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import billingService from '../services/billingService'
import { trialCalendarDaysRemaining } from '../utils/trialDaysLeft'

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
  const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  const [androidToken, setAndroidToken] = useState('')
  const [androidProductId, setAndroidProductId] = useState(import.meta.env.VITE_ANDROID_PLAY_PRODUCT_ID || '')
  const [androidSyncing, setAndroidSyncing] = useState(false)
  const [androidMessage, setAndroidMessage] = useState('')

  const plan = billing?.plan || user?.plan || 'FREE'
  const isPro = plan === 'PRO'
  const inTrial = billing?.inTrial === true || user?.inTrial === true
  const trialEndsAt = billing?.trialEndsAt ?? user?.trialEndsAt
  const trialDaysLeft = trialEndsAt ? trialCalendarDaysRemaining(trialEndsAt) : 0
  const checkout = searchParams.get('checkout')
  const sessionId = searchParams.get('session_id')

  const loadBilling = () => {
    return billingService.me()
      .then((data) => {
        setBilling(data)
        setPlan(data.plan)
        return data
      })
      .catch(() => null)
  }

  useEffect(() => {
    if (user) loadBilling()
  }, [user?.id])

  useEffect(() => {
    if (checkout !== 'success' || !user) return
    if (user.plan === 'PRO') return

    pollingRef.current = true
    setPolling(true)

    const verifyAndUpgrade = async () => {
      if (sessionId) {
        try {
          const data = await billingService.verifySession(sessionId)
          if (!pollingRef.current) return
          if (data.plan === 'PRO') {
            setBilling((prev) => ({ ...(prev || {}), plan: 'PRO', checkoutEnabled: true }))
            setPlan('PRO')
            setPolling(false)
            return
          }
        } catch (_) {
          // fall through to polling
        }
      }

      let attempts = 0
      const poll = () => {
        if (!pollingRef.current) return
        attempts++
        billingService.me()
          .then((data) => {
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
    return () => {
      pollingRef.current = false
    }
  }, [checkout, user?.id, sessionId])

  const handleUpgrade = async () => {
    if (isAndroidNative) return
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

  const handleAndroidSync = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    setAndroidMessage('')
    setError('')
    if (!androidToken.trim()) {
      setAndroidMessage(t('pro.androidTokenRequired'))
      return
    }
    setAndroidSyncing(true)
    try {
      const data = await billingService.verifyGooglePlayPurchase({
        purchaseToken: androidToken.trim(),
        productId: androidProductId.trim(),
      })
      if (data?.plan === 'PRO') {
        await loadBilling()
        setAndroidMessage(t('pro.androidPurchaseSynced'))
      } else {
        setAndroidMessage(t('pro.androidPurchasePending'))
      }
    } catch (e) {
      const backendError = e?.response?.data?.error
      setAndroidMessage(
        t('pro.androidSyncErrorWithCode', {
          code: backendError || 'UNKNOWN',
        }),
      )
    } finally {
      setAndroidSyncing(false)
    }
  }

  const tierCard = ({ toneClass = '', titleKey, priceKey, taglineKey, listKeys, corner = null, footer = null }) => (
    <div className={`border rounded p-3 h-100 position-relative ${toneClass}`}>
      {corner}
      <h6 className="fw-bold mb-1">{t(titleKey)}</h6>
      {priceKey && <div className="fw-bold mb-2" style={{ color: 'var(--ta-gold)' }}>{t(priceKey)}</div>}
      {taglineKey && <p className="small text-muted mb-2" style={{ lineHeight: 1.45 }}>{t(taglineKey)}</p>}
      <ul className="small mb-0 ps-3" style={{ lineHeight: 1.5 }}>
        {listKeys.map((k) => (
          <li key={k} className="mb-1">{t(k)}</li>
        ))}
      </ul>
      {footer}
    </div>
  )

  return (
    <div>
      <Navbar />
      <div className="container mt-4" style={{ maxWidth: 1040 }}>
        <ChitinCardFrame showSilhouettes={false}>
          <div className="mb-3">
            <span className="badge bg-dark me-2">
              <BrandName />
            </span>
            <span className={`badge ${isPro ? 'bg-success' : 'bg-secondary'}`}>
              {isPro ? t('pro.currentPro') : t('pro.currentFree')}
            </span>
          </div>

          {user && inTrial && !isPro && (
            <div className="alert alert-info small py-2 mb-3">
              {t('dashboard.trialBanner')} · {t('pro.trialDaysLeft', { count: trialDaysLeft })}
            </div>
          )}

          {checkout === 'success' && (
            isPro ? (
              <div className="card border-0 shadow-sm mb-4" style={{ background: 'rgba(30,82,48,0.22)', border: '1px solid rgba(45,112,64,0.45)' }}>
                <div className="card-body p-4 text-center">
                  <div style={{ fontSize: '3rem', marginBottom: 8 }}>🎉</div>
                  <h4 className="fw-bold mb-2" style={{ color: 'var(--ta-green-light)' }}>{t('pro.checkoutSuccessTitle')}</h4>
                  <p className="mb-3" style={{ color: 'var(--ta-text)' }}>{t('pro.checkoutSuccessBody')}</p>
                  <div className="d-flex justify-content-center gap-2">
                    <span className="badge px-3 py-2" style={{ background: 'var(--ta-gold)', color: '#fff', fontSize: '0.9rem' }}>
                      ⭐ Pro
                    </span>
                  </div>
                  <div className="mt-3">
                    <Link to="/" className="btn btn-sm btn-outline-light">{t('public.backToCollection')}</Link>
                  </div>
                </div>
              </div>
            ) : polling ? (
              <div className="alert alert-warning mb-4 d-flex align-items-center gap-2 py-2">
                <div className="spinner-border spinner-border-sm flex-shrink-0" style={{ color: 'var(--ta-gold)' }} role="status" />
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
              {!isPro && inTrial && (
                <p className="small fw-semibold mb-3 pb-2 ta-accent-heading" style={{ borderBottom: '1px solid var(--ta-border-gold)' }}>
                  {t('pro.pricingAfterTrial')}
                </p>
              )}
              {!isPro && !inTrial && (
                <p className="small fw-semibold mb-3 pb-2 ta-accent-heading" style={{ borderBottom: '1px solid var(--ta-border-gold)' }}>
                  {t('pro.trialThenPricing')}
                </p>
              )}

              <p className="small mb-3" style={{ lineHeight: 1.55 }}>{t('pro.planMatrixIntro')}</p>

              <div className="row g-3 mb-3">
                <div className="col-lg-4 col-md-6">
                  {tierCard({
                    titleKey: 'pro.tierFreeTitle',
                    taglineKey: 'pro.tierFreeTagline',
                    listKeys: ['pro.tierFreeLi1', 'pro.tierFreeLi2', 'pro.tierFreeLi3', 'pro.tierFreeLi4', 'pro.tierFreeLi5'],
                  })}
                </div>
                <div className="col-lg-4 col-md-6">
                  {tierCard({
                    titleKey: 'pro.tierProTitle',
                    priceKey: 'pro.tierProPrice',
                    taglineKey: 'pro.tierProTagline',
                    listKeys: ['pro.tierProLi1', 'pro.tierProLi2', 'pro.tierProLi3', 'pro.tierProLi4', 'pro.tierProLi5', 'pro.tierProLi6'],
                    corner: <span className="badge bg-dark position-absolute" style={{ top: 8, right: 10 }}>PRO</span>,
                  })}
                </div>
                <div className="col-lg-4 col-md-6">
                  {tierCard({
                    titleKey: 'pro.tierVendorTitle',
                    priceKey: 'pro.tierVendorPrice',
                    taglineKey: 'pro.tierVendorTagline',
                    listKeys: ['pro.tierVendorLi1', 'pro.tierVendorLi2', 'pro.tierVendorLi3', 'pro.tierVendorLi4'],
                    footer: (
                      <div className="mt-2">
                        <span className="badge bg-secondary">{t('pro.tierSoon')}</span>
                      </div>
                    ),
                  })}
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
                  {isAndroidNative ? (
                    <div className="border rounded p-3" style={{ borderColor: 'var(--ta-border)' }}>
                      <p className="small mb-2">{t('pro.androidPurchaseUnavailable')}</p>
                      <p className="small text-muted mb-3">{t('pro.androidPlaceholderHelp')}</p>
                      {!user ? (
                        <button
                          type="button"
                          className="btn btn-dark btn-sm align-self-start"
                          onClick={() => navigate('/login')}
                        >
                          {t('pro.loginToUpgrade', 'Login to upgrade')}
                        </button>
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          <label className="small mb-0">{t('pro.androidProductIdLabel')}</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={androidProductId}
                            onChange={(e) => setAndroidProductId(e.target.value)}
                            placeholder="tarantulapp_pro_monthly"
                          />
                          <label className="small mb-0 mt-1">{t('pro.androidTokenLabel')}</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={androidToken}
                            onChange={(e) => setAndroidToken(e.target.value)}
                            placeholder="test_..."
                          />
                          <div className="d-flex gap-2 mt-2">
                            <button
                              type="button"
                              className="btn btn-dark btn-sm"
                              onClick={handleAndroidSync}
                              disabled={androidSyncing}
                            >
                              {androidSyncing ? t('common.loading') : t('pro.androidSyncButton')}
                            </button>
                          </div>
                          {androidMessage && <p className="small text-muted mb-0">{androidMessage}</p>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="small fw-semibold mb-1">{t('pro.checkoutProLabel')}</div>
                        <div className="d-flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={`btn btn-sm ${interval === 'month' ? 'btn-dark' : 'btn-outline-secondary'}`}
                            onClick={() => setInterval('month')}
                          >
                            {t('pro.priceMonthly')}
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${interval === 'year' ? 'btn-dark' : 'btn-outline-secondary'}`}
                            onClick={() => setInterval('year')}
                          >
                            {t('pro.priceYearly')}{' '}
                            <span className="badge bg-success ms-1" style={{ fontSize: '0.65rem' }}>
                              {t('pro.priceSaveLabel')}
                            </span>
                          </button>
                        </div>
                        <div className="small text-muted mt-1">{t('pro.priceYearlyNote')}</div>
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
                            type="button"
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
