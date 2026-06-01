import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import adminService from '../../services/adminService'

const COLOR_DOT = { green: '#22c55e', yellow: '#eab308', red: '#ef4444', grey: '#9ca3af' }

function Dot({ color, title }) {
  return (
    <span
      title={title}
      style={{
        display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
        background: COLOR_DOT[color] || COLOR_DOT.grey, marginRight: 4,
      }}
    />
  )
}

/** Admin overview: labels issued per user, verified-origin flag, claim traffic-light, print on behalf. */
export default function AdminLabelsPage() {
  const { t } = useTranslation()
  const [openIssuer, setOpenIssuer] = useState(null)

  const { data: issuers = [], isLoading } = useQuery({
    queryKey: ['admin', 'label-issuers'],
    queryFn: () => adminService.labelIssuers(),
  })

  const { data: rows = [], isLoading: rowsLoading } = useQuery({
    queryKey: ['admin', 'issuer-passports', openIssuer],
    queryFn: () => adminService.issuerPassports(openIssuer),
    enabled: Boolean(openIssuer),
  })

  return (
    <div>
      <h2 className="h5 mb-3">{t('admin.labelsTitle', 'Labels issued per user')}</h2>
      <p className="small text-muted mb-3">
        {t('admin.labelsHint', 'Green = claim confirmed by issuer · Yellow = pending · Red = unconfirmed past 2h.')}
      </p>

      {isLoading ? (
        <p>{t('common.loading')}</p>
      ) : issuers.length === 0 ? (
        <p className="text-muted">{t('admin.labelsEmpty', 'No labels issued yet.')}</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th>{t('admin.labelsIssuer', 'Issuer')}</th>
                <th>{t('admin.labelsVerified', 'Verified origin')}</th>
                <th className="text-end">{t('admin.labelsIssued', 'Issued')}</th>
                <th className="text-end"><Dot color="grey" />{t('admin.labelsUnclaimed', 'Unclaimed')}</th>
                <th className="text-end"><Dot color="yellow" />{t('admin.labelsPending', 'Pending')}</th>
                <th className="text-end"><Dot color="green" />{t('admin.labelsConfirmed', 'Confirmed')}</th>
                <th className="text-end"><Dot color="red" />{t('admin.labelsOverdue', 'Overdue')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {issuers.map((iss) => (
                <tr key={iss.userId} className={iss.overdue > 0 ? 'table-danger' : ''}>
                  <td>
                    <div className="fw-semibold">{iss.displayName || '—'}</div>
                    <div className="small text-muted">{iss.email}</div>
                  </td>
                  <td>
                    {iss.verifiedOrigin ? (
                      <span className="badge bg-success">
                        {t('admin.labelsVerifiedYes', 'Verified')}{iss.originKind ? ` · ${iss.originKind}` : ''}
                      </span>
                    ) : (
                      <span className="badge bg-secondary">{t('admin.labelsVerifiedNo', 'No')}</span>
                    )}
                  </td>
                  <td className="text-end">{iss.issued}</td>
                  <td className="text-end">{iss.unclaimed}</td>
                  <td className="text-end">{iss.pendingConfirm}</td>
                  <td className="text-end">{iss.confirmed}</td>
                  <td className="text-end fw-semibold">{iss.overdue || ''}</td>
                  <td className="text-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-dark"
                      onClick={() => setOpenIssuer(openIssuer === iss.userId ? null : iss.userId)}
                    >
                      {openIssuer === iss.userId ? t('common.close', 'Close') : t('admin.labelsView', 'View')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openIssuer && (
        <div className="card border-0 shadow-sm mt-3">
          <div className="card-body">
            <h3 className="h6 mb-3">{t('admin.labelsDetail', 'Issued labels')}</h3>
            {rowsLoading ? (
              <p>{t('common.loading')}</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th />
                      <th>{t('admin.labelsShortId', 'Label')}</th>
                      <th>{t('admin.labelsSpecies', 'Species')}</th>
                      <th>{t('admin.labelsStatus', 'Status')}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.passportId}>
                        <td><Dot color={r.color} title={r.status} /></td>
                        <td><code>{r.shortId}</code></td>
                        <td className="fst-italic">{r.scientificName || '—'}</td>
                        <td className="small">{r.status}</td>
                        <td className="text-end">
                          <a
                            className="btn btn-sm btn-outline-secondary"
                            href={r.publicUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {t('admin.labelsPrint', 'Open / print')}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
