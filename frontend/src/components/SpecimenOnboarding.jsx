import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Brief greyed-out coachmark tour. Dims the screen and highlights elements tagged with
 * `data-onboarding="<key>"`, showing a short description per step. Steps whose target is not
 * found are skipped so it degrades gracefully across tabs/locked states.
 *
 * @param {{ steps: {key: string, text: string}[], onClose: () => void }} props
 */
export default function SpecimenOnboarding({ steps, onClose }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState(null)

  // Resolve the next step (from `from`) whose target element exists; null when none remain.
  const resolveFrom = useCallback((from) => {
    for (let i = from; i < steps.length; i += 1) {
      const el = document.querySelector(`[data-onboarding="${steps[i].key}"]`)
      if (el) return i
    }
    return -1
  }, [steps])

  useEffect(() => {
    const first = resolveFrom(0)
    if (first === -1) {
      onClose()
      return
    }
    if (first !== 0) setIndex(first)
  }, [resolveFrom, onClose])

  const measure = useCallback(() => {
    const step = steps[index]
    if (!step) return
    const el = document.querySelector(`[data-onboarding="${step.key}"]`)
    if (!el) {
      setRect(null)
      return
    }
    const r = el.getBoundingClientRect()
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [index, steps])

  useLayoutEffect(() => {
    const el = document.querySelector(`[data-onboarding="${steps[index]?.key}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Re-measure after the scroll settles.
    const id = window.setTimeout(measure, 320)
    measure()
    return () => window.clearTimeout(id)
  }, [index, steps, measure])

  useEffect(() => {
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [measure])

  const isLast = useMemo(() => resolveFrom(index + 1) === -1, [resolveFrom, index])

  const next = () => {
    const n = resolveFrom(index + 1)
    if (n === -1) onClose()
    else setIndex(n)
  }

  const step = steps[index]
  if (!step) return null

  const pad = 6
  const highlight = rect
    ? {
        position: 'fixed',
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        borderRadius: 10,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
        border: '2px solid var(--ta-gold, #d4af37)',
        zIndex: 2000,
        pointerEvents: 'none',
        transition: 'all 0.2s ease',
      }
    : null

  // Place the card below the target when there's room, otherwise above.
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800
  const below = rect ? rect.top + rect.height + 16 : viewportH / 2
  const placeAbove = rect && below > viewportH - 160
  const cardStyle = {
    position: 'fixed',
    left: 16,
    right: 16,
    maxWidth: 420,
    margin: '0 auto',
    zIndex: 2001,
    ...(rect
      ? placeAbove
        ? { bottom: Math.max(16, viewportH - rect.top + 16) }
        : { top: below }
      : { top: '40%' }),
  }

  return (
    <>
      {highlight ? (
        <div style={highlight} />
      ) : (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 2000 }}
          onClick={onClose}
        />
      )}
      <div style={cardStyle}>
        <div className="card border-0 shadow-lg">
          <div className="card-body">
            <p className="small fw-bold text-uppercase mb-2" style={{ color: 'var(--ta-gold, #d4af37)' }}>
              {t('passport.onboardTitle')}
            </p>
            <p className="mb-3">{step.text}</p>
            <div className="d-flex justify-content-between align-items-center">
              <button type="button" className="btn btn-link btn-sm text-muted p-0" onClick={onClose}>
                {t('passport.onboardSkip')}
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: 'var(--ta-gold, #d4af37)', color: '#111', fontWeight: 600 }}
                onClick={next}
              >
                {isLast ? t('passport.onboardDone') : t('passport.onboardNext')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
