import { useEffect, useRef, useState } from 'react'
import { imgUrl } from '../services/api'
import { publicUrl } from '../utils/publicAssets.js'

const PLACEHOLDER = publicUrl('spider-default.png')

function resolveUrl(raw) {
  if (!raw || !String(raw).trim()) return null
  return imgUrl(String(raw).trim())
}

/**
 * Species reference: try stored URL (DB), then optional fallback (iNat client/server), then spider placeholder.
 * If the stored URL fails to load, {@code onStoredUrlFailed} runs so the parent can fetch a fallback.
 */
export default function SpeciesReferenceImage({
  storedUrl,
  fallbackUrl,
  alt = '',
  className = '',
  style,
  onStoredUrlFailed,
}) {
  const storedResolved = resolveUrl(storedUrl)
  const fallbackResolved = resolveUrl(fallbackUrl)

  const [phase, setPhase] = useState(() =>
    storedResolved ? 'stored' : fallbackResolved ? 'fallback' : 'placeholder'
  )
  const failedStoredRef = useRef(false)

  useEffect(() => {
    failedStoredRef.current = false
    setPhase(storedResolved ? 'stored' : fallbackResolved ? 'fallback' : 'placeholder')
  }, [storedUrl, storedResolved])

  useEffect(() => {
    if (!failedStoredRef.current) return
    setPhase(fallbackResolved ? 'fallback' : 'placeholder')
  }, [fallbackResolved])

  const src =
    phase === 'stored' && storedResolved
      ? storedResolved
      : phase === 'fallback' && fallbackResolved
        ? fallbackResolved
        : PLACEHOLDER

  const handleError = (e) => {
    e.currentTarget.onerror = null
    if (phase === 'stored' && storedResolved) {
      failedStoredRef.current = true
      onStoredUrlFailed?.()
      setPhase(fallbackResolved ? 'fallback' : 'placeholder')
    } else if (phase === 'fallback') {
      setPhase('placeholder')
    }
  }

  return <img src={src} alt={alt} className={className} style={style} onError={handleError} />
}
