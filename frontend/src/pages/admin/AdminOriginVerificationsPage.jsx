import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import adminService from '../../services/adminService'

const STATUS_FILTERS = ['pending', 'approved', 'rejected', '']

export default function AdminOriginVerificationsPage() {
  const { t } = useTranslation()
  const [statusFilter, setStatusFilter] = useState('pending')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.originVerifications(statusFilter || undefined)
      setRows(Array.isArray(data) ? data : [])
      setError('')
    } catch {
      setError(t('admin.loadError'))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, t])

  useEffect(() => {
    load()
  }, [load])

  const review = async (id, status) => {
    const note = status === 'rejected'
      ? window.prompt(t('admin.originReviewRejectNote'), '')
      : ''
    if (status === 'rejected' && note == null) return
    setBusyId(id)
    try {
      await adminService.reviewOriginVerification(id, { status, reviewerNote: note || '' })
      await load()
    } catch {
      setError(t('admin.resolveError'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <h2 className="h5 mb-2">{t('admin.originVerificationsTitle')}</h2>
      <p className="small text-muted mb-3">{t('admin.originVerificationsBlurb')}</p>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="d-flex flex-wrap gap-2 mb-3">
        {STATUS_FILTERS.map((st) => (
          <button
            key={st || 'all'}
            type="button"
            className={`btn btn-sm ${statusFilter === st ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => setStatusFilter(st)}
          >
            {st ? t(`admin.originStatus.${st}`) : t('admin.originStatus.all')}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted small">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <p className="text-muted small">{t('admin.originVerificationsEmpty')}</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th>{t('admin.originColUser')}</th>
                <th>{t('admin.originColKind')}</th>
                <th>{t('admin.originColNote')}</th>
                <th>{t('admin.created')}</th>
                <th>{t('admin.originColStatus')}</th>
                <th>{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="small">
                    <div>{row.userDisplayName || '—'}</div>
                    <div className="text-muted">{row.userEmail}</div>
                  </td>
                  <td className="small">{row.kind || '—'}</td>
                  <td className="small" style={{ maxWidth: 280 }}>
                    <div>{row.note || '—'}</div>
                    {row.evidenceUrl ? (
                      <a href={row.evidenceUrl} target="_blank" rel="noreferrer" className="text-muted">
                        {row.evidenceUrl}
                      </a>
                    ) : null}
                  </td>
                  <td className="small">{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</td>
                  <td className="small">
                    <span className="badge bg-secondary">{row.status || '—'}</span>
                  </td>
                  <td>
                    {row.status === 'pending' ? (
                      <div className="d-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-success"
                          disabled={busyId === row.id}
                          onClick={() => review(row.id, 'approved')}
                        >
                          {t('admin.originApprove')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          disabled={busyId === row.id}
                          onClick={() => review(row.id, 'rejected')}
                        >
                          {t('admin.originReject')}
                        </button>
                      </div>
                    ) : (
                      <span className="small text-muted">{row.reviewerNote || '—'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
