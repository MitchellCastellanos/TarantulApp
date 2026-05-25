import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import marketplaceService from '../services/marketplaceService'

export default function VendorVerificationCard({ user }) {
  const { t } = useTranslation()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [selfieUrl, setSelfieUrl] = useState('')
  const [inventoryUrl, setInventoryUrl] = useState('')
  const [paperUrl, setPaperUrl] = useState('')

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const data = await marketplaceService.vendorVerificationMe()
      setStatus(data)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    load()
  }, [load])

  if (!user) return null
  if (loading) return null

  if (!status?.verifiedBreeder) {
    return (
      <div className="alert alert-info small py-2 mb-3">
        {t('vendorVerification.activationRequired')}
      </div>
    )
  }
  if (status?.storefrontVerified) {
    return (
      <div className="alert alert-success small py-2 mb-3">
        {t('vendorVerification.storefrontVerified')}
      </div>
    )
  }

  const latest = status?.latestSubmission
  if (latest?.status === 'pending') {
    return (
      <div className="alert alert-warning small py-2 mb-3">
        {t('vendorVerification.pending')}
      </div>
    )
  }
  if (latest?.status === 'approved') {
    return null
  }

  const uploadMedia = async (file) => {
    const res = await marketplaceService.uploadListingImage(file)
    return res?.url || res?.imageUrl || ''
  }

  const onPick = async (file, setter) => {
    if (!file) return
    setBusy(true)
    setMessage('')
    try {
      const url = await uploadMedia(file)
      setter(url)
    } catch {
      setMessage(t('vendorVerification.uploadError'))
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    setBusy(true)
    setMessage('')
    try {
      await marketplaceService.submitVendorVerification({
        selfieMediaUrl: selfieUrl,
        inventoryMediaUrl: inventoryUrl,
        paperMediaUrl: paperUrl || undefined,
      })
      setMessage(t('vendorVerification.submitted'))
      setSelfieUrl('')
      setInventoryUrl('')
      setPaperUrl('')
      await load()
    } catch (err) {
      setMessage(err?.response?.data?.error || t('vendorVerification.submitError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-body p-3">
        <h2 className="h6 fw-bold mb-2">{t('vendorVerification.title')}</h2>
        <p className="small text-muted mb-3">{t('vendorVerification.blurb')}</p>
        <ol className="small ps-3 mb-3" style={{ lineHeight: 1.5 }}>
          <li>{t('vendorVerification.step1')}</li>
          <li>{t('vendorVerification.step2')}</li>
          <li>{t('vendorVerification.step3')}</li>
        </ol>
        <div className="d-flex flex-column gap-2 mb-2">
          <label className="small">
            {t('vendorVerification.selfieLabel')}
            <input
              type="file"
              accept="video/*,image/*"
              className="form-control form-control-sm mt-1"
              disabled={busy}
              onChange={(e) => onPick(e.target.files?.[0], setSelfieUrl)}
            />
            {selfieUrl ? <span className="text-success d-block mt-1">{t('vendorVerification.uploaded')}</span> : null}
          </label>
          <label className="small">
            {t('vendorVerification.inventoryLabel')}
            <input
              type="file"
              accept="video/*,image/*"
              className="form-control form-control-sm mt-1"
              disabled={busy}
              onChange={(e) => onPick(e.target.files?.[0], setInventoryUrl)}
            />
            {inventoryUrl ? <span className="text-success d-block mt-1">{t('vendorVerification.uploaded')}</span> : null}
          </label>
          <label className="small">
            {t('vendorVerification.paperLabel')}
            <input
              type="file"
              accept="image/*"
              className="form-control form-control-sm mt-1"
              disabled={busy}
              onChange={(e) => onPick(e.target.files?.[0], setPaperUrl)}
            />
            {paperUrl ? <span className="text-success d-block mt-1">{t('vendorVerification.uploaded')}</span> : null}
          </label>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-dark"
          disabled={busy || !selfieUrl || !inventoryUrl}
          onClick={submit}
        >
          {busy ? t('common.loading') : t('vendorVerification.submitCta')}
        </button>
        {message ? <p className="small text-muted mt-2 mb-0">{message}</p> : null}
      </div>
    </div>
  )
}
