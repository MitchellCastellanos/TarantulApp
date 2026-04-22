import Navbar from '../components/Navbar'
import ChitinCardFrame from '../components/ChitinCardFrame'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import billingService from '../services/billingService'
import authService from '../services/authService'
import tarantulaService from '../services/tarantulaService'
import marketplaceService from '../services/marketplaceService'
import userPublicService, { normalizePublicHandle } from '../services/userPublicService'
import { imgUrl } from '../services/api'
import { APP_LANGS, LOGIN_LANG_LABELS } from '../constants/languages'
import { appLangBase } from '../utils/appLanguage'
import { DEFAULT_SUPPORT_EMAIL } from '../constants/publicContact'
import { getStoredTheme, setStoredTheme } from '../utils/themePreference'
import ThemeToggleButton from '../components/ThemeToggleButton'

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
  const { user, logout, setPlan, updateUserProfile } = useAuth()
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
  const [theme, setTheme] = useState(() => getStoredTheme())
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [handleAvailability, setHandleAvailability] = useState({ status: 'idle', normalized: '' })
  const handleAvailTimerRef = useRef(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || '',
    publicHandle: user?.publicHandle || '',
    bio: user?.bio || '',
    location: user?.location || '',
    featuredCollection: user?.featuredCollection || '',
    contactWhatsapp: user?.contactWhatsapp || '',
    contactInstagram: user?.contactInstagram || '',
    profileCountry: user?.profileCountry || '',
    profileState: user?.profileState || '',
    profileCity: user?.profileCity || '',
  })

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
  useEffect(() => {
    setProfileForm({
      displayName: user?.displayName || '',
      publicHandle: user?.publicHandle || '',
      bio: user?.bio || '',
      location: user?.location || '',
      featuredCollection: user?.featuredCollection || '',
      contactWhatsapp: user?.contactWhatsapp || '',
      contactInstagram: user?.contactInstagram || '',
      profileCountry: user?.profileCountry || '',
      profileState: user?.profileState || '',
      profileCity: user?.profileCity || '',
    })
  }, [user])

  useEffect(() => {
    if (!user?.id) return undefined
    const raw = profileForm.publicHandle ?? ''
    if (handleAvailTimerRef.current) clearTimeout(handleAvailTimerRef.current)
    const trimmed = raw.trim()
    if (!trimmed) {
      setHandleAvailability({ status: 'idle', normalized: '' })
      return undefined
    }
    const norm = normalizePublicHandle(raw)
    const currentNorm = normalizePublicHandle(user.publicHandle || '')
    if (norm.length < 3) {
      setHandleAvailability({ status: 'invalid', normalized: norm })
      return undefined
    }
    if (norm && currentNorm && norm === currentNorm) {
      setHandleAvailability({ status: 'yours', normalized: norm })
      return undefined
    }
    setHandleAvailability((prev) => ({ ...prev, status: 'checking', normalized: norm }))
    handleAvailTimerRef.current = setTimeout(() => {
      userPublicService
        .checkHandleAvailability(trimmed)
        .then((data) => {
          const n = data?.normalized || norm
          if (!data?.valid) {
            setHandleAvailability({ status: 'invalid', normalized: n })
            return
          }
          setHandleAvailability({
            status: data.available ? 'available' : 'taken',
            normalized: n,
          })
        })
        .catch(() => setHandleAvailability({ status: 'idle', normalized: norm }))
    }, 450)
    return () => {
      if (handleAvailTimerRef.current) clearTimeout(handleAvailTimerRef.current)
    }
  }, [profileForm.publicHandle, user?.id, user?.publicHandle])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMessage('')
    try {
      await marketplaceService.saveMyProfile({
        displayName: profileForm.displayName,
        handle: profileForm.publicHandle,
        bio: profileForm.bio,
        location: profileForm.location,
        featuredCollection: profileForm.featuredCollection,
        contactWhatsapp: profileForm.contactWhatsapp,
        contactInstagram: profileForm.contactInstagram,
        country: profileForm.profileCountry,
        state: profileForm.profileState,
        city: profileForm.profileCity,
      })
      updateUserProfile({
        displayName: profileForm.displayName,
        publicHandle: profileForm.publicHandle,
        bio: profileForm.bio,
        location: profileForm.location,
        featuredCollection: profileForm.featuredCollection,
        contactWhatsapp: profileForm.contactWhatsapp,
        contactInstagram: profileForm.contactInstagram,
        profileCountry: profileForm.profileCountry,
        profileState: profileForm.profileState,
        profileCity: profileForm.profileCity,
      })
      setProfileMessage(t('common.save'))
    } catch (err) {
      setProfileMessage(err?.response?.data?.error || t('account.errors.generic'))
    } finally {
      setProfileSaving(false)
    }
  }

  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true)
    setProfileMessage('')
    try {
      const updated = await marketplaceService.uploadProfilePhoto(file)
      updateUserProfile({
        profilePhoto: updated?.profilePhoto || '',
      })
      setProfileMessage('Foto de perfil actualizada.')
    } catch (err) {
      setProfileMessage(err?.response?.data?.error || t('account.errors.generic'))
    } finally {
      setPhotoUploading(false)
    }
  }

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
            <form className="small mt-2" onSubmit={handleSaveProfile}>
              <div className="mb-2 d-flex align-items-center gap-2">
                <img
                  src={imgUrl(user?.profilePhoto) || imgUrl(user?.profilePhoto || '') || '/spider-default.png'}
                  alt={t('account.profile.avatarAlt')}
                  style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 999, border: '1px solid var(--ta-border)' }}
                />
                <div>
                  <input type="file" accept="image/*" className="form-control form-control-sm" onChange={handleProfilePhotoUpload} />
                  {photoUploading && <div className="small text-muted mt-1">{t('common.saving')}</div>}
                </div>
              </div>
              <div className="mb-2">
                <label className="form-label mb-1">{t('auth.name')}</label>
                <input className="form-control form-control-sm" value={profileForm.displayName}
                  onChange={(e) => setProfileForm((f) => ({ ...f, displayName: e.target.value }))} />
              </div>
              <div className="mb-2">
                <label className="form-label mb-1">{t('account.profile.publicHandleLabel')}</label>
                <input className="form-control form-control-sm" value={profileForm.publicHandle}
                  onChange={(e) => setProfileForm((f) => ({ ...f, publicHandle: e.target.value }))} placeholder={t('account.profile.publicHandlePlaceholder')} />
                {handleAvailability.status === 'checking' && (
                  <div className="small text-muted mt-1">{t('account.profile.handleAvailabilityChecking')}</div>
                )}
                {handleAvailability.status === 'available' && (
                  <div className="small mt-1" style={{ color: 'var(--ta-green-light)' }}>
                    {t('account.profile.handleAvailabilityAvailable', { handle: handleAvailability.normalized })}
                  </div>
                )}
                {handleAvailability.status === 'taken' && (
                  <div className="small mt-1" style={{ color: '#f0a4a4' }}>
                    {t('account.profile.handleAvailabilityTaken', { handle: handleAvailability.normalized })}
                  </div>
                )}
                {handleAvailability.status === 'invalid' && (
                  <div className="small mt-1 text-muted">{t('account.profile.handleAvailabilityInvalid')}</div>
                )}
                {handleAvailability.status === 'yours' && (
                  <div className="small mt-1 text-muted">{t('account.profile.handleAvailabilityYours')}</div>
                )}
              </div>
              <div className="mb-2">
                <label className="form-label mb-1">{t('account.profile.bioLabel')}</label>
                <textarea className="form-control form-control-sm" rows={2} value={profileForm.bio}
                  onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))} />
              </div>
              <div className="row g-2">
                <div className="col-md-6">
                  <input className="form-control form-control-sm" placeholder={t('account.profile.locationPlaceholder')}
                    value={profileForm.location} onChange={(e) => setProfileForm((f) => ({ ...f, location: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <input className="form-control form-control-sm" placeholder={t('account.profile.featuredCollectionPlaceholder')}
                    value={profileForm.featuredCollection} onChange={(e) => setProfileForm((f) => ({ ...f, featuredCollection: e.target.value }))} />
                </div>
              </div>
              <div className="row g-2 mt-1">
                <div className="col-md-6">
                  <input className="form-control form-control-sm" placeholder={t('account.profile.whatsappPlaceholder')}
                    value={profileForm.contactWhatsapp} onChange={(e) => setProfileForm((f) => ({ ...f, contactWhatsapp: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <input className="form-control form-control-sm" placeholder={t('account.profile.instagramPlaceholder')}
                    value={profileForm.contactInstagram} onChange={(e) => setProfileForm((f) => ({ ...f, contactInstagram: e.target.value }))} />
                </div>
              </div>
              <div className="row g-2 mt-1">
                <div className="col-md-4">
                  <input className="form-control form-control-sm" placeholder={t('account.profile.countryPlaceholder')}
                    value={profileForm.profileCountry} onChange={(e) => setProfileForm((f) => ({ ...f, profileCountry: e.target.value }))} />
                </div>
                <div className="col-md-4">
                  <input className="form-control form-control-sm" placeholder={t('account.profile.statePlaceholder')}
                    value={profileForm.profileState} onChange={(e) => setProfileForm((f) => ({ ...f, profileState: e.target.value }))} />
                </div>
                <div className="col-md-4">
                  <input className="form-control form-control-sm" placeholder={t('account.profile.cityPlaceholder')}
                    value={profileForm.profileCity} onChange={(e) => setProfileForm((f) => ({ ...f, profileCity: e.target.value }))} />
                </div>
              </div>
              <div className="d-flex align-items-center gap-2 mt-2">
                <button className="btn btn-sm btn-outline-light" disabled={profileSaving}>
                  {profileSaving ? t('common.saving') : t('common.save')}
                </button>
                {profileMessage && <span className="small text-muted">{profileMessage}</span>}
              </div>
            </form>
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
                    color: appLangBase(i18n.language) === l.code ? 'var(--ta-gold)' : 'var(--ta-text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  {l.flag} {l.display}
                </button>
              ))}
            </div>
            <p className="small text-muted mb-2 mt-3">{t('account.preferences.theme')}</p>
            <div className="d-flex align-items-center gap-2">
              <ThemeToggleButton />
              <button
                type="button"
                className="btn btn-sm btn-outline-light"
                onClick={() => {
                  const next = theme === 'light' ? 'dark' : 'light'
                  setTheme(setStoredTheme(next))
                }}
              >
                {theme === 'light' ? t('account.preferences.dark') : t('account.preferences.light')}
              </button>
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
