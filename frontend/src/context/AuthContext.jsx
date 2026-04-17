import { createContext, useContext, useState, useCallback, useEffect, useLayoutEffect } from 'react'
import billingService from '../services/billingService'
import { setSessionTokenSnapshot } from '../services/authApiToken'

const AuthContext = createContext(null)

function mergePlanFields(raw) {
  const plan = raw?.plan || 'FREE'
  const inTrial = raw?.inTrial === true
  const readOnly = plan === 'PRO' ? false : (raw?.readOnly === true)
  const hasProFeatures = plan === 'PRO' || inTrial
  const overFreeLimit = plan === 'PRO' ? false : (raw?.overFreeLimit === true)
  const strictReadOnly = plan === 'PRO' ? false : (raw?.strictReadOnly === true)
  return { ...raw, plan, inTrial, readOnly, hasProFeatures, overFreeLimit, strictReadOnly }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const raw = localStorage.getItem('token')
    if (raw == null) return null
    const t = String(raw).trim()
    return t === '' ? null : t
  })
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    if (!stored) return null
    try {
      return mergePlanFields(JSON.parse(stored))
    } catch {
      return null
    }
  })

  const login = useCallback((authData) => {
    const token = authData?.token != null ? String(authData.token).trim() : ''
    if (!token) {
      console.error('Auth: respuesta sin token', authData)
      return
    }
    const userId = authData.userId ?? authData.user_id
    const payload = mergePlanFields({
      id: userId,
      email: authData.email,
      displayName: authData.displayName,
      plan: authData.plan || 'FREE',
      inTrial: authData.inTrial,
      readOnly: authData.readOnly,
      trialEndsAt: authData.trialEndsAt ?? null,
      overFreeLimit: authData.overFreeLimit,
      strictReadOnly: authData.strictReadOnly,
    })
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(payload))
    setSessionTokenSnapshot(token)
    setToken(token)
    setUser(payload)
  }, [])

  const logout = useCallback(() => {
    setSessionTokenSnapshot(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  useLayoutEffect(() => {
    setSessionTokenSnapshot(token)
  }, [token])

  // Solo al montar el provider: sincronizar plan desde DB si había sesión en localStorage.
  // NO depender de [token]: justo después de login() el mismo efecto disparaba billing/me en caliente
  // y a veces 401 + logout(), borrando la sesión recién creada (login ya trae plan en AuthResponse).
  useEffect(() => {
    const raw = localStorage.getItem('token')
    const t = raw != null ? String(raw).trim() : ''
    if (!t) return

    let cancelled = false
    billingService.me()
      .then((data) => {
        if (cancelled || !data?.plan) return
        setUser((prev) => {
          if (!prev) return prev
          const next = mergePlanFields({
            ...prev,
            plan: data.plan,
            inTrial: data.inTrial,
            readOnly: data.readOnly,
            trialEndsAt: data.trialEndsAt ?? prev.trialEndsAt ?? null,
            overFreeLimit: data.overFreeLimit,
            strictReadOnly: data.strictReadOnly,
          })
          localStorage.setItem('user', JSON.stringify(next))
          return next
        })
      })
      .catch((err) => {
        if (cancelled) return
        if (err?.response?.status === 401) {
          if (import.meta.env.DEV) {
            console.warn('[TarantulApp] /billing/me → 401: sesión guardada inválida; se limpia.')
          }
          logout()
        }
      })
    return () => {
      cancelled = true
    }
  }, [logout])

  const setPlan = useCallback((plan) => {
    setUser(prev => {
      if (!prev) return prev
      const next = mergePlanFields({ ...prev, plan: plan || 'FREE' })
      localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, login, logout, setPlan }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
