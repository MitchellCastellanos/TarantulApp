import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import FangPanel from '../components/FangPanel'
import studioService from '../services/studioService'

export default function StudioBatchPage() {
  const { batchId } = useParams()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: batch, isLoading } = useQuery({
    queryKey: ['studio', 'batch', batchId],
    queryFn: () => studioService.getBatch(batchId),
    enabled: Boolean(batchId),
  })

  const { data: passports = [] } = useQuery({
    queryKey: ['studio', 'batch', batchId, 'passports'],
    queryFn: () => studioService.listPassports(batchId),
    enabled: Boolean(batchId),
  })

  const [passportCount, setPassportCount] = useState('10')
  const [stage, setStage] = useState('sling')
  const [sex, setSex] = useState('unsexed')
  const [labelNotes, setLabelNotes] = useState('')
  const [genResult, setGenResult] = useState(null)
  const [err, setErr] = useState('')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['studio', 'batch', batchId] })
    queryClient.invalidateQueries({ queryKey: ['studio', 'batches'] })
  }

  const adjustSold = useMutation({
    mutationFn: (delta) => studioService.adjustBatch(batchId, { deltaSold: delta, reason: 'MANUAL' }),
    onSuccess: invalidate,
  })

  const generate = useMutation({
    mutationFn: (body) => studioService.generatePassports(batchId, body),
    onSuccess: (data) => {
      setGenResult(data)
      setErr('')
      invalidate()
      queryClient.invalidateQueries({ queryKey: ['studio', 'batch', batchId, 'passports'] })
    },
    onError: () => setErr(t('studio.generateError')),
  })

  if (isLoading || !batch) {
    return (
      <div>
        <Navbar />
        <div className="container py-4"><p>{t('common.loading')}</p></div>
      </div>
    )
  }

  return (
    <div>
      <Navbar />
      <div className="container py-4" style={{ maxWidth: 720 }}>
        <Link to="/studio" className="btn btn-sm btn-outline-secondary mb-3">{t('studio.backToStudio')}</Link>

        <div className="mb-3">
          <h1 className="h4 mb-1">{batch.name}</h1>
          <p className="small text-muted mb-0">
            {batch.scientificName}
            {batch.commonName ? ` · ${batch.commonName}` : ''}
          </p>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <FangPanel><div className="small text-muted">{t('studio.qtyTotal')}</div><div className="fs-5 fw-bold">{batch.quantityTotal}</div></FangPanel>
          </div>
          <div className="col-6 col-md-3">
            <FangPanel><div className="small text-muted">{t('studio.qtySold')}</div><div className="fs-5 fw-bold">{batch.quantitySold}</div></FangPanel>
          </div>
          <div className="col-6 col-md-3">
            <FangPanel><div className="small text-muted">{t('studio.availableShort')}</div><div className="fs-5 fw-bold">{batch.quantityAvailable}</div></FangPanel>
          </div>
          <div className="col-6 col-md-3">
            <FangPanel><div className="small text-muted">{t('studio.passportsGenerated')}</div><div className="fs-5 fw-bold">{batch.passportsGenerated}</div></FangPanel>
          </div>
        </div>

        <FangPanel className="mb-3">
          <h2 className="h6 mb-2">{t('studio.adjustInventory')}</h2>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm btn-outline-dark" disabled={adjustSold.isPending} onClick={() => adjustSold.mutate(1)}>
              +1 {t('studio.sold')}
            </button>
            <button type="button" className="btn btn-sm btn-outline-dark" disabled={adjustSold.isPending} onClick={() => adjustSold.mutate(-1)}>
              −1 {t('studio.sold')}
            </button>
          </div>
          <p className="small text-muted mt-2 mb-0">{t('studio.adjustHint')}</p>
        </FangPanel>

        <FangPanel className="mb-3">
          <h2 className="h6 mb-3">{t('studio.generatePassportsTitle')}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              generate.mutate({
                count: Math.min(500, Math.max(1, Number(passportCount) || 1)),
                stage,
                sex,
                labelNotes: labelNotes.trim() || undefined,
                proGiftDays: 30,
              })
            }}
          >
            <div className="row g-2 mb-2">
              <div className="col-4">
                <label className="form-label small">{t('studio.passportCount')}</label>
                <input type="number" min="1" max="500" className="form-control form-control-sm" value={passportCount} onChange={(e) => setPassportCount(e.target.value)} />
              </div>
              <div className="col-4">
                <label className="form-label small">{t('form.stage')}</label>
                <select className="form-select form-select-sm" value={stage} onChange={(e) => setStage(e.target.value)}>
                  <option value="sling">{t('stages.sling')}</option>
                  <option value="juvenile">{t('stages.juvenile')}</option>
                  <option value="subadult">{t('stages.subadult')}</option>
                  <option value="adult">{t('stages.adult')}</option>
                </select>
              </div>
              <div className="col-4">
                <label className="form-label small">{t('form.sex')}</label>
                <select className="form-select form-select-sm" value={sex} onChange={(e) => setSex(e.target.value)}>
                  <option value="unsexed">{t('sex.unsexed')}</option>
                  <option value="female">{t('sex.female')}</option>
                  <option value="male">{t('sex.male')}</option>
                </select>
              </div>
            </div>
            <label className="form-label small">{t('studio.labelNotes')}</label>
            <input className="form-control form-control-sm mb-3" value={labelNotes} onChange={(e) => setLabelNotes(e.target.value)} />
            {err && <p className="small text-danger">{err}</p>}
            <button type="submit" className="btn btn-dark btn-sm" disabled={generate.isPending}>
              {generate.isPending ? t('common.loading') : t('studio.generatePassportsCta')}
            </button>
          </form>
          {genResult?.passports?.length > 0 && (
            <p className="small text-success mt-2 mb-0">
              {t('studio.generatedCount', { count: genResult.created })}
            </p>
          )}
        </FangPanel>

        <h2 className="h6 mb-2">{t('studio.passportsListTitle')}</h2>
        {passports.length === 0 ? (
          <FangPanel><p className="small text-muted mb-0">{t('studio.passportsEmpty')}</p></FangPanel>
        ) : (
          <FangPanel>
            <ul className="list-unstyled mb-0 small">
              {passports.map((p) => (
                <li key={p.id} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                  <a href={p.publicUrl} target="_blank" rel="noreferrer">{p.shortId}</a>
                  <span className={p.claimed ? 'text-success' : 'text-muted'}>
                    {p.claimed ? t('studio.passportClaimed') : t('studio.passportUnclaimed')}
                  </span>
                </li>
              ))}
            </ul>
            <Link to={`/tools/qr?batch=${batchId}`} className="btn btn-sm btn-outline-dark mt-3">
              {t('studio.printLabels')}
            </Link>
          </FangPanel>
        )}
      </div>
    </div>
  )
}
