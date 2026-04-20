import Navbar from '../components/Navbar'
import ChitinCardFrame from '../components/ChitinCardFrame'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import billingService from '../services/billingService'
import authService from '../services/authService'
import tarantulaService from '../services/tarantulaService'
import { APP_LANGS, LOGIN_LANG_LABELS } from '../constants/languages'
import { appLangBase } from '../utils/appLanguage'
import { DEFAULT_SUPPORT_EMAIL } from '../constants/publicContact'

function formatPeriodEnd(value, lang) {
  if (value == null) return null
  const d = typeof value === 'string' ? new Date(value) : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(lang, { dateStyle: 'medium' })
}

function mapRequestError(error, t) {
  const data = error?.response?.data
  if (data?.fields && typeof data.fields === 'object') {
    const firstKey = Object.keys(data.fields)[0]
    const msg = firstKey ? data.fields[firstKey] : null
    if (msg) {
      return t(`account.errors.${msg}`, { defaultValue: t('account.errors.generic') })
    }
  }
  const code = data?.error
  if (typeof code === 'string') {
    return t(`account.errors.${code}`, { defaultValue: t('account.errors.generic') })
  }
  return t('account.errors.generic')
}

export default function AccountPage() {
  const { t, i18n } = useTranslation()
  const { user, logout, setPlan } = useAuth()
  const navigate = useNavigate()
  const [billing, setBilling] = useState(null)
  const [tarantulas, setTarantulas] = useState([])
  const [loadingBilling, setLoadingBilling] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const appVersion = import.meta.env.VITE_APP_VERSION || '0.1.0'
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL

  const loadBilling = useCallback(() => {
    // user?.id (no el objeto user): setPlan() tras /billing/me crea un nuevo objeto user en el
    // contexto; si dependemos de `user`, useCallback cambia → useEffect vuelve a disparar → bucle
    // y loadingBilling queda casi siempre en true (ProPage ya usa [user?.id]).
    if (!user?.id) {
      setLoadingBilling(false)
      return Promise.resolve()
    }
    setLoadingBilling(true)
    return billingService
      .me()
      .then((data) => {
        setBilling(data)
        if (data?.plan) setPlan(data.plan)
        return data
      })
      .catch(() => null)
      .finally(() => setLoadingBilling(false))
  }, [user?.id, setPlan])

  useEffect(() => {
    loadBilling()
  }, [loadBilling])

  useEffect(() => {
    if (!user) return
    tarantulaService
      .getAll()
      .then((list) => setTarantulas(Array.isArray(list) ? list : []))
      .catch(() => setTarantulas([]))
  }, [user])

  const plan = billing?.plan || user?.plan || 'FREE'
  const isPro = plan === 'PRO'
  const publicSpiders = tarantulas.filter((x) => x?.isPublic && x?.shortId)

  const handlePortal = async () => {
    setPortalError('')
    setPortalLoading(true)
    try {
      const data = await billingService.createPortalSession()
      if (data?.url) {
        window.location.href = data.url
        return
      }
    } catch (e) {
      setPortalError(mapRequestError(e, t))
    } finally {
      setPortalLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)
    if (newPassword !== confirmPassword) {
      setPasswordError(t('account.password.mismatch'))
      return
    }
    if (newPassword.length < 6) {
      setPasswordError(t('auth.passwordTooShort'))
      return
    }
    setPasswordSubmitting(true)
    try {
      await authService.changePassword({ currentPassword, newPassword })
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(mapRequestError(err, t))
    } finally {
      setPasswordSubmitting(false)
    }
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div>
      <Navbar />
      <div className="container mt-4 mb-5" style={{ maxWidth: 720 }}>
        <ChitinCardFrame showSilhouettes={false}>
          <h1 className="h3 fw-bold mb-4" style={{ color: 'var(--ta-parchment)' }}>
            {t('account.title')}
          </h1>

          <section className="mb-4 pb-4 border-bottom" style={{ borderColor: 'var(--ta-border)' }}>
            <h2 className="h6 fw-bold text-uppercase mb-3" style={{ color: 'var(--ta-gold)', letterSpacing: '0.06em' }}>
              {t('account.sections.profile')}
            </h2>
            <p className="small mb-1">
              <span className="text-muted">{t('auth.email')}: </span>
              <span>{user.email}</span>
            </p>
            <p className="small mb-0">
              <span className="text-muted">{t('auth.name')}: </span>
              <span>{user.displayName || t('account.profile.noName')}</span>
            </p>
          </section>

          <section className="mb-4 pb-4 border-bottom" style={{ borderColor: 'var(--ta-border)' }}>
            <h2 className="h6 fw-bold text-uppercase mb-3" style={{ color: 'var(--ta-gold)', letterSpacing: '0.06em' }}>
              {t('account.sections.subscription')}
            </h2>
            {loadingBilling ? (
              <p className="small text-muted mb-0">{t('common.loading')}</p>
            ) : (
              <>
                <p className="small mb-2">
                  <span className={`badge ${isPro ? 'bg-success' : 'bg-secondary'} me-2`}>
                    {isPro ? t('account.billing.planPro') : t('account.billing.planFree')}
                  </span>
                </p>
                {billing?.subscriptionStatus && (
                  <p className="small mb-1">
                    {t('account.billing.stripeStatus')}:{' '}
                    <span className="text-uppercase">{billing.subscriptionStatus}</span>
                  </p>
                )}
                {billing?.currentPeriodEnd && (
                  <p className="small mb-1 text-muted">
                    {t('account.billing.periodEnd')}: {formatPeriodEnd(billing.currentPeriodEnd, i18n.language)}
                  </p>
                )}
                {billing?.cancelAtPeriodEnd === true && (
                  <p className="small mb-2" style={{ color: '#f0c674' }}>
                    {t('account.billing.cancelScheduled')}
                  </p>
                )}
                {portalError && (
                  <div className="alert alert-danger py-2 small mb-2" role="alert">
                    {portalError}
                  </div>
                )}
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {isPro && billing?.portalAvailable && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-light"
                      disabled={portalLoading}
                      onClick={handlePortal}
                    >
                      {portalLoading ? t('common.loading') : t('account.billing.manageBilling')}
                    </button>
                  )}
                  {isPro && !billing?.portalAvailable && (
                    <p className="small text-muted mb-0">{t('account.billing.portalUnavailable')}</p>
                  )}
                  {!isPro && (
                    <Link to="/pro" className="btn btn-sm btn-dark">
                      {t('account.billing.viewPlans')}
                    </Link>
                  )}
                </div>
              </>
            )}
          </section>

          <section className="mb-4 pb-4 border-bottom" style={{ borderColor: 'var(--ta-border)' }}>
            <h2 className="h6 fw-bold text-uppercase mb-3" style={{ color: 'var(--ta-gold)', letterSpacing: '0.06em' }}>
              {t('account.sections.security')}
            </h2>
            <form onSubmit={handleChangePassword} className="small" style={{ maxWidth: 420 }}>
              {passwordError && (
                <div className="alert alert-danger py-2 small mb-2" role="alert">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="alert alert-success py-2 small mb-2" role="status">
                  {t('account.password.success')}
                </div>
              )}
              <div className="mb-2">
                <label className="form-label mb-1">{t('account.password.current')}</label>
                <input
                  type="password"
                  className="form-control form-control-sm"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="mb-2">
                <label className="form-label mb-1">{t('account.password.new')}</label>
                <input
                  type="password"
                  className="form-control form-control-sm"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="mb-3">
                <label className="form-label mb-1">{t('account.password.confirm')}</label>
                <input
                  type="password"
                  className="form-control form-control-sm"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <button type="submit" className="btn btn-sm btn-outline-light" disabled={passwordSubmitting}>
                {passwordSubmitting ? t('common.saving') : t('account.password.submit')}
              </button>
            </form>
          </section>

          <section className="mb-4 pb-4 border-bottom" style={{ borderColor: 'var(--ta-border)' }}>
            <h2 className="h6 fw-bold text-uppercase mb-3" style={{ color: 'var(--ta-gold)', letterSpacing: '0.06em' }}>
              {t('account.sections.preferences')}
            </h2>
            <p className="small text-muted mb-2">{t('nav.lang')}</p>
            <div className="d-flex gap-1 flex-wrap">
              {APP_LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  title={LOGIN_LANG_LABELS[l.code]}
                  aria-label={LOGIN_LANG_LABELS[l.code]}
                  onClick={() => i18n.changeLanguage(l.code)}
                  className="btn btn-sm px-2 py-1 border-0"
                  style={{
                    background: 'transparent',
                    color: appLangBase(i18n.language) === l.code ? 'var(--ta-gold)' : 'rgba(255,255,255,0.45)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  {l.flag} {l.display}
                </button>
              ))}
            </div>
          </section>

          <section className="mb-4 pb-4 border-bottom" style={{ borderColor: 'var(--ta-border)' }}>
            <h2 className="h6 fw-bold text-uppercase mb-3" style={{ color: 'var(--ta-gold)', letterSpacing: '0.06em' }}>
              {t('account.sections.links')}
            </h2>
            <ul className="small mb-0 ps-3">
              <li className="mb-2">
                <Link to="/reminders" style={{ color: 'var(--ta-gold)' }}>
                  {t('account.links.reminders')}
                </Link>
              </li>
              {publicSpiders.length > 0 && (
                <li className="mb-1">
                  <span className="text-muted d-block mb-1">{t('account.links.publicHeading')}</span>
                  <ul className="mb-0 ps-3">
                    {publicSpiders.map((tar) => (
                      <li key={tar.id} className="mb-1">
                        <Link to={`/t/${tar.shortId}`} style={{ color: 'var(--ta-parchment)' }}>
                          {tar.name} ({tar.shortId})
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              )}
            </ul>
          </section>

          <section className="mb-4 pb-4 border-bottom" style={{ borderColor: 'var(--ta-border)' }}>
            <h2 className="h6 fw-bold text-uppercase mb-3" style={{ color: 'var(--ta-gold)', letterSpacing: '0.06em' }}>
              {t('account.sections.legal')}
            </h2>
            <ul className="small mb-0 ps-3">
              <li className="mb-1">
                <Link to="/privacy" style={{ color: 'var(--ta-gold)' }}>
                  {t('account.legal.privacy')}
                </Link>
              </li>
              <li>
                <Link to="/terms" style={{ color: 'var(--ta-gold)' }}>
                  {t('account.legal.terms')}
                </Link>
              </li>
              <li>
                <Link to="/contact" style={{ color: 'var(--ta-gold)' }}>
                  {t('nav.contact')}
                </Link>
              </li>
            </ul>
          </section>

          <section className="mb-4 pb-4 border-bottom" style={{ borderColor: 'var(--ta-border)' }}>
            <h2 className="h6 fw-bold text-uppercase mb-3" style={{ color: 'var(--ta-gold)', letterSpacing: '0.06em' }}>
              {t('account.sections.help')}
            </h2>
            <p className="small text-muted mb-2">{t('account.help.intro')}</p>
            {supportEmail ? (
              <a href={`mailto:${supportEmail}`} className="small" style={{ color: 'var(--ta-gold)' }}>
                {supportEmail}
              </a>
            ) : (
              <p className="small text-muted mb-0">{t('account.help.noEmail')}</p>
            )}
          </section>

          <section className="mb-4">
            <h2 className="h6 fw-bold text-uppercase mb-3" style={{ color: 'var(--ta-gold)', letterSpacing: '0.06em' }}>
              {t('account.sections.about')}
            </h2>
            <p className="small text-muted mb-0">
              {t('account.about.line', { version: appVersion })}
            </p>
          </section>

          <div className="pt-2 border-top" style={{ borderColor: 'var(--ta-border)' }}>
            <button
              type="button"
              className="btn btn-sm btn-outline-light"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              {t('nav.logout')}
            </button>
          </div>
        </ChitinCardFrame>
      </div>
    </div>
  )
}
