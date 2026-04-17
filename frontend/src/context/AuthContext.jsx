import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import billingService from '../services/billingService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })

  // Sync plan from DB on every app load — ensures post-payment plan is reflected
  useEffect(() => {
    if (!token) return
    billingService.me()
      .then(data => {
        if (!data?.plan) return
        setUser(prev => {
          if (!prev || prev.plan === data.plan) return prev
          const next = { ...prev, plan: data.plan }
          localStorage.setItem('user', JSON.stringify(next))
          return next
        })
      })
      .catch(() => {})
  }, [token])

  const login = useCallback((authData) => {
    localStorage.setItem('token', authData.token)
    localStorage.setItem('user', JSON.stringify({
      id: authData.userId,
      email: authData.email,
      displayName: authData.displayName,
      plan: authData.plan || 'FREE',
    }))
    setToken(authData.token)
    setUser({
      id: authData.userId,
      email: authData.email,
      displayName: authData.displayName,
      plan: authData.plan || 'FREE',
    })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  const setPlan = useCallback((plan) => {
    setUser(prev => {
      if (!prev) return prev
      const next = { ...prev, plan: plan || 'FREE' }
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
