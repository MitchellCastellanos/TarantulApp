import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Logo upload tool for non-individual accounts. On file pick it renders an instant
 * client-side black & white preview (what the label mark will look like) and asks the
 * account to confirm before persisting. The backend stores the color logo plus an
 * authoritative monochrome variant used on QR labels.
 *
 * `service` adapter: { get(), uploadLogo(file), deleteLogo(), setPreferences?({useBwOnLabels}) }
 */
export default function LogoUploader({ service, allowPreferences = true }) {
  const { t } = useTranslation()
  const fileRef = useRef(null)
  const canvasRef = useRef(null)
  const [state, setState] = useState(null)
  const [pending, setPending] = useState(null) // { file, objectUrl }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = () => service.get().then(setState).catch(() => setError(t('branding.loadError')))

  useEffect(() => {
    let cancelled = false
    service
      .get()
      .then((d) => !cancelled && setState(d))
      .catch(() => !cancelled && setError(t('branding.loadError')))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Render the B&W preview whenever a file is staged.
  useEffect(() => {
    if (!pending?.objectUrl || !canvasRef.current) return
    const img = new Image()
    img.onload = () => {
      const max = 220
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.filter = 'grayscale(1)'
      ctx.drawImage(img, 0, 0, w, h)
      ctx.filter = 'none'
    }
    img.src = pending.objectUrl
  }, [pending])

  const pickFile = (e) => {
    const file = e.target.files?.[0]
    setError('')
    if (!file) return
    if (!/^image\//.test(file.type)) {
      setError(t('branding.fileTypeError'))
      return
    }
    if (pending?.objectUrl) URL.revokeObjectURL(pending.objectUrl)
    setPending({ file, objectUrl: URL.createObjectURL(file) })
  }

  const cancelPending = () => {
    if (pending?.objectUrl) URL.revokeObjectURL(pending.objectUrl)
    setPending(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const confirmUpload = async () => {
    if (!pending?.file) return
    setBusy(true)
    setError('')
    try {
      const data = await service.uploadLogo(pending.file)
      if (data?.error) {
        setError(t(`branding.error.${data.error}`, { defaultValue: t('branding.uploadError') }))
      } else {
        setState(data)
        cancelPending()
      }
    } catch {
      setError(t('branding.uploadError'))
    } finally {
      setBusy(false)
    }
  }

  const removeLogo = async () => {
    setBusy(true)
    setError('')
    try {
      const data = await service.deleteLogo()
      setState(data)
    } catch {
      setError(t('branding.uploadError'))
    } finally {
      setBusy(false)
    }
  }

  const toggleBw = async (useBwOnLabels) => {
    setBusy(true)
    try {
      const data = await service.setPreferences({ useBwOnLabels })
      setState(data)
    } catch {
      setError(t('branding.uploadError'))
    } finally {
      setBusy(false)
    }
  }

  const hasLogo = Boolean(state?.logoUrl)

  return (
    <div className="border rounded p-3 mt-3">
      <h3 className="h6 mb-1">{t('branding.title')}</h3>
      <p className="small text-muted mb-3">{t('branding.hint')}</p>
      {error && <div className="alert alert-danger small py-2">{error}</div>}

      {hasLogo && !pending && (
        <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
          <div className="text-center">
            <img src={state.logoUrl} alt="logo" style={{ maxWidth: 96, maxHeight: 96 }} />
            <div className="small text-muted mt-1">{t('branding.colorLabel')}</div>
          </div>
          {state.logoBwUrl && (
            <div className="text-center">
              <img
                src={state.logoBwUrl}
                alt="logo b/w"
                style={{ maxWidth: 96, maxHeight: 96, background: '#fff' }}
              />
              <div className="small text-muted mt-1">{t('branding.bwLabel')}</div>
            </div>
          )}
        </div>
      )}

      {pending && (
        <div className="mb-3">
          <p className="small mb-2">{t('branding.previewPrompt')}</p>
          <canvas
            ref={canvasRef}
            style={{ border: '1px solid #ddd', borderRadius: 6, background: '#fff', maxWidth: '100%' }}
          />
          <div className="d-flex gap-2 mt-2">
            <button type="button" className="btn btn-dark btn-sm" disabled={busy} onClick={confirmUpload}>
              {busy ? t('common.loading') : t('branding.confirmCta')}
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={busy} onClick={cancelPending}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {!pending && (
        <div className="d-flex gap-2 flex-wrap">
          <label className="btn btn-outline-dark btn-sm mb-0">
            {hasLogo ? t('branding.replaceCta') : t('branding.uploadCta')}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickFile} />
          </label>
          {hasLogo && (
            <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy} onClick={removeLogo}>
              {t('branding.removeCta')}
            </button>
          )}
        </div>
      )}

      {hasLogo && allowPreferences && service.setPreferences && (
        <div className="form-check mt-3">
          <input
            id="logoUseBw"
            type="checkbox"
            className="form-check-input"
            checked={Boolean(state?.useBwOnLabels)}
            disabled={busy}
            onChange={(e) => toggleBw(e.target.checked)}
          />
          <label htmlFor="logoUseBw" className="form-check-label small">
            {t('branding.useBwOnLabels')}
          </label>
        </div>
      )}
    </div>
  )
}
