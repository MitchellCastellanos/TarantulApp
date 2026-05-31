import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { imgUrl } from '../services/api'

/**
 * Logo upload for non-individual accounts. The uploaded color image is used everywhere
 * (storefront, labels, passport pages). Print in B&W is the client's printer choice.
 *
 * `service` adapter: { get(), uploadLogo(file), deleteLogo() }
 */
export default function LogoUploader({ service }) {
  const { t } = useTranslation()
  const fileRef = useRef(null)
  const [state, setState] = useState(null)
  const [pending, setPending] = useState(null) // { file, objectUrl }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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

  const hasLogo = Boolean(state?.logoUrl)
  const logoSrc = imgUrl(state?.logoUrl) || state?.logoUrl

  return (
    <div className="border rounded p-3 mt-3">
      <h3 className="h6 mb-1">{t('branding.title')}</h3>
      <p className="small text-muted mb-3">{t('branding.hint')}</p>
      {error && <div className="alert alert-danger small py-2">{error}</div>}

      {hasLogo && !pending && (
        <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
          <div className="text-center">
            <img
              src={logoSrc}
              alt="logo"
              style={{ maxWidth: 120, maxHeight: 120, objectFit: 'contain', background: '#fff' }}
            />
            <div className="small text-muted mt-1">{t('branding.colorLabel')}</div>
          </div>
        </div>
      )}

      {pending && (
        <div className="mb-3">
          <p className="small mb-2">{t('branding.previewPrompt')}</p>
          <img
            src={pending.objectUrl}
            alt=""
            style={{ border: '1px solid #ddd', borderRadius: 6, background: '#fff', maxWidth: 220, maxHeight: 220, objectFit: 'contain' }}
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
    </div>
  )
}
