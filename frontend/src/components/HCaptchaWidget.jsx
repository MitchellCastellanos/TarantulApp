import { useEffect, useRef } from 'react'

const HCAPTCHA_SCRIPT_SRC = 'https://js.hcaptcha.com/1/api.js?render=explicit'
const SCRIPT_DATA_ATTR = 'data-tarantulapp-hcaptcha'

let scriptLoadPromise = null

function loadHCaptchaScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no-window'))
  if (window.hcaptcha) return Promise.resolve(window.hcaptcha)
  if (scriptLoadPromise) return scriptLoadPromise

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[${SCRIPT_DATA_ATTR}="1"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.hcaptcha))
      existing.addEventListener('error', () => reject(new Error('hcaptcha-script-error')))
      return
    }
    const script = document.createElement('script')
    script.src = HCAPTCHA_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.setAttribute(SCRIPT_DATA_ATTR, '1')
    script.onload = () => resolve(window.hcaptcha)
    script.onerror = () => {
      scriptLoadPromise = null
      reject(new Error('hcaptcha-script-error'))
    }
    document.head.appendChild(script)
  })
  return scriptLoadPromise
}

/**
 * Renders the hCaptcha widget when VITE_HCAPTCHA_SITE_KEY is configured.
 * Otherwise renders nothing — the backend mirrors this with app.captcha.enabled
 * so flows keep working in dev without a captcha account.
 *
 * Props:
 *   - onToken(token): called when the user completes the challenge.
 *   - onExpire(): called when the token expires; consumers should clear local state.
 */
export default function HCaptchaWidget({ onToken, onExpire }) {
  const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)
  const onTokenRef = useRef(onToken)
  const onExpireRef = useRef(onExpire)
  onTokenRef.current = onToken
  onExpireRef.current = onExpire

  useEffect(() => {
    if (!siteKey || !containerRef.current) return
    let disposed = false

    loadHCaptchaScript()
      .then((hcaptcha) => {
        if (disposed || !containerRef.current || !hcaptcha) return
        widgetIdRef.current = hcaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onTokenRef.current && onTokenRef.current(token),
          'expired-callback': () => onExpireRef.current && onExpireRef.current(),
          'error-callback': () => onExpireRef.current && onExpireRef.current()
        })
      })
      .catch(() => {
        // Loading the widget is best-effort; if the script fails the user just
        // sees no captcha and the backend will reject if it required one.
      })

    return () => {
      disposed = true
      if (widgetIdRef.current != null && window.hcaptcha?.reset) {
        try {
          window.hcaptcha.reset(widgetIdRef.current)
        } catch {
          /* ignore */
        }
      }
    }
  }, [siteKey])

  if (!siteKey) return null
  return <div ref={containerRef} className="my-2" />
}

export function isCaptchaEnabled() {
  return Boolean(import.meta.env.VITE_HCAPTCHA_SITE_KEY)
}
