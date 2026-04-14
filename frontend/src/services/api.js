import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '') + '/api',
  headers: { 'Content-Type': 'application/json' }
})

// Adjunta el JWT en cada request automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Si el backend responde 401, limpia sesión y manda al login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// Construye la URL completa de una foto almacenada en el backend.
// En dev: '/uploads/path' (el proxy de Vite lo redirige al backend local)
// En producción: 'https://railway-url/uploads/path'
export function imgUrl(path) {
  if (!path) return null
  return (import.meta.env.VITE_API_URL || '') + '/uploads/' + path
}
