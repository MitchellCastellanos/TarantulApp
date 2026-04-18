import axios, { AxiosHeaders } from 'axios'
import { normalizeViteApiBase } from '../utils/apiBaseUrl'

/**
 * API pública sin JWT (evita edge cases con tokens viejos en rutas /api/public/**).
 * Importante: en get/post usa paths relativos sin "/" inicial (p. ej. {@code public/discover/search});
 * si empiezan con "/", axios puede resolver contra el host y perder el prefijo {@code /api}.
 */
const publicApi = axios.create({
  baseURL: normalizeViteApiBase(),
  headers: { 'Content-Type': 'application/json' },
})

publicApi.interceptors.request.use((config) => {
  const headers = AxiosHeaders.from(config.headers)
  headers.delete('Authorization')
  config.headers = headers
  return config
})

export default publicApi
