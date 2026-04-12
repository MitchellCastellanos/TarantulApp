import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function LoginPage() {
  const { login } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ email: '', password: '', displayName: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
      const { data } = await api.post(endpoint, form)
      login(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Algo salió mal. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}
    >
      <div className="card shadow-lg border-0" style={{ width: '100%', maxWidth: '420px' }}>
        <div className="card-body p-4 p-md-5">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="fs-1 mb-2">🕷️</div>
            <h2 className="fw-bold mb-1">TarantulApp</h2>
            <p className="text-muted small mb-0">
              {mode === 'login'
                ? 'Inicia sesión para ver tu colección'
                : 'Crea tu cuenta y empieza a registrar'}
            </p>
          </div>

          {error && (
            <div className="alert alert-danger py-2 small" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {mode === 'register' && (
              <div className="mb-3">
                <label className="form-label fw-semibold small">Nombre</label>
                <input
                  type="text"
                  name="displayName"
                  className="form-control"
                  value={form.displayName}
                  onChange={handleChange}
                  placeholder="¿Cómo te llamamos?"
                  autoComplete="name"
                />
              </div>
            )}

            <div className="mb-3">
              <label className="form-label fw-semibold small">Email</label>
              <input
                type="email"
                name="email"
                className="form-control"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="tucorreo@ejemplo.com"
                autoComplete="email"
              />
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold small">Contraseña</label>
              <input
                type="password"
                name="password"
                className="form-control"
                required
                value={form.password}
                onChange={handleChange}
                placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : ''}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            <button
              type="submit"
              className="btn btn-dark w-100 py-2 fw-semibold"
              disabled={loading}
            >
              {loading
                ? 'Cargando...'
                : mode === 'login'
                ? 'Iniciar sesión'
                : 'Crear cuenta'}
            </button>
          </form>

          <hr className="my-3" />

          <p className="text-center small mb-0">
            {mode === 'login' ? (
              <>
                ¿No tienes cuenta?{' '}
                <button
                  className="btn btn-link btn-sm p-0 text-decoration-none"
                  onClick={() => { setMode('register'); setError('') }}
                >
                  Regístrate
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{' '}
                <button
                  className="btn btn-link btn-sm p-0 text-decoration-none"
                  onClick={() => { setMode('login'); setError('') }}
                >
                  Inicia sesión
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
