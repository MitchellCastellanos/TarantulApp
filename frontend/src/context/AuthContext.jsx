import { createContext, useContext, useState, useCallback, useEffect, useLayoutEffect } from 'react'
import billingService from '../services/billingService'
import { setSessionTokenSnapshot } from '../services/authApiToken'
import { initNativePush } from '../services/pushService'

const AuthContext = createContext(null)

function mergePlanFields(raw) {
  const rawPlan = raw?.plan != null && String(raw.plan).trim() !== '' ? String(raw.plan).trim() : 'FREE'
  const u = rawPlan.toUpperCase()
  const plan = u === 'PRO' ? 'PRO' : (u === 'FREE' ? 'FREE' : rawPlan)
  const inTrial = raw?.inTrial === true
  const readOnly = plan === 'PRO' ? false : (raw?.readOnly === true)
  const hasProFeatures = plan === 'PRO' || inTrial
  const overFreeLimit = plan === 'PRO' ? false : (raw?.overFreeLimit === true)
  const strictReadOnly = plan === 'PRO' ? false : (raw?.strictReadOnly === true)
  return {
    ...raw,
    plan,
    inTrial,
    readOnly,
    hasProFeatures,
    overFreeLimit,
    strictReadOnly,
    publicHandle: raw?.publicHandle || '',
    bio: raw?.bio || '',
    location: raw?.location || '',
    featuredCollection: raw?.featuredCollection || '',
    contactWhatsapp: raw?.contactWhatsapp || '',
    contactInstagram: raw?.contactInstagram || '',
    profileCountry: raw?.profileCountry || '',
    profileState: raw?.profileState || '',
    profileCity: raw?.profileCity || '',
    qrPrintExports: Number(raw?.qrPrintExports || 0),
    profilePhoto: raw?.profilePhoto || '',
    communityProfileVisibility: raw?.communityProfileVisibility || 'preview_only',
    admin: raw?.admin === true,
    betaTester: raw?.betaTester === true || raw?.isBetaTester === true,
    betaAgreementAcceptedAt: raw?.betaAgreementAcceptedAt ?? null,
  }
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
      publicHandle: authData.publicHandle,
      bio: authData.bio,
      location: authData.location,
      featuredCollection: authData.featuredCollection,
      contactWhatsapp: authData.contactWhatsapp,
      contactInstagram: authData.contactInstagram,
      profileCountry: authData.profileCountry,
      profileState: authData.profileState,
      profileCity: authData.profileCity,
      qrPrintExports: authData.qrPrintExports,
      profilePhoto: authData.profilePhoto,
      communityProfileVisibility: authData.communityProfileVisibility,
      admin: authData.admin === true,
      betaTester: authData.betaTester === true || authData.isBetaTester === true,
      betaAgreementAcceptedAt: authData.betaAgreementAcceptedAt ?? null,
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

  // Token sin JSON de usuario (storage corrupto o clave borrada) deja la UI a medias; limpiar y volver a login.
  useLayoutEffect(() => {
    if (!token) return
    const raw = localStorage.getItem('user')
    if (raw == null || String(raw).trim() === '') {
      logout()
    }
  }, [token, logout])

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
          const admin =
            typeof data.admin === 'boolean' ? data.admin : prev.admin === true
          const betaTester =
            typeof data.isBetaTester === 'boolean' ? data.isBetaTester : prev.betaTester === true
          const betaAgreementAcceptedAt =
            data.betaAgreementAcceptedAt !== undefined
              ? data.betaAgreementAcceptedAt
              : prev.betaAgreementAcceptedAt
          const next = mergePlanFields({
            ...prev,
            plan: data.plan,
            inTrial: data.inTrial,
            readOnly: data.readOnly,
            trialEndsAt: data.trialEndsAt ?? prev.trialEndsAt ?? null,
            overFreeLimit: data.overFreeLimit,
            strictReadOnly: data.strictReadOnly,
            admin,
            betaTester,
            betaAgreementAcceptedAt,
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

  useEffect(() => {
    if (!token) return
    initNativePush().catch((err) => {
      if (import.meta.env.DEV) {
        console.warn('[TarantulApp] init native push failed', err?.message || err)
      }
    })
  }, [token])

  const setPlan = useCallback((plan) => {
    setUser(prev => {
      if (!prev) return prev
      const next = mergePlanFields({ ...prev, plan: plan || 'FREE' })
      localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }, [])

  const updateUserProfile = useCallback((profilePatch) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = mergePlanFields({ ...prev, ...profilePatch })
      localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, login, logout, setPlan, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
