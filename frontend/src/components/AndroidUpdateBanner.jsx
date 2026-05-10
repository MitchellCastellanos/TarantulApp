import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { useTranslation } from 'react-i18next'
import publicApi from '../services/publicApi'
import {
  isDismissedForLatestVersion,
  markDismissedForLatestVersion,
} from '../utils/androidUpdateBannerState'

const PLAY_STORE_FALLBACK =
  'https://play.google.com/store/apps/details?id=com.tarantulapp.app'

/** Tras el splash / primer layout: evita banner “cortado” o solapado. */
const OPEN_APP_DELAY_MS = 720

function isAndroidNative() {
  return Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform()
}

function parseBuildCode(build) {
  const n = parseInt(String(build ?? '').trim(), 10)
  return Number.isFinite(n) ? n : null
}

async function fetchUpdatePayload() {
  const [{ build }, { data }] = await Promise.all([
    App.getInfo(),
    publicApi.get('public/app/android'),
  ])
  const current = parseBuildCode(build)
  const latest = Number(data?.latestVersionCode)
  const playStoreUrl =
    typeof data?.playStoreUrl === 'string' ? data.playStoreUrl.trim() : ''
  if (current == null || !Number.isFinite(latest)) return null
  if (latest <= current) return null
  if (isDismissedForLatestVersion(latest)) return null
  return {
    latestVersionCode: latest,
    latestVersionName: data?.latestVersionName,
    playStoreUrl: playStoreUrl || PLAY_STORE_FALLBACK,
  }
}

export default function AndroidUpdateBanner() {
  const { t } = useTranslation()
  const [info, setInfo] = useState(null)
  const bannerRef = useRef(null)
  const cancelledRef = useRef(false)
  const seqRef = useRef(0)

  useLayoutEffect(() => {
    if (!info) {
      document.documentElement.style.paddingTop = ''
      return undefined
    }
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
  }, [info])

  useEffect(() => {
    if (!isAndroidNative()) return undefined

    cancelledRef.current = false

    const run = async (delayMs) => {
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs))
      }
      if (cancelledRef.current) return
      const mySeq = ++seqRef.current
      try {
        const payload = await fetchUpdatePayload()
        if (cancelledRef.current || mySeq !== seqRef.current) return
        setInfo(payload)
      } catch {
        if (cancelledRef.current || mySeq !== seqRef.current) return
        /* sin red: no molestar */
      }
    }

    void run(OPEN_APP_DELAY_MS)

    let resumeListener
    App.addListener('resume', () => {
      void run(0)
    }).then((handle) => {
      resumeListener = handle
    })

    return () => {
      cancelledRef.current = true
      seqRef.current += 1
      resumeListener?.remove?.()
    }
  }, [])

  if (!info) return null

  const handleLater = () => {
    markDismissedForLatestVersion(info.latestVersionCode)
    setInfo(null)
  }

  const handleUpdate = () => {
    window.open(info.playStoreUrl, '_blank', 'noopener,noreferrer')
  }

  const versionHint =
    info.latestVersionName != null && String(info.latestVersionName).trim()
      ? t('appUpdate.versionHint', { version: String(info.latestVersionName).trim() })
      : null

  return (
    <div
      ref={bannerRef}
      className="ta-app-update-banner"
      role="status"
      aria-live="polite"
    >
      <div className="container-fluid px-3 py-3">
        <div className="d-flex flex-wrap align-items-center gap-3">
          <div className="flex-grow-1" style={{ minWidth: 'min(100%, 14rem)' }}>
            <div className="d-flex align-items-start gap-2">
              <i className="bi bi-stars ta-app-update-banner__icon" aria-hidden />
              <div>
                <strong className="d-block ta-app-update-banner__title">{t('appUpdate.title')}</strong>
                <span className="ta-app-update-banner__body">{t('appUpdate.body')}</span>
                {versionHint ? (
                  <span className="ta-app-update-banner__hint d-block mt-1">{versionHint}</span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="d-flex flex-shrink-0 gap-2 ms-md-auto w-100 w-md-auto justify-content-stretch justify-content-md-end">
            <button
              type="button"
              className="btn btn-sm ta-app-update-banner__btn-later flex-grow-1 flex-md-grow-0"
              onClick={handleLater}
            >
              {t('appUpdate.later')}
            </button>
            <button
              type="button"
              className="btn btn-sm ta-app-update-banner__btn-update flex-grow-1 flex-md-grow-0"
              onClick={handleUpdate}
            >
              {t('appUpdate.update')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
