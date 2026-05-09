import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { useTranslation } from 'react-i18next'
import publicApi from '../services/publicApi'
import {
  isDismissedForLatestVersion,
  markDismissedForLatestVersion,
} from '../utils/androidUpdateBannerState'

function isAndroidNative() {
  return Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform()
}

function parseBuildCode(build) {
  const n = parseInt(String(build ?? '').trim(), 10)
  return Number.isFinite(n) ? n : null
}

export default function AndroidUpdateBanner() {
  const { t } = useTranslation()
  const [info, setInfo] = useState(null)
  const bannerRef = useRef(null)

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

    let cancelled = false
    ;(async () => {
      try {
        const [{ build }, { data }] = await Promise.all([
          App.getInfo(),
          publicApi.get('public/app/android'),
        ])
        if (cancelled) return
        const current = parseBuildCode(build)
        const latest = Number(data?.latestVersionCode)
        const playStoreUrl = typeof data?.playStoreUrl === 'string' ? data.playStoreUrl.trim() : ''
        if (current == null || !Number.isFinite(latest)) return
        if (latest <= current) return
        if (isDismissedForLatestVersion(latest)) return
        setInfo({
          latestVersionCode: latest,
          latestVersionName: data?.latestVersionName,
          playStoreUrl:
            playStoreUrl ||
            'https://play.google.com/store/apps/details?id=com.tarantulapp.app',
        })
      } catch (_) {
        // Sin red / backend: no molestar
      }
    })()

    return () => {
      cancelled = true
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
      className="position-fixed start-0 end-0 border-bottom shadow-sm"
      style={{
        top: 0,
        zIndex: 1060,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        background: 'linear-gradient(180deg, rgba(13,110,253,0.09) 0%, rgba(255,255,255,0.96) 100%)',
        backdropFilter: 'blur(6px)',
      }}
      role="status"
      aria-live="polite"
    >
      <div className="container-fluid px-3 py-2">
        <div className="d-flex flex-wrap align-items-center gap-2 gap-md-3">
          <div className="flex-grow-1 small text-body" style={{ minWidth: '12rem' }}>
            <strong className="d-block">{t('appUpdate.title')}</strong>
            <span className="text-body-secondary">{t('appUpdate.body')}</span>
            {versionHint ? (
              <span className="text-body-secondary d-block mt-1">{versionHint}</span>
            ) : null}
          </div>
          <div className="d-flex flex-shrink-0 gap-2 ms-md-auto">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleLater}>
              {t('appUpdate.later')}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleUpdate}>
              {t('appUpdate.update')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
