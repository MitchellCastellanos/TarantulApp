import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import FangPanel from '../components/FangPanel'
import studioService from '../services/studioService'

const STATUS_BADGE = {
  ON_SHELF: 'text-bg-info',
  CLAIMABLE: 'text-bg-warning',
  CLAIMED: 'text-bg-success',
  VOID: 'text-bg-dark',
}

export function PassportClaimStatusBadge({ status }) {
  const { t } = useTranslation()
  const s = status || 'CLAIMABLE'
  return (
    <span className={`badge ${STATUS_BADGE[s] || 'text-bg-secondary'}`}>
      {t(`studio.claimStatus.${s}`, s)}
    </span>
  )
}

/** Release / hold / rotate-code / void controls for one unclaimed issuer label. */
export function PassportClaimControls({ passport, size = 'sm' }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['studio'] })
  }
  const release = useMutation({ mutationFn: () => studioService.releasePassport(passport.id), onSuccess: invalidate })
  const hold = useMutation({ mutationFn: () => studioService.holdPassport(passport.id), onSuccess: invalidate })
  const rotate = useMutation({ mutationFn: () => studioService.rotateClaimCode(passport.id), onSuccess: invalidate })
  const voidLabel = useMutation({ mutationFn: () => studioService.voidPassport(passport.id), onSuccess: invalidate })

  if (passport.claimed || passport.claimStatus === 'VOID') return null

  const busy = release.isPending || hold.isPending || rotate.isPending || voidLabel.isPending
  const onShelf = passport.claimStatus === 'ON_SHELF'

  return (
    <div className="d-flex flex-wrap gap-1">
      {onShelf ? (
        <button type="button" className={`btn btn-${size} btn-outline-success`} disabled={busy} onClick={() => release.mutate()}>
          {t('studio.releaseCta')}
        </button>
      ) : (
        <button type="button" className={`btn btn-${size} btn-outline-secondary`} disabled={busy} onClick={() => hold.mutate()}>
          {t('studio.holdCta')}
        </button>
      )}
      {onShelf && (
        <button type="button" className={`btn btn-${size} btn-outline-secondary`} disabled={busy} onClick={() => rotate.mutate()}>
          {t('studio.rotateCodeCta')}
        </button>
      )}
      <button
        type="button"
        className={`btn btn-${size} btn-outline-danger`}
        disabled={busy}
        onClick={() => {
          if (window.confirm(t('studio.voidConfirm'))) voidLabel.mutate()
        }}
      >
        {t('studio.voidCta')}
      </button>
    </div>
  )
}

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
      <h2 className="h6 mb-1">{t('studio.allPassportsTitle')}</h2>
      <p className="small text-muted mb-3">{t('studio.claimControlHint')}</p>
      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>{t('studio.passportColShortId')}</th>
              <th>{t('studio.passportColSpecies')}</th>
              <th>{t('studio.passportColBatch')}</th>
              <th>{t('studio.passportColStatus')}</th>
              <th>{t('studio.claimCodeCol')}</th>
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
                  <PassportClaimStatusBadge status={p.claimed ? 'CLAIMED' : p.claimStatus} />
                </td>
                <td className="small">
                  {!p.claimed && p.claimStatus === 'ON_SHELF' && p.claimCode ? (
                    <code>{p.claimCode}</code>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  <div className="d-flex flex-wrap gap-1 align-items-center">
                    <a href={p.publicUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-dark">
                      {t('studio.openPassport')}
                    </a>
                    {!p.claimed && p.claimStatus !== 'VOID' && (
                      <Link
                        to={`/studio/labels?batch=${p.batchId || ''}&mode=bulk`}
                        className="btn btn-sm btn-outline-secondary"
                      >
                        {t('studio.printLabels')}
                      </Link>
                    )}
                    <PassportClaimControls passport={p} />
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
