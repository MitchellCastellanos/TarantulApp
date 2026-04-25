import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import marketplaceService from '../services/marketplaceService'
import userPublicService, { normalizePublicHandle } from '../services/userPublicService'

export default function HandleSetupPage() {
  const navigate = useNavigate()
  const { user, updateUserProfile } = useAuth()
  const [rawHandle, setRawHandle] = useState(user?.publicHandle || '')
  const [status, setStatus] = useState({ checking: false, available: false, valid: false, normalized: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const normalized = useMemo(() => normalizePublicHandle(rawHandle), [rawHandle])

  useEffect(() => {
    let cancelled = false
    if (!normalized) {
      setStatus({ checking: false, available: false, valid: false, normalized: '' })
      return
    }
    setStatus((s) => ({ ...s, checking: true, normalized }))
    userPublicService.checkHandleAvailability(normalized)
      .then((r) => {
        if (cancelled) return
        setStatus({
          checking: false,
          available: r?.available === true,
          valid: r?.valid === true,
          normalized: r?.normalized || normalized,
        })
      })
      .catch(() => {
        if (cancelled) return
        setStatus({ checking: false, available: false, valid: false, normalized })
      })
    return () => { cancelled = true }
  }, [normalized])

  const canSave = status.valid && status.available && !status.checking && !saving

  const submit = async (e) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    setErr('')
    try {
      const payload = await marketplaceService.saveMyProfile({
        displayName: user?.displayName || '',
        handle: status.normalized,
        bio: user?.bio || '',
        location: user?.location || '',
        featuredCollection: user?.featuredCollection || '',
        contactWhatsapp: user?.contactWhatsapp || '',
        contactInstagram: user?.contactInstagram || '',
        country: user?.profileCountry || '',
        state: user?.profileState || '',
        city: user?.profileCity || '',
        searchVisible: true,
        communityProfileVisibility: user?.communityProfileVisibility || 'preview_only',
      })
      updateUserProfile({ publicHandle: payload?.handle || status.normalized })
      navigate('/', { replace: true })
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'No se pudo guardar el @keeper.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Navbar />
      <div className="container mt-4" style={{ maxWidth: 560 }}>
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h1 className="h5 mb-2">Elige tu @keeper</h1>
            <p className="small text-muted mb-3">Necesitas un handle para participar en comunidad y aparecer en Spood.</p>
            {err && <div className="alert alert-danger small py-2">{err}</div>}
            <form onSubmit={submit}>
              <input
                className="form-control mb-2"
                value={rawHandle}
                onChange={(e) => setRawHandle(e.target.value)}
                placeholder="@tu_handle"
                autoFocus
              />
              <div className="small mb-3 text-muted">
                {status.checking && 'Revisando disponibilidad...'}
                {!status.checking && normalized && !status.valid && 'Ese handle no es valido.'}
                {!status.checking && status.valid && !status.available && `@${status.normalized} no esta disponible.`}
                {!status.checking && status.valid && status.available && `@${status.normalized} esta disponible.`}
              </div>
              <button type="submit" className="btn btn-dark btn-sm" disabled={!canSave}>
                {saving ? 'Guardando...' : 'Continuar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
