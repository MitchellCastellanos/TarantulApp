import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import FangPanel from '../components/FangPanel'
import VerifiedOriginBadge from '../components/VerifiedOriginBadge'
import meOriginService from '../services/meOriginService'
import { useCapabilities } from '../hooks/useCapabilities'

const KINDS = ['BREEDER', 'STORE', 'VENDOR', 'SELLER']

export default function StudioOriginPage() {
  const { t } = useTranslation()
  const { data: capabilities } = useCapabilities()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [kind, setKind] = useState('BREEDER')
  const [note, setNote] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let cancelled = false
    meOriginService
      .status()
      .then((data) => {
        if (!cancelled) setStatus(data)
      })
      .catch(() => {
        if (!cancelled) setError(t('verifiedOrigin.submitError'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  if (loading) {
    return <p>{t('common.loading')}</p>
  }

  if (capabilities?.verifiedOrigin || status?.verified) {
    return (
      <FangPanel>
        <div className="d-flex align-items-center gap-2 mb-2">
          <VerifiedOriginBadge origin={status?.origin || { verified: true, kind: status?.kind || 'BREEDER' }} />
        </div>
        <p className="small text-muted mb-0">{t('studio.originVerifiedBlurb')}</p>
      </FangPanel>
    )
  }

  if (status?.pending) {
    return (
      <FangPanel>
        <p className="small mb-0">{t('verifiedOrigin.pending')}</p>
      </FangPanel>
    )
  }

  return (
    <FangPanel>
      <h2 className="h6 mb-2">{t('verifiedOrigin.submitTitle')}</h2>
      <p className="small text-muted mb-3">{t('verifiedOrigin.submitHint')}</p>
      {error && <div className="alert alert-danger small py-2">{error}</div>}
      {success && <div className="alert alert-success small py-2">{success}</div>}
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError('')
          setSuccess('')
          try {
            const data = await meOriginService.submit({
              kind,
              note: note.trim(),
              evidenceUrl: evidenceUrl.trim() || undefined,
            })
            setStatus(data)
            setSuccess(t('verifiedOrigin.submitSuccess'))
          } catch {
            setError(t('verifiedOrigin.submitError'))
          } finally {
            setBusy(false)
          }
        }}
      >
        <label className="form-label small">{t('studio.originKindLabel')}</label>
        <select className="form-select form-select-sm mb-2" value={kind} onChange={(e) => setKind(e.target.value)}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`verifiedOrigin.kind.${k.toLowerCase()}`)}
            </option>
          ))}
        </select>
        <label className="form-label small">{t('studio.originNoteLabel')}</label>
        <textarea
          className="form-control form-control-sm mb-2"
          rows={4}
          required
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('studio.originNotePlaceholder')}
        />
        <label className="form-label small">{t('studio.originEvidenceLabel')}</label>
        <input
          type="url"
          className="form-control form-control-sm mb-3"
          value={evidenceUrl}
          onChange={(e) => setEvidenceUrl(e.target.value)}
          placeholder="https://"
        />
        <button type="submit" className="btn btn-dark btn-sm" disabled={busy || !note.trim()}>
          {busy ? t('common.loading') : t('verifiedOrigin.submitCta')}
        </button>
      </form>
    </FangPanel>
  )
}
