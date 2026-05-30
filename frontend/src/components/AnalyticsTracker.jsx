import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import analyticsService from '../services/analyticsService'

/**
 * Headless tracker mounted once inside the Router. Records a page view on every
 * route change and accumulates engaged time (only while the tab is visible),
 * flushing periodically and on tab-hide / page-unload.
 */
const FLUSH_INTERVAL_MS = 25_000
const TICK_MS = 1_000

export default function AnalyticsTracker() {
  const location = useLocation()
  const engagedSecondsRef = useRef(0)

  // Page view per route change (the first one also creates the visit row server-side).
  useEffect(() => {
    analyticsService.trackPageView(location.pathname + location.search)
  }, [location.pathname, location.search])

  // Engaged-time accounting: tick only while visible; flush on interval and on hide/unload.
  useEffect(() => {
    let elapsedSinceFlush = 0

    const tick = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      engagedSecondsRef.current += 1
      elapsedSinceFlush += TICK_MS
      if (elapsedSinceFlush >= FLUSH_INTERVAL_MS && engagedSecondsRef.current > 0) {
        analyticsService.trackEngagement(engagedSecondsRef.current)
        engagedSecondsRef.current = 0
        elapsedSinceFlush = 0
      }
    }, TICK_MS)

    const flush = (beacon) => {
      if (engagedSecondsRef.current > 0) {
        analyticsService.trackEngagement(engagedSecondsRef.current, { beacon })
        engagedSecondsRef.current = 0
        elapsedSinceFlush = 0
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush(true)
    }
    const onPageHide = () => flush(true)

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      clearInterval(tick)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      flush(false)
    }
  }, [])

  return null
}
