import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import meTransfersService from '../services/meTransfersService'

export default function TransfersPage() {
  const { t } = useTranslation()
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const reload = () => {
    setLoading(true)
    return Promise.all([meTransfersService.incoming(), meTransfersService.outgoing()])
      .then(([inc, out]) => {
        setIncoming(inc || [])
        setOutgoing(out || [])
      })
      .catch(() => setError(t('transfers.loadError')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const accept = async (id) => {
    setBusyId(id)
    setError('')
    try {
      const data = await meTransfersService.accept(id)
      if (data?.error) setError(t(`transfers.error.${data.error}`, { defaultValue: t('transfers.acceptError') }))
      else await reload()
    } catch {
      setError(t('transfers.acceptError'))
    } finally {
      setBusyId('')
    }
  }

  const cancel = async (id) => {
    setBusyId(id)
    setError('')
    try {
      await meTransfersService.cancel(id)
      await reload()
    } catch {
      setError(t('transfers.cancelError'))
    } finally {
      setBusyId('')
    }
  }

  const pendingOutgoing = outgoing.filter((tr) => tr.status === 'pending')

  return (
    <div className="container mt-4" style={{ maxWidth: 760 }}>
      <h1 className="h4 mb-1">{t('transfers.title')}</h1>
      <p className="small text-muted">{t('transfers.subtitle')}</p>
      <div className="alert alert-secondary small py-2">{t('transfers.disclaimer')}</div>
      {error && <div className="alert alert-danger small py-2">{error}</div>}

      {loading ? (
        <p className="small text-muted">{t('common.loading')}</p>
      ) : (
        <>
          <h2 className="h6 mt-3">{t('transfers.incomingTitle')}</h2>
          {incoming.length === 0 ? (
            <p className="small text-muted">{t('transfers.incomingEmpty')}</p>
          ) : (
            incoming.map((tr) => (
              <div key={tr.id} className="border rounded p-3 mb-2">
                <div className="fw-semibold">{tr.specimenName}</div>
                {tr.scientificName && <div className="small fst-italic text-muted">{tr.scientificName}</div>}
                <div className="small text-muted">
                  {t('transfers.fromLabel')}: {tr.fromDisplayName || '—'}
                </div>
                {tr.message && <div className="small mt-1">“{tr.message}”</div>}
                <button
                  type="button"
                  className="btn btn-dark btn-sm mt-2"
                  disabled={busyId === tr.id}
                  onClick={() => accept(tr.id)}
                >
                  {busyId === tr.id ? t('common.loading') : t('transfers.acceptCta')}
                </button>
              </div>
            ))
          )}

          <h2 className="h6 mt-4">{t('transfers.outgoingTitle')}</h2>
          {pendingOutgoing.length === 0 ? (
            <p className="small text-muted">{t('transfers.outgoingEmpty')}</p>
          ) : (
            pendingOutgoing.map((tr) => (
              <div key={tr.id} className="border rounded p-3 mb-2">
                <div className="fw-semibold">{tr.specimenName}</div>
                <div className="small text-muted">
                  {t('transfers.toLabel')}: {tr.toEmail} ·{' '}
                  <span className="badge text-bg-warning text-dark">{t('transfers.statusPending')}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm mt-2"
                  disabled={busyId === tr.id}
                  onClick={() => cancel(tr.id)}
                >
                  {busyId === tr.id ? t('common.loading') : t('transfers.cancelCta')}
                </button>
              </div>
            ))
          )}
        </>
      )}

      <div className="mt-4">
        <Link to="/dashboard" className="btn btn-sm btn-outline-secondary">
          {t('transfers.backToCollection')}
        </Link>
      </div>
    </div>
  )
}
