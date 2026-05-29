import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import FangPanel from '../components/FangPanel'
import studioService from '../services/studioService'
import speciesService from '../services/speciesService'
import { useCapabilities, capabilitiesKeys } from '../hooks/useCapabilities'

export default function StudioPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: capabilities, isLoading: capsLoading } = useCapabilities()

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['studio', 'batches'],
    queryFn: () => studioService.listBatches(),
    enabled: capabilities?.passportCreator === true,
  })

  const [speciesQuery, setSpeciesQuery] = useState('')
  const [speciesResults, setSpeciesResults] = useState([])
  const [selectedSpecies, setSelectedSpecies] = useState(null)
  const [batchName, setBatchName] = useState('')
  const [batchQty, setBatchQty] = useState('0')
  const [batchNotes, setBatchNotes] = useState('')
  const [formErr, setFormErr] = useState('')

  const createBatch = useMutation({
    mutationFn: (body) => studioService.createBatch(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'batches'] })
      queryClient.invalidateQueries({ queryKey: capabilitiesKeys.all })
      setBatchName('')
      setBatchQty('0')
      setBatchNotes('')
      setSelectedSpecies(null)
      setSpeciesQuery('')
    },
    onError: () => setFormErr(t('studio.createBatchError')),
  })

  const searchSpecies = async (q) => {
    setSpeciesQuery(q)
    if (!q || q.length < 2) {
      setSpeciesResults([])
      return
    }
    try {
      const rows = await speciesService.search(q)
      setSpeciesResults(Array.isArray(rows) ? rows.slice(0, 8) : [])
    } catch {
      setSpeciesResults([])
    }
  }

  if (capsLoading) {
    return (
      <div>
        <Navbar />
        <div className="container py-4"><p>{t('common.loading')}</p></div>
      </div>
    )
  }

  if (!capabilities?.passportCreator) {
    return (
      <div>
        <Navbar />
        <div className="container py-4" style={{ maxWidth: 560 }}>
          <FangPanel>
            <h1 className="h5">{t('studio.title')}</h1>
            <p className="small text-muted mb-0">{t('studio.notEnabled')}</p>
          </FangPanel>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Navbar />
      <div className="container py-4" style={{ maxWidth: 720 }}>
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div>
            <h1 className="h4 mb-1">{t('studio.title')}</h1>
            <p className="small text-muted mb-0">{t('studio.subtitle')}</p>
          </div>
          <div className="d-flex gap-2">
            <Link to="/tools/qr" className="btn btn-sm btn-outline-secondary">{t('studio.labelsLink')}</Link>
            <Link to="/marketplace/sell" className="btn btn-sm btn-outline-secondary">{t('studio.listingsLink')}</Link>
          </div>
        </div>

        <FangPanel className="mb-4">
          <h2 className="h6 mb-3">{t('studio.createBatchTitle')}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setFormErr('')
              if (!selectedSpecies?.id) {
                setFormErr(t('studio.speciesRequired'))
                return
              }
              if (!batchName.trim()) {
                setFormErr(t('studio.nameRequired'))
                return
              }
              createBatch.mutate({
                speciesId: selectedSpecies.id,
                name: batchName.trim(),
                quantityTotal: Number(batchQty) || 0,
                notes: batchNotes.trim() || undefined,
              })
            }}
          >
            <label className="form-label small">{t('studio.speciesSearch')}</label>
            <input
              className="form-control form-control-sm mb-2"
              value={speciesQuery}
              onChange={(e) => searchSpecies(e.target.value)}
              placeholder={t('form.searchSpecies')}
            />
            {selectedSpecies && (
              <p className="small text-success mb-2">
                {selectedSpecies.scientificName}
                {selectedSpecies.commonName ? ` · ${selectedSpecies.commonName}` : ''}
              </p>
            )}
            {speciesResults.length > 0 && !selectedSpecies && (
              <div className="list-group mb-2">
                {speciesResults.map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    className="list-group-item list-group-item-action small py-2"
                    onClick={() => {
                      setSelectedSpecies(sp)
                      setSpeciesResults([])
                      setSpeciesQuery(sp.scientificName || '')
                    }}
                  >
                    {sp.scientificName}
                    {sp.commonName ? ` · ${sp.commonName}` : ''}
                  </button>
                ))}
              </div>
            )}
            <label className="form-label small">{t('studio.batchName')}</label>
            <input className="form-control form-control-sm mb-2" value={batchName} onChange={(e) => setBatchName(e.target.value)} />
            <label className="form-label small">{t('studio.batchQty')}</label>
            <input type="number" min="0" className="form-control form-control-sm mb-2" value={batchQty} onChange={(e) => setBatchQty(e.target.value)} />
            <label className="form-label small">{t('studio.batchNotes')}</label>
            <textarea className="form-control form-control-sm mb-3" rows={2} value={batchNotes} onChange={(e) => setBatchNotes(e.target.value)} />
            {formErr && <p className="small text-danger">{formErr}</p>}
            <button type="submit" className="btn btn-dark btn-sm" disabled={createBatch.isPending}>
              {createBatch.isPending ? t('common.loading') : t('studio.createBatchCta')}
            </button>
          </form>
        </FangPanel>

        <h2 className="h6 mb-2">{t('studio.batchesTitle')}</h2>
        {isLoading ? (
          <p>{t('common.loading')}</p>
        ) : batches.length === 0 ? (
          <FangPanel><p className="small text-muted mb-0">{t('studio.batchesEmpty')}</p></FangPanel>
        ) : (
          <div className="d-grid gap-2">
            {batches.map((b) => (
              <Link key={b.id} to={`/studio/batches/${b.id}`} className="text-decoration-none">
                <FangPanel className="mb-0">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <div className="fw-semibold">{b.name}</div>
                      <div className="small text-muted">
                        {b.scientificName || t('studio.unknownSpecies')}
                        {b.commonName ? ` · ${b.commonName}` : ''}
                      </div>
                    </div>
                    <div className="text-end small">
                      <div>{t('studio.qtyAvailable', { count: b.quantityAvailable })}</div>
                      <div className="text-muted">{t('studio.passportsCount', { count: b.passportsGenerated })}</div>
                    </div>
                  </div>
                </FangPanel>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
