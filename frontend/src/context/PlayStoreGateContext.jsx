import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from './AuthContext'
import {
  ANDROID_PLAY_STORE_URL,
  ANDROID_PLAY_TESTING_URL,
} from '../constants/playStoreUrls'

const PlayStoreGateContext = createContext(null)

const STORAGE_KEY = 'tarantulapp:playStoreGate:skipUntil'
const SKIP_TTL_MS = 24 * 60 * 60 * 1000

function readSkipUntil() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 0
    const n = Number(raw)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

function writeSkipUntil(ts) {
  try {
    localStorage.setItem(STORAGE_KEY, String(ts))
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function PlayStoreGateProvider({ children }) {
  const { user } = useAuth()
  const [state, setState] = useState(null)

  const openPlayStore = useCallback((options = {}) => {
    const url = typeof options.url === 'string' && options.url.trim()
      ? options.url.trim()
      : ANDROID_PLAY_STORE_URL
    const force = options.force === true
    const skipUntil = readSkipUntil()
    if (!force && skipUntil > Date.now()) {
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    setState({ url })
  }, [])

  const close = useCallback(() => setState(null), [])

  const value = useMemo(() => ({ openPlayStore }), [openPlayStore])

  return (
    <PlayStoreGateContext.Provider value={value}>
      {children}
      {state ? (
        <PlayStoreGateModal
          url={state.url}
          email={user?.email || ''}
          onClose={close}
        />
      ) : null}
    </PlayStoreGateContext.Provider>
  )
}

export function useOpenPlayStore() {
  const ctx = useContext(PlayStoreGateContext)
  if (!ctx) {
    return ({ url } = {}) => {
      window.open(url || ANDROID_PLAY_STORE_URL, '_blank', 'noopener,noreferrer')
    }
  }
  return ctx.openPlayStore
}

function PlayStoreGateModal({ url, email, onClose }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [dontShow, setDontShow] = useState(false)
  const copiedTimer = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => () => {
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current)
  }, [])

  const handleCopyEmail = async () => {
    if (!email) return
    try {
      await navigator.clipboard?.writeText(email)
      setCopied(true)
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current)
      copiedTimer.current = window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked: ignore */
    }
  }

  const persistSkip = () => {
    if (dontShow) writeSkipUntil(Date.now() + SKIP_TTL_MS)
  }

  const handleTestingOptIn = () => {
    persistSkip()
    window.open(ANDROID_PLAY_TESTING_URL, '_blank', 'noopener,noreferrer')
    onClose()
  }

  const handleContinue = () => {
    persistSkip()
    window.open(url, '_blank', 'noopener,noreferrer')
    onClose()
  }

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="play-store-gate-title"
      style={{ background: 'rgba(0,0,0,0.62)', zIndex: 1085 }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-dialog-scrollable"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content ta-premium-pane border-secondary border-opacity-25">
          <div className="modal-header border-secondary border-opacity-25">
            <h2 id="play-store-gate-title" className="modal-title h5 d-flex align-items-center gap-2">
              <i className="bi bi-google-play" aria-hidden />
              {t('playStoreGate.title')}
            </h2>
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label={t('playStoreGate.close')}
              onClick={onClose}
            />
          </div>
          <div className="modal-body">
            <p className="small mb-3">{t('playStoreGate.intro')}</p>

            <div
              className="rounded-3 p-3 mb-3"
              style={{
                border: '1px solid rgba(212, 175, 55, 0.45)',
                background: 'linear-gradient(135deg, rgba(50, 38, 12, 0.45) 0%, rgba(20, 16, 8, 0.55) 100%)',
              }}
            >
              <p
                className="small text-uppercase mb-1"
                style={{ letterSpacing: '0.08em', color: 'var(--ta-text-muted)' }}
              >
                {t('playStoreGate.invitedEmailLabel')}
              </p>
              {email ? (
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <code
                    className="px-2 py-1 rounded"
                    style={{
                      background: 'rgba(0,0,0,0.35)',
                      color: 'var(--ta-parchment, #f3e9c7)',
                      wordBreak: 'break-all',
                    }}
                  >
                    {email}
                  </code>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-light"
                    onClick={handleCopyEmail}
                  >
                    <i className="bi bi-clipboard me-1" aria-hidden />
                    {copied ? t('playStoreGate.copied') : t('playStoreGate.copyEmail')}
                  </button>
                </div>
              ) : (
                <p className="small mb-0" style={{ color: 'var(--ta-text-muted)' }}>
                  {t('playStoreGate.noEmailHint')}
                </p>
              )}
            </div>

            <ol className="small ps-3 mb-3" style={{ lineHeight: 1.6 }}>
              <li className="mb-2">{t('playStoreGate.step1')}</li>
              <li className="mb-2">{t('playStoreGate.step2')}</li>
              <li className="mb-0">{t('playStoreGate.step3')}</li>
            </ol>

            <div
              className="rounded-3 p-3 mb-3 d-flex gap-3 align-items-start"
              style={{
                border: '1px solid rgba(120, 144, 170, 0.35)',
                background: 'rgba(18, 24, 34, 0.55)',
              }}
            >
              <div
                aria-hidden
                className="flex-shrink-0 rounded-circle d-flex align-items-center justify-content-center ta-play-store-gate__avatar-demo"
              >
                G
              </div>
              <div>
                <p className="small fw-semibold mb-1" style={{ color: 'var(--ta-parchment)' }}>
                  {t('playStoreGate.checkAccountTitle')}
                </p>
                <p className="small mb-0" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.55 }}>
                  {t('playStoreGate.checkAccountBody')}
                </p>
              </div>
            </div>

            <details className="small mb-2">
              <summary className="fw-semibold" style={{ color: 'var(--ta-parchment)' }}>
                {t('playStoreGate.workaroundTitle')}
              </summary>
              <ul className="ps-3 mt-2 mb-0" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.6 }}>
                <li className="mb-2">{t('playStoreGate.workaround1')}</li>
                <li className="mb-2">{t('playStoreGate.workaround2')}</li>
                <li className="mb-0">{t('playStoreGate.workaround3')}</li>
              </ul>
            </details>

            <div className="form-check mt-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="play-store-gate-skip"
                checked={dontShow}
                onChange={(e) => setDontShow(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="play-store-gate-skip">
                {t('playStoreGate.dontShowAgain')}
              </label>
            </div>
          </div>
          <div className="modal-footer border-secondary border-opacity-25 d-flex flex-wrap justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-light"
              onClick={handleTestingOptIn}
            >
              {t('playStoreGate.testingOptIn')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-warning fw-semibold"
              onClick={handleContinue}
            >
              <i className="bi bi-box-arrow-up-right me-1" aria-hidden />
              {t('playStoreGate.continue')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
