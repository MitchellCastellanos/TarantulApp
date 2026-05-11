import { useLayoutEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ANDROID_PLAY_STORE_URL } from '../constants/playStoreUrls'
import {
  dismissPlayStoreWebBanner,
  isPlayStoreWebBannerDismissed,
} from '../utils/playStoreWebBannerState'

/**
 * Sticky top strip on **web** for all visitors: Play open test + create account to join the access list.
 * Native Capacitor builds hide this (they are already the app).
 */
export default function PlayStoreWebBanner() {
  const { t } = useTranslation()
  const { token } = useAuth()
  const [hidden, setHidden] = useState(() => isPlayStoreWebBannerDismissed())

  if (Capacitor.isNativePlatform() || hidden) {
    return null
  }

  const onOpen = () => {
    window.open(ANDROID_PLAY_STORE_URL, '_blank', 'noopener,noreferrer')
  }

  const onDismiss = () => {
    dismissPlayStoreWebBanner()
    setHidden(true)
  }

  return (
    <PlayStoreWebBannerInner
      title={t('playStore.webBannerTitle')}
      body={t('playStore.webBannerBody')}
      getAppLabel={t('playStore.webBannerGetApp')}
      createAccountLabel={t('playStore.webBannerCreateAccount')}
      signedInHint={t('playStore.webBannerSignedInHint')}
      googleAccountTip={t('playStore.playGoogleAccountTip')}
      dismissLabel={t('playStore.webBannerDismiss')}
      hasToken={!!token}
      onOpen={onOpen}
      onDismiss={onDismiss}
    />
  )
}

function PlayStoreWebBannerInner({
  title,
  body,
  getAppLabel,
  createAccountLabel,
  signedInHint,
  googleAccountTip,
  dismissLabel,
  hasToken,
  onOpen,
  onDismiss,
}) {
  const bannerRef = useRef(null)

  useLayoutEffect(() => {
    const update = () => {
      const h = bannerRef.current?.offsetHeight ?? 0
      document.documentElement.style.paddingTop = h > 0 ? `${h}px` : ''
    }
    update()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    if (ro && bannerRef.current) ro.observe(bannerRef.current)
    window.addEventListener('resize', update)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', update)
      document.documentElement.style.paddingTop = ''
    }
  }, [])

  return (
    <div
      ref={bannerRef}
      className="ta-play-store-web-banner"
      role="status"
      aria-live="polite"
    >
      <div className="container-fluid px-3 py-2 py-md-3">
        <div className="d-flex flex-wrap align-items-center gap-2 gap-md-3">
          <div className="flex-grow-1" style={{ minWidth: 'min(100%, 11rem)' }}>
            <div className="d-flex align-items-start gap-2">
              <i className="bi bi-google-play ta-play-store-web-banner__icon" aria-hidden />
              <div>
                <strong className="d-block ta-play-store-web-banner__title">{title}</strong>
                <span className="d-block ta-play-store-web-banner__body">{body}</span>
                {hasToken ? (
                  <span className="d-block small mt-1 ta-play-store-web-banner__hint">{signedInHint}</span>
                ) : null}
                <span className="d-block small mt-1 ta-play-store-web-banner__fine-print">{googleAccountTip}</span>
              </div>
            </div>
          </div>
          <div className="d-flex flex-shrink-0 flex-wrap gap-2 ms-md-auto w-100 w-md-auto justify-content-stretch justify-content-md-end align-items-center">
            {!hasToken && (
              <Link
                to="/login"
                state={{ initialMode: 'register' }}
                className="btn btn-sm ta-play-store-web-banner__btn-secondary order-md-0"
              >
                {createAccountLabel}
              </Link>
            )}
            <button
              type="button"
              className="btn btn-sm ta-play-store-web-banner__btn-primary"
              onClick={onOpen}
            >
              {getAppLabel}
            </button>
            <button
              type="button"
              className="btn btn-sm ta-play-store-web-banner__btn-dismiss"
              onClick={onDismiss}
            >
              {dismissLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
