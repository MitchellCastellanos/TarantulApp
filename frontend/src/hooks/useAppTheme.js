import { useEffect, useState } from 'react'
import { getStoredTheme, THEME_CHANGE_EVENT } from '../utils/themePreference'

const THEME_KEY = 'tarantulapp-theme'

export function useAppTheme() {
  const [theme, setTheme] = useState(() => getStoredTheme())

  useEffect(() => {
    const sync = () => setTheme(getStoredTheme())
    window.addEventListener(THEME_CHANGE_EVENT, sync)
    const onStorage = (e) => {
      if (e.key === THEME_KEY) sync()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return theme
}
