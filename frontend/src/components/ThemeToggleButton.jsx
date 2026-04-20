import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getStoredTheme, toggleStoredTheme } from '../utils/themePreference'

export default function ThemeToggleButton({ className = '', compact = false }) {
  const { t } = useTranslation()
  const [theme, setTheme] = useState(() => getStoredTheme())

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === 'tarantulapp-theme') {
        setTheme(getStoredTheme())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const isLight = theme === 'light'
  const title = isLight ? t('account.preferences.dark') : t('account.preferences.light')

  return (
    <button
      type="button"
      className={`btn btn-sm btn-outline-light ${className}`.trim()}
      onClick={() => setTheme(toggleStoredTheme())}
      title={title}
      aria-label={title}
      style={compact ? { padding: '0.1rem 0.45rem', lineHeight: 1.1 } : undefined}
    >
      {isLight ? '🌙' : '☀️'}
    </button>
  )
}
