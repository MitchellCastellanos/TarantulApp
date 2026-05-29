import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import FangPanel from '../components/FangPanel'
import studioService from '../services/studioService'

export default function StudioPassportsPage() {
  const { t } = useTranslation()
  const { data: passports = [], isLoading } = useQuery({
    queryKey: ['studio', 'passports'],
    queryFn: () => studioService.listAllPassports(),
  })

  if (isLoading) {
    return <p>{t('common.loading')}</p>
  }

  if (passports.length === 0) {
    return (
      <FangPanel>
        <p className="small text-muted mb-0">{t('studio.allPassportsEmpty')}</p>
      </FangPanel>
    )
  }

  return (
    <div>
      <h2 className="h6 mb-3">{t('studio.allPassportsTitle')}</h2>
      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>{t('studio.passportColShortId')}</th>
              <th>{t('studio.passportColSpecies')}</th>
              <th>{t('studio.passportColBatch')}</th>
              <th>{t('studio.passportColStatus')}</th>
              <th>{t('studio.passportColActions')}</th>
            </tr>
          </thead>
          <tbody>
            {passports.map((p) => (
              <tr key={p.id}>
                <td className="font-monospace small">{p.shortId}</td>
                <td className="small">
                  {p.scientificName || '—'}
                  {p.commonName ? <div className="text-muted">{p.commonName}</div> : null}
                </td>
                <td className="small">
                  {p.batchName ? (
                    <Link to={`/studio/batches/${p.batchId}`} className="text-decoration-none">
                      {p.batchName}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="small">
                  {p.claimed ? (
                    <span className="badge text-bg-success">{t('studio.passportClaimed')}</span>
                  ) : (
                    <span className="badge text-bg-secondary">{t('studio.passportUnclaimed')}</span>
                  )}
                </td>
                <td>
                  <div className="d-flex flex-wrap gap-1">
                    <a href={p.publicUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-dark">
                      {t('studio.openPassport')}
                    </a>
                    {!p.claimed && (
                      <Link
                        to={`/studio/labels?batch=${p.batchId || ''}&mode=bulk`}
                        className="btn btn-sm btn-outline-secondary"
                      >
                        {t('studio.printLabels')}
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
