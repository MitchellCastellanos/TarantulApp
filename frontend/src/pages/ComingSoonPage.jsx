import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BrandName from '../components/BrandName'
import publicApi from '../services/publicApi'

const SOCIAL_LINKS = [
  {
    href: 'https://www.instagram.com/tarantulapp_official',
    label: 'Instagram',
    icon: 'bi-instagram',
  },
  {
    href: 'https://www.tiktok.com/@tarantulapp_offic',
    label: 'TikTok',
    icon: 'bi-tiktok',
  },
  {
    href: 'https://x.com/TarantulApp',
    label: 'X',
    icon: 'bi-twitter-x',
  },
]

export default function ComingSoonPage({ onUnlock }) {
  const { t } = useTranslation()
  const [testerOpen, setTesterOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [unlockError, setUnlockError] = useState(false)

  useEffect(() => {
    document.title = t('comingSoon.docTitle')
    return () => {
      document.title = 'TarantulApp\u2122'
    }
  }, [t])

  async function tryUnlock(e) {
    e.preventDefault()
    if (submitting) return
    setUnlockError(false)
    if (!email.trim() || !password) {
      setUnlockError(true)
      return
    }
    setSubmitting(true)
    try {
      const { data } = await publicApi.post('/auth/login', { email: email.trim(), password })
      const isAllowed = data?.admin === true || data?.betaTester === true || data?.isBetaTester === true
      if (!isAllowed) {
        setUnlockError(true)
        return
      }
      onUnlock?.({ email: email.trim(), password })
      setTesterOpen(false)
      setEmail('')
      setPassword('')
      return
    } catch {
      setUnlockError(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="ta-coming-soon">
      <header className="ta-coming-soon__header text-center pt-4 pb-2 px-3">
        <div className="ta-coming-soon__brand mb-2">
          <BrandName />
        </div>
        <h1 className="ta-coming-soon__title">{t('comingSoon.headline')}</h1>
        <p className="ta-coming-soon__lead text-muted mb-0">{t('comingSoon.subhead')}</p>
      </header>

      <main className="ta-coming-soon__main px-3 pb-5 mx-auto">
        <section className="ta-coming-soon__cinema" aria-label={t('comingSoon.cinemaAria')}>
          <div className="ta-coming-soon__cinema-frame">
            <div className="ta-coming-soon__cinema-letterbox ta-coming-soon__cinema-letterbox--top" aria-hidden />
            <div className="ta-coming-soon__cinema-stage">
              <div className="ta-coming-soon__cinema-bg" aria-hidden />
              <div className="ta-coming-soon__orb ta-coming-soon__orb--1" aria-hidden />
              <div className="ta-coming-soon__orb ta-coming-soon__orb--2" aria-hidden />
              <div className="ta-coming-soon__orb ta-coming-soon__orb--3" aria-hidden />
              <div className="ta-coming-soon__cinema-shine" aria-hidden />
              <div className="ta-coming-soon__grain" aria-hidden />
              <div className="ta-coming-soon__vignette" aria-hidden />
              <div className="ta-coming-soon__cinema-content">
                <span className="ta-coming-soon__cinema-badge">{t('comingSoon.cinemaBadge')}</span>
                <span className="ta-coming-soon__cinema-sub">{t('comingSoon.cinemaSub')}</span>
                <span className="ta-coming-soon__cinema-spark" aria-hidden />
              </div>
            </div>
            <div className="ta-coming-soon__cinema-letterbox ta-coming-soon__cinema-letterbox--bottom" aria-hidden />
          </div>
        </section>

        <div className="text-center mt-5">
          <p className="ta-coming-soon__cta-lead mb-3">{t('comingSoon.followLead')}</p>
          <div className="d-flex flex-wrap justify-content-center gap-2">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.href}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline-light d-inline-flex align-items-center gap-2 ta-coming-soon__social-btn"
                aria-label={s.label}
              >
                <i className={`bi ${s.icon}`} aria-hidden />
                {s.label}
              </a>
            ))}
          </div>
          <div className="mt-3">
            <a
              href="/beta/apply"
              className="small text-decoration-none"
              style={{ color: 'rgba(255, 255, 255, 0.58)' }}
            >
              {t('comingSoon.betaApplyLink')}
            </a>
          </div>
        </div>
      </main>

      <button
        type="button"
        className="ta-coming-soon__beta-login"
        onClick={() => {
          setTesterOpen(true)
          setUnlockError(false)
          setEmail('')
          setPassword('')
        }}
      >
        {t('comingSoon.betaTesterLogin')}
      </button>

      {testerOpen ? (
        <div
          className="modal show d-block"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setTesterOpen(false)}
          role="presentation"
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content ta-coming-soon__modal">
              <div className="modal-header border-secondary">
                <h5 className="modal-title">{t('comingSoon.testerTitle')}</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label={t('comingSoon.testerClose')}
                  onClick={() => setTesterOpen(false)}
                />
              </div>
              <form onSubmit={tryUnlock}>
                <div className="modal-body">
                  <label htmlFor="ta-tester-pass" className="form-label">
                    {t('auth.email')}
                  </label>
                  <input
                    id="ta-tester-pass"
                    type="email"
                    autoComplete="off"
                    className={`form-control ta-coming-soon__pass-input ${unlockError ? 'is-invalid' : ''}`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setUnlockError(false)
                    }}
                  />
                  <label htmlFor="ta-tester-password" className="form-label mt-3">
                    {t('comingSoon.testerLabel')}
                  </label>
                  <input
                    id="ta-tester-password"
                    type="password"
                    autoComplete="off"
                    className={`form-control ta-coming-soon__pass-input ${unlockError ? 'is-invalid' : ''}`}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setUnlockError(false)
                    }}
                  />
                  {unlockError ? (
                    <div className="invalid-feedback d-block">
                      {t('comingSoon.testerWrong')}
                    </div>
                  ) : null}
                </div>
                <div className="modal-footer border-secondary">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setTesterOpen(false)}>
                    {t('comingSoon.testerCancel')}
                  </button>
                  <button type="submit" className="btn btn-warning text-dark fw-semibold" disabled={submitting}>
                    {t('comingSoon.testerSubmit')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
