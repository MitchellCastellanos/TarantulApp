import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import marketplaceService from '../services/marketplaceService'
import userPublicService, { normalizePublicHandle } from '../services/userPublicService'

const STEP_HANDLE = 'handle'
const STEP_PRIVACY = 'privacy'

export default function HandleSetupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, updateUserProfile } = useAuth()
  const [step, setStep] = useState(STEP_HANDLE)
  const [rawHandle, setRawHandle] = useState(user?.publicHandle || '')
  const [status, setStatus] = useState({ checking: false, available: false, valid: false, normalized: '' })
  const [privacyChoice, setPrivacyChoice] = useState('social')
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

  const canContinueHandle = status.valid && status.available && !status.checking && !saving

  const submitHandle = (e) => {
    e.preventDefault()
    if (!canContinueHandle) return
    setErr('')
    setStep(STEP_PRIVACY)
  }

  const submitPrivacy = async (e) => {
    e.preventDefault()
    if (saving) return
    const social = privacyChoice === 'social'
    setSaving(true)
    setErr('')
    try {
      const payload =       await marketplaceService.saveMyProfile({
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
        communityProfileVisibility: social ? 'public_full' : 'preview_only',
      })
      updateUserProfile({
        publicHandle: payload?.handle || status.normalized,
        communityProfileVisibility: social ? 'public_full' : 'preview_only',
        defaultTarantulaPublic: social,
      })
      queryClient.invalidateQueries({ queryKey: keeperProfileKeys.all })
      queryClient.invalidateQueries({ queryKey: tarantulaKeys.list() })
      navigate('/', { replace: true })
    } catch (e2) {
      setErr(e2?.response?.data?.error || t('handleSetup.saveError'))
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
            {step === STEP_HANDLE ? (
              <>
                <h1 className="h5 mb-2">{t('handleSetup.title')}</h1>
                <p className="small text-muted mb-3">{t('handleSetup.subtitle')}</p>
                {err && <div className="alert alert-danger small py-2">{err}</div>}
                <form onSubmit={submitHandle}>
                  <input
                    className="form-control mb-2"
                    value={rawHandle}
                    onChange={(e) => setRawHandle(e.target.value)}
                    placeholder="@tu_handle"
                    autoFocus
                  />
                  <div className="small mb-3 text-muted">
                    {status.checking && t('handleSetup.checking')}
                    {!status.checking && status.normalized && !status.valid && t('handleSetup.invalid')}
                    {!status.checking && status.valid && !status.available && t('handleSetup.taken', { handle: status.normalized })}
                    {!status.checking && status.valid && status.available && t('handleSetup.available', { handle: status.normalized })}
                  </div>
                  <button type="submit" className="btn btn-dark btn-sm" disabled={!canContinueHandle}>
                    {t('handleSetup.continue')}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h1 className="h5 mb-2">{t('handleSetup.privacyTitle')}</h1>
                <p className="small text-muted mb-3">
                  {t('handleSetup.privacySubtitle', { handle: status.normalized })}
                </p>
                {err && <div className="alert alert-danger small py-2">{err}</div>}
                <form onSubmit={submitPrivacy}>
                  <div className="d-flex flex-column gap-2 mb-3">
                    <label
                      htmlFor="privacy-social"
                      className={`border rounded-3 p-3 d-flex gap-2 ${privacyChoice === 'social' ? 'border-dark bg-light' : ''}`}
                      style={{ cursor: 'pointer' }}
                    >
                      <input
                        id="privacy-social"
                        type="radio"
                        name="privacy"
                        value="social"
                        checked={privacyChoice === 'social'}
                        onChange={() => setPrivacyChoice('social')}
                        className="mt-1"
                      />
                      <span>
                        <span className="fw-semibold d-block">{t('handleSetup.socialTitle')}</span>
                        <span className="small text-muted">{t('handleSetup.socialBody')}</span>
                      </span>
                    </label>
                    <label
                      htmlFor="privacy-private"
                      className={`border rounded-3 p-3 d-flex gap-2 ${privacyChoice === 'private' ? 'border-dark bg-light' : ''}`}
                      style={{ cursor: 'pointer' }}
                    >
                      <input
                        id="privacy-private"
                        type="radio"
                        name="privacy"
                        value="private"
                        checked={privacyChoice === 'private'}
                        onChange={() => setPrivacyChoice('private')}
                        className="mt-1"
                      />
                      <span>
                        <span className="fw-semibold d-block">{t('handleSetup.privateTitle')}</span>
                        <span className="small text-muted">{t('handleSetup.privateBody')}</span>
                      </span>
                    </label>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setStep(STEP_HANDLE)} disabled={saving}>
                      {t('common.back')}
                    </button>
                    <button type="submit" className="btn btn-dark btn-sm" disabled={saving}>
                      {saving ? t('common.saving') : t('handleSetup.finish')}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
