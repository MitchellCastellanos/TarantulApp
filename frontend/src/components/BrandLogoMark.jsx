import { useEffect, useState } from 'react'
import { useAppTheme } from '../hooks/useAppTheme'

/**
 * Logo circular de marca (anillo intro opcional). El contenedor (Link, etc.) va fuera.
 * @param {{ size?: number, className?: string, showIntro?: boolean }} [props]
 */
export default function BrandLogoMark({ size = 40, className = '', showIntro = true }) {
  const theme = useAppTheme()
  const [intro, setIntro] = useState(showIntro)
  const src = theme === 'light' ? '/logo-black.png' : '/logo-neon.png'

  useEffect(() => {
    if (!showIntro) return
    setIntro(true)
  }, [src, showIntro])

  useEffect(() => {
    if (!showIntro || !intro) return undefined
    const id = window.setTimeout(() => setIntro(false), 3200)
    return () => window.clearTimeout(id)
  }, [intro, showIntro])

  const wrapClass = `ta-brand-logo-wrap${showIntro && intro ? ' ta-brand-logo-wrap--intro' : ''} ${className}`.trim()
  const px = `${size}px`

  return (
    <span className={wrapClass} style={{ width: px, height: px }}>
      <span
        className="ta-brand-logo-ring"
        aria-hidden="true"
        onAnimationEnd={(e) => {
          if (e.animationName === 'ta-brand-ring-orbit') setIntro(false)
        }}
      />
      <img
        src={`${src}?v=2`}
        width={size}
        height={size}
        className="ta-brand-logo-img"
        alt=""
        decoding="async"
        fetchpriority="high"
        style={{ width: px, height: px }}
      />
    </span>
  )
}
