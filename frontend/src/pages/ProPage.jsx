import Navbar from '../components/Navbar'
import BrandName from '../components/BrandName'
import ChitinCardFrame from '../components/ChitinCardFrame'
import ProDaysSummaryCard from '../components/ProDaysSummaryCard'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState, useRef, useMemo } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import billingService from '../services/billingService'
import { trialCalendarDaysRemaining } from '../utils/trialDaysLeft'
import {
  BILLING_REGION_CODES,
  inferBillingRegion,
  isVendorDynamicTierRegion,
  isVendorFlatCheckoutRegion,
  isVendorProgramRegion,
} from '../utils/inferBillingRegion'

const REGION_OVERRIDE_KEY = 'tarantulapp-billing-region-override'

export default function ProPage() {
  const { t } = useTranslation()
  const { user, setPlan } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [billing, setBilling] = useState(null)
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [error, setError] = useState('')
  const [interval, setInterval] = useState('month')
  const detectedRegion = useMemo(() => inferBillingRegion(), [])
  const [regionOverride, setRegionOverride] = useState(() => {
    try {
      const s = localStorage.getItem(REGION_OVERRIDE_KEY)
      if (s && BILLING_REGION_CODES.includes(s)) return s
    } catch (_) {
      /* ignore */
    }
    return null
  })
  const billingRegion = regionOverride ?? detectedRegion
  const vendorProgramAvailable = isVendorProgramRegion(billingRegion)
  const vendorDynamicTier = isVendorDynamicTierRegion(billingRegion)
  const vendorFlatCheckout = isVendorFlatCheckoutRegion(billingRegion)
  const [vendorMxTier, setVendorMxTier] = useState(null)
  const [polling, setPolling] = useState(false)
  const pollingRef = useRef(false)
  const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  const [androidSyncing, setAndroidSyncing] = useState(false)
  const [androidMessage, setAndroidMessage] = useState('')
  const [vendorActivateBusy, setVendorActivateBusy] = useState(false)
  const [vendorActivateMessage, setVendorActivateMessage] = useState('')

  const vendorTierListKeys = useMemo(() => {
    const li5 = vendorDynamicTier ? 'pro.tierVendorLi5Mx' : 'pro.tierVendorLi5Flat'
    return [
      'pro.tierVendorLi1',
      'pro.tierVendorLi2',
      'pro.tierVendorLi3',
      'pro.tierVendorLi4',
      li5,
      'pro.tierVendorLi6',
    ]
  }, [vendorDynamicTier])

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

  const loadVendorMxTier = () => {
    if (!user || billingRegion !== 'MX') {
      setVendorMxTier(null)
      return Promise.resolve(null)
    }
    return billingService.vendorMxTier()
      .then((data) => {
        setVendorMxTier(data)
        return data
      })
      .catch(() => {
        setVendorMxTier(null)
        return null
      })
  }

  useEffect(() => {
    if (user) {
      loadBilling().finally(() => {
        setLoadingCheckout(false)
      })
      loadVendorMxTier()
    }
  }, [user?.id, billingRegion])

  useEffect(() => {
    try {
      if (regionOverride) localStorage.setItem(REGION_OVERRIDE_KEY, regionOverride)
      else localStorage.removeItem(REGION_OVERRIDE_KEY)
    } catch (_) {
      /* ignore */
    }
  }, [regionOverride])

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

  const isVendor = billing?.verifiedBreeder === true
  const mxStarterEligible = vendorDynamicTier
    && vendorMxTier
    && !vendorMxTier.requiresPaidSubscription

  const handleActivateMxStarter = async () => {
    if (!user) {
      navigate('/login', { state: { redirectAfterAuth: '/pro' } })
      return
    }
    setVendorActivateMessage('')
    setVendorActivateBusy(true)
    try {
      await billingService.activateVendorMxStarter(billingRegion)
      await loadBilling()
      setVendorActivateMessage(t('pro.vendorMxStarterActivated'))
    } catch (err) {
      const code = err?.response?.data?.error
      if (code === 'USER_ALREADY_VENDOR') {
        setVendorActivateMessage(t('pro.vendorInviteAlreadyVendor'))
      } else if (code === 'VENDOR_PAID_TIER_CHECKOUT_REQUIRED') {
        setError(t('pro.vendorMxStarterHint'))
      } else if (code === 'VENDOR_MX_STARTER_ONLY') {
        setVendorActivateMessage(t('pro.vendorMxStarterRegionOnly'))
      } else {
        setVendorActivateMessage(t('pro.vendorActivateError'))
      }
    } finally {
      setVendorActivateBusy(false)
    }
  }

  const handleVendorCheckout = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    if (!vendorProgramAvailable) return
    if (vendorDynamicTier && vendorMxTier && !vendorMxTier.requiresPaidSubscription) {
      setError(t('pro.vendorMxStarterHint'))
      return
    }
    setError('')
    setLoadingCheckout(true)
    try {
      const checkoutInterval = vendorDynamicTier ? 'month' : interval
      const session = await billingService.createCheckoutSession(checkoutInterval, billingRegion, 'vendor')
      if (!session?.url) {
        if (session?.error === 'VENDOR_CHECKOUT_NOT_AVAILABLE_IN_REGION') {
          setError(t('pro.vendorCheckoutNotInRegion'))
        } else if (session?.error === 'VENDOR_MX_STARTER_NO_CHECKOUT') {
          setError(t('pro.vendorMxStarterHint'))
        } else if (session?.error === 'VENDOR_MX_MONTHLY_ONLY') {
          setError(t('pro.vendorMxMonthlyOnly'))
        } else {
          throw new Error('checkout-url-missing')
        }
        return
      }
      window.location.href = session.url
    } catch (e) {
      setError(t('pro.checkoutError'))
      setLoadingCheckout(false)
    }
  }

  const handleUpgrade = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    if (isAndroidNative) {
      handleAndroidPurchase()
      return
    }

    setError('')
    setLoadingCheckout(true)
    try {
      const session = await billingService.createCheckoutSession(interval, billingRegion)
      if (!session?.url) throw new Error('checkout-url-missing')
      window.location.href = session.url
    } catch (e) {
      setError(t('pro.checkoutError'))
      setLoadingCheckout(false)
    }
  }

  const handleAndroidPurchase = async () => {
    if (!window.CdvPurchase) {
      setAndroidMessage(t('pro.androidPurchaseUnavailable'))
      return
    }

    const { store, ProductType, Platform } = window.CdvPurchase
    const productId = import.meta.env.VITE_ANDROID_PLAY_PRODUCT_ID || 'tarantulapp_pro_monthly'

    setAndroidSyncing(true)
    setAndroidMessage(t('pro.androidStartingPurchase'))

    store.register([{
      id: productId,
      type: ProductType.PAID_SUBSCRIPTION,
      platform: Platform.GOOGLE_PLAY,
    }])

    store.when()
      .approved(async (transaction) => {
        setAndroidMessage(t('pro.androidVerifyingPurchase'))
        try {
          const data = await billingService.verifyGooglePlayPurchase({
            purchaseToken: transaction.purchaseToken,
            productId: productId,
          })
          if (data?.plan === 'PRO') {
            await loadBilling()
            setAndroidMessage(t('pro.androidPurchaseSynced'))
            transaction.finish()
          } else {
            setAndroidMessage(t('pro.androidPurchasePending'))
          }
        } catch (e) {
          setAndroidMessage(t('pro.androidSyncError'))
        } finally {
          setAndroidSyncing(false)
        }
      })
      .cancelled(() => {
        setAndroidMessage(t('pro.checkoutCancel'))
        setAndroidSyncing(false)
      })
      .error((err) => {
        setAndroidMessage(err.message)
        setAndroidSyncing(false)
      })

    store.initialize([Platform.GOOGLE_PLAY])
      .then(() => {
        const product = store.get(productId)
        if (product && product.canPurchase) {
          product.getOffer().order()
        } else {
          setAndroidMessage(t('pro.androidProductUnavailable'))
          setAndroidSyncing(false)
        }
      })
      .catch((err) => {
        setAndroidMessage(err.message)
        setAndroidSyncing(false)
      })
  }

  const tierCard = ({
    toneClass = '',
    titleKey,
    priceKey,
    priceOverride,
    taglineKey,
    listKeys,
    corner = null,
    footer = null,
  }) => (
    <div className={`border rounded p-3 h-100 position-relative ${toneClass}`}>
      {corner}
      <h6 className="fw-bold mb-1">{t(titleKey)}</h6>
      {(priceOverride || priceKey) && (
        <div className="fw-bold mb-2" style={{ color: 'var(--ta-gold)' }}>
          {priceOverride || t(priceKey)}
        </div>
      )}
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

          {user && <ProDaysSummaryCard />}

          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h4 className="fw-bold mb-2">{t('pro.title')}</h4>
              <p className="text-muted mb-3">{t('pro.subtitle')}</p>
              {!isPro && inTrial && (
                <p className="small fw-semibold mb-3 pb-2 ta-accent-heading" style={{ borderBottom: '1px solid var(--ta-border-gold)' }}>
                  {t('pro.pricingAfterTrial')}
                </p>
              )}

              <p className="small mb-2" style={{ lineHeight: 1.55 }}>
                {t('pro.planMatrixIntro')}
              </p>
              <p className="small text-muted mb-3">
                {t('pro.priceShownFor', { place: t(`pro.regions.${billingRegion}.countryName`) })}
                {' '}
                <span className="text-muted">({t(`pro.regions.${billingRegion}.taxNote`)})</span>
              </p>

              <div className="row g-3 mb-3">
                <div className="col-lg-4 col-md-6">
                  {tierCard({
                    titleKey: 'pro.tierFreeTitle',
                    taglineKey: 'pro.tierFreeTagline',
                    listKeys: ['pro.tierFreeLi1', 'pro.tierFreeLi2', 'pro.tierFreeLi3', 'pro.tierFreeLi4', 'pro.tierFreeLi5', 'pro.tierFreeLi6'],
                  })}
                </div>
                <div className="col-lg-4 col-md-6">
                  {tierCard({
                    titleKey: 'pro.tierProTitle',
                    priceOverride: t(`pro.regions.${billingRegion}.tierHeadline`),
                    taglineKey: 'pro.tierProTagline',
                    listKeys: ['pro.tierProLi1', 'pro.tierProLi2', 'pro.tierProLi3', 'pro.tierProLi4', 'pro.tierProLi5', 'pro.tierProLi6', 'pro.tierProLi7'],
                    corner: <span className="badge bg-dark position-absolute" style={{ top: 8, right: 10 }}>PRO</span>,
                  })}
                </div>
                <div className="col-lg-4 col-md-6">
                  {tierCard({
                    titleKey: 'pro.tierVendorTitle',
                    priceOverride: t(`pro.regions.${billingRegion}.vendorTierHeadline`, {
                      defaultValue: t('pro.tierVendorPrice'),
                    }),
                    taglineKey: 'pro.tierVendorTagline',
                    listKeys: vendorTierListKeys,
                    footer: (
                      <div className="mt-2 d-flex flex-column gap-2">
                        {vendorProgramAvailable ? (
                          <>
                            <span className="badge bg-success align-self-start">{t('pro.tierLive')}</span>
                            {vendorDynamicTier ? (
                              <>
                                <p className="small text-muted mb-1">{t('pro.vendorMxTierBlurb')}</p>
                                {vendorMxTier ? (
                                  <p className="small mb-1">
                                    <strong>{t(`pro.vendorMxTier.${vendorMxTier.tier}`, { defaultValue: vendorMxTier.tier })}</strong>
                                    {' · '}
                                    {t('pro.vendorMxSoldCount', { count: vendorMxTier.soldLast30Days ?? 0 })}
                                    {vendorMxTier.monthlyMxn > 0
                                      ? ` · ${t('pro.vendorMxMonthlyDue', { amount: vendorMxTier.monthlyMxn })}`
                                      : ` · ${t('pro.vendorMxStarterFree')}`}
                                  </p>
                                ) : null}
                                <ul className="small text-muted mb-1 ps-3" style={{ lineHeight: 1.4 }}>
                                  <li>{t('pro.vendorMxTierRowStarter')}</li>
                                  <li>{t('pro.vendorMxTierRowActivo')}</li>
                                  <li>{t('pro.vendorMxTierRowPlus')}</li>
                                  <li>{t('pro.vendorMxTierRowProShop')}</li>
                                </ul>
                              </>
                            ) : null}
                            {user && !isAndroidNative && vendorFlatCheckout ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-warning align-self-start"
                                disabled={loadingCheckout || billing?.checkoutEnabled === false}
                                onClick={handleVendorCheckout}
                              >
                                {loadingCheckout ? t('common.loading') : t('pro.vendorSubscribeCta')}
                              </button>
                            ) : null}
                            {user && !isAndroidNative && vendorDynamicTier
                              && vendorMxTier?.requiresPaidSubscription
                              && vendorMxTier?.stripeCheckoutAvailable !== false ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-warning align-self-start"
                                disabled={loadingCheckout || billing?.checkoutEnabled === false}
                                onClick={handleVendorCheckout}
                              >
                                {loadingCheckout
                                  ? t('common.loading')
                                  : t('pro.vendorMxSubscribeCta', { amount: vendorMxTier.monthlyMxn })}
                              </button>
                            ) : null}
                            <a href="#vendor-activation" className="btn btn-sm btn-outline-light align-self-start">
                              {t('pro.vendorActivationSellCta')}
                            </a>
                          </>
                        ) : (
                          <>
                            <span className="badge bg-secondary align-self-start">{t('pro.tierSoon')}</span>
                            <p className="small text-muted mb-0">{t('pro.vendorTierComingSoon')}</p>
                          </>
                        )}
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
              <div id="vendor-activation" className="border rounded p-3 mb-3" style={{ borderColor: 'var(--ta-border)', scrollMarginTop: 96 }}>
                <div className="small fw-semibold mb-2">{t('pro.vendorActivationTitle')}</div>
                {isVendor ? (
                  <>
                    <p className="small text-muted mb-2">{t('pro.vendorActiveBody')}</p>
                    <div className="d-flex flex-wrap gap-2">
                      <Link to="/marketplace/sell" className="btn btn-sm btn-dark">
                        {t('pro.vendorActivationSellCta')}
                      </Link>
                    </div>
                  </>
                ) : vendorProgramAvailable ? (
                  <>
                    <p className="small text-muted mb-2">{t('pro.vendorActivationBody')}</p>
                    <ol className="small mb-2 ps-3" style={{ lineHeight: 1.45 }}>
                      <li>
                        {mxStarterEligible
                          ? t('pro.vendorActivationStep1MxStarter')
                          : t('pro.vendorActivationStep1Subscribe')}
                      </li>
                      <li>{t('pro.vendorActivationStep2Storefront')}</li>
                      <li>{t('pro.vendorActivationStep3Verification')}</li>
                    </ol>
                    <div className="d-flex flex-wrap gap-2 align-items-center">
                      {mxStarterEligible ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-warning"
                          disabled={vendorActivateBusy}
                          onClick={handleActivateMxStarter}
                        >
                          {vendorActivateBusy ? t('common.loading') : t('pro.vendorMxStarterActivateCta')}
                        </button>
                      ) : (
                        user && !isAndroidNative && (
                          <button
                            type="button"
                            className="btn btn-sm btn-warning"
                            disabled={loadingCheckout || billing?.checkoutEnabled === false}
                            onClick={handleVendorCheckout}
                          >
                            {loadingCheckout ? t('common.loading') : t('pro.vendorSubscribeCta')}
                          </button>
                        )
                      )}
                      <Link to="/marketplace/sell" className="btn btn-sm btn-outline-secondary">
                        {t('pro.vendorActivationSellCta')}
                      </Link>
                    </div>
                    {billing?.vendorInvitePending ? (
                      <p className="small text-muted mb-0 mt-2">{t('pro.vendorTeamInvitePending')}</p>
                    ) : null}
                    <details className="small mt-2">
                      <summary className="text-muted" style={{ cursor: 'pointer' }}>
                        {t('pro.vendorTeamInviteHintTitle')}
                      </summary>
                      <p className="text-muted mb-0 mt-1" style={{ lineHeight: 1.5 }}>
                        {t('pro.vendorTeamInviteHintBody')}
                      </p>
                    </details>
                  </>
                ) : (
                  <p className="small text-muted mb-0">{t('pro.vendorCheckoutNotInRegion')}</p>
                )}
                {vendorActivateMessage ? (
                  <p className="small text-muted mb-0 mt-2">{vendorActivateMessage}</p>
                ) : null}
              </div>
              {!isPro && user && !inTrial && (
                <p className="small text-muted mb-3">{t('pro.ctaRegisterTrialReminder')}</p>
              )}
              {!isPro && (
                <div className="d-flex flex-column gap-3">
                  {isAndroidNative ? (
                    <div className="border rounded p-3" style={{ borderColor: 'var(--ta-border)' }}>
                      <p className="small mb-2">{t('pro.androidPurchaseTitle', 'Google Play Billing')}</p>
                      <p className="small text-muted mb-3">{t('pro.androidPurchaseBody', 'Upgrade to Pro directly through your Google account.')}</p>
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
                          <button
                            type="button"
                            className="btn btn-dark btn-sm align-self-start"
                            onClick={handleUpgrade}
                            disabled={androidSyncing}
                          >
                            {androidSyncing ? t('common.loading') : t('pro.upgradeNow')}
                          </button>
                          {androidMessage && <p className="small text-muted mb-0 mt-2">{androidMessage}</p>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div
                        className="rounded-3 border p-3 mb-1"
                        style={{
                          borderColor: 'var(--ta-border)',
                          background: 'color-mix(in srgb, var(--ta-bg-card) 92%, transparent)',
                        }}
                      >
                        <div className="fw-semibold small mb-2">{t('pro.checkoutProLabel')}</div>
                        <p className="small text-muted mb-3" style={{ lineHeight: 1.55 }}>
                          {t('pro.checkoutBillingExplainer', {
                            country: t(`pro.regions.${billingRegion}.countryName`),
                          })}
                        </p>
                        <details className="small mb-3">
                          <summary className="text-muted" style={{ cursor: 'pointer' }}>
                            {t('pro.changeBillingRegion')}
                          </summary>
                          <label className="form-label small mb-1 mt-2">{t('pro.billingRegionManualLabel')}</label>
                          <select
                            className="form-select form-select-sm"
                            style={{ maxWidth: 320 }}
                            value={regionOverride || ''}
                            onChange={(e) => {
                              const v = e.target.value
                              setRegionOverride(v === '' ? null : v)
                            }}
                            disabled={loadingCheckout}
                          >
                            <option value="">{t('pro.useAutoRegion')}</option>
                            {BILLING_REGION_CODES.map((code) => (
                              <option key={code} value={code}>
                                {t(`pro.regions.${code}.countryName`)}
                              </option>
                            ))}
                          </select>
                        </details>
                        <div className="d-flex flex-wrap gap-2 align-items-center">
                          <button
                            type="button"
                            className={`btn btn-sm ${interval === 'month' ? 'btn-dark' : 'btn-outline-secondary'}`}
                            onClick={() => setInterval('month')}
                          >
                            {t(`pro.regions.${billingRegion}.priceMonthly`)}
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${interval === 'year' ? 'btn-dark' : 'btn-outline-secondary'}`}
                            onClick={() => setInterval('year')}
                          >
                            {t(`pro.regions.${billingRegion}.priceYearly`)}{' '}
                            <span className="badge bg-success ms-1">
                              {t(`pro.regions.${billingRegion}.saveLabel`)}
                            </span>
                          </button>
                        </div>
                        <p className="small text-muted mt-3 mb-0" style={{ lineHeight: 1.45 }}>
                          {t('pro.priceYearlyNote')}
                        </p>
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
