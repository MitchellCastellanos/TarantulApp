import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import tarantulaService from '../services/tarantulaService'
import speciesService from '../services/speciesService'
import PhotoCropModal from '../components/PhotoCropModal'
import logsService from '../services/logsService'
import { useAuth } from '../context/AuthContext'

function nowLocalInput() {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

export default function AddTarantulaPage() {
  const { t } = useTranslation()
  const { id } = useParams()  // si hay id, es edición
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEdit = Boolean(id)

  const [form, setForm] = useState({
    name: '', speciesId: null, currentSizeCm: '', stage: '',
    sex: '', purchaseDate: '', notes: ''
  })
  const [speciesQuery, setSpeciesQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [gbifResults, setGbifResults] = useState([])
  const [gbifLoading, setGbifLoading] = useState(false)
  const [wscResults, setWscResults] = useState([])
  const [wscLoading, setWscLoading] = useState(false)
  const [selectedSpecies, setSelectedSpecies] = useState(null)
  const [showSugg, setShowSugg] = useState(false)
  const [photo, setPhoto] = useState(null)          // Blob final listo para subir
  const [cropSrc, setCropSrc] = useState(null)       // data URL abierta en el modal
  const [photoPreview, setPhotoPreview] = useState(null) // URL de objeto para preview
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [collectionCount, setCollectionCount] = useState(0)
  const [createdTarantula, setCreatedTarantula] = useState(null)
  const [postCreateMode, setPostCreateMode] = useState('')
  const [postCreateSaving, setPostCreateSaving] = useState(false)
  const [postCreateError, setPostCreateError] = useState('')
  const [feedingForm, setFeedingForm] = useState({
    fedAt: nowLocalInput(),
    preyType: 'Cricket',
    preySize: 'medium',
    quantity: 1,
    accepted: true,
    notes: '',
  })
  const [moltForm, setMoltForm] = useState({
    moltedAt: nowLocalInput(),
    preSizeCm: '',
    postSizeCm: '',
    notes: '',
  })
  const debounceRef = useRef(null)
  const plan = user?.plan || 'FREE'
  const isFreePlan = plan !== 'PRO'
  const tarantulaLimit = 6
  const atLimit = !isEdit && isFreePlan && collectionCount >= tarantulaLimit

  useEffect(() => {
    if (isEdit) {
      tarantulaService.getById(id).then(t => {
        setForm({
          name: t.name ?? '',
          speciesId: t.species?.id ?? null,
          currentSizeCm: t.currentSizeCm ?? '',
          stage: t.stage ?? '',
          sex: t.sex ?? '',
          purchaseDate: t.purchaseDate ?? '',
          notes: t.notes ?? '',
        })
        if (t.species) {
          setSelectedSpecies(t.species)
          setSpeciesQuery(t.species.scientificName)
        }
      })
    }
  }, [id, isEdit])

  useEffect(() => {
    if (isEdit) return
    tarantulaService.getAll().then(items => setCollectionCount(items.length)).catch(() => {})
  }, [isEdit])

  // Debounced species search (local + GBIF in parallel)
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (speciesQuery.length < 2) { setSuggestions([]); setGbifResults([]); return }
    debounceRef.current = setTimeout(() => {
      speciesService.search(speciesQuery).then(setSuggestions)
      setGbifLoading(true)
      speciesService.searchGbif(speciesQuery)
        .then(setGbifResults)
        .catch(() => setGbifResults([]))
        .finally(() => setGbifLoading(false))
      setWscLoading(true)
      speciesService.searchWsc(speciesQuery)
        .then(setWscResults)
        .catch(() => setWscResults([]))
        .finally(() => setWscLoading(false))
      setShowSugg(true)
    }, 300)
  }, [speciesQuery])

  const selectSpecies = (sp) => {
    setSelectedSpecies(sp)
    setForm(f => ({ ...f, speciesId: sp.id }))
    setSpeciesQuery(sp.scientificName)
    setShowSugg(false)
  }

  const clearSpecies = () => {
    setSelectedSpecies(null)
    setForm(f => ({ ...f, speciesId: null }))
    setSpeciesQuery('')
  }

  const selectGbif = async (gbifResult) => {
    setShowSugg(false)
    setGbifLoading(true)
    try {
      const imported = await speciesService.importFromGbif(gbifResult.key)
      selectSpecies(imported)
    } catch {
      setError(t('form.importError'))
    } finally {
      setGbifLoading(false)
    }
  }

  const selectWsc = async (wscResult) => {
    setShowSugg(false)
    setWscLoading(true)
    try {
      const imported = await speciesService.importFromWsc(wscResult.name, wscResult.family)
      selectSpecies(imported)
    } catch {
      setError(t('form.importErrorWsc'))
    } finally {
      setWscLoading(false)
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result)
    reader.readAsDataURL(file)
  }

  const handleCropConfirm = (blob) => {
    setPhoto(blob)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(URL.createObjectURL(blob))
    setCropSrc(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (atLimit) {
      setError(t('form.limitReached'))
      return
    }
    setLoading(true)
    try {
      const payload = {
        ...form,
        currentSizeCm: form.currentSizeCm ? Number(form.currentSizeCm) : null,
        purchaseDate: form.purchaseDate || null,
        speciesId: form.speciesId,
      }
      let tarantula
      if (isEdit) {
        tarantula = await tarantulaService.update(id, payload)
      } else {
        tarantula = await tarantulaService.create(payload)
      }
      if (photo) {
        await tarantulaService.uploadPhoto(tarantula.id, photo)
      }
      if (isEdit) {
        navigate(`/tarantulas/${tarantula.id}`)
        return
      }
      setCreatedTarantula(tarantula)
      setCollectionCount(count => count + 1)
      setPostCreateMode('choice')
      setLoading(false)
    } catch (err) {
      setError(err.response?.data?.error ?? 'Algo salió mal.')
      setLoading(false)
    }
  }

  const closePostCreate = () => {
    if (!createdTarantula) return
    navigate(`/tarantulas/${createdTarantula.id}`)
  }

  const saveInitialFeeding = async () => {
    if (!createdTarantula) return
    setPostCreateError('')
    setPostCreateSaving(true)
    try {
      await logsService.addFeeding(createdTarantula.id, {
        ...feedingForm,
        fedAt: new Date(feedingForm.fedAt).toISOString(),
        quantity: Number(feedingForm.quantity) || 1,
      })
      navigate(`/tarantulas/${createdTarantula.id}`)
    } catch (err) {
      setPostCreateError(err.response?.data?.error ?? t('form.postCreateSaveError'))
      setPostCreateSaving(false)
    }
  }

  const saveInitialMolt = async () => {
    if (!createdTarantula) return
    setPostCreateError('')
    setPostCreateSaving(true)
    try {
      await logsService.addMolt(createdTarantula.id, {
        moltedAt: new Date(moltForm.moltedAt).toISOString(),
        preSizeCm: moltForm.preSizeCm ? Number(moltForm.preSizeCm) : null,
        postSizeCm: moltForm.postSizeCm ? Number(moltForm.postSizeCm) : null,
        notes: moltForm.notes || null,
      })
      navigate(`/tarantulas/${createdTarantula.id}`)
    } catch (err) {
      setPostCreateError(err.response?.data?.error ?? t('form.postCreateSaveError'))
      setPostCreateSaving(false)
    }
  }

  return (
    <div>
      <Navbar />
      <div className="container mt-4" style={{ maxWidth: 640 }}>
        <div className="d-flex align-items-center gap-2 mb-4">
          <button className="btn btn-link p-0 text-dark text-decoration-none"
                  onClick={() => navigate(-1)}>{t('common.back')}</button>
          <h5 className="fw-bold mb-0">
            {isEdit ? t('tarantula.editTitle') : t('tarantula.newTitle')}
          </h5>
        </div>

        {error && <div className="alert alert-danger small py-2">{error}</div>}
        {!isEdit && isFreePlan && (
          <div className={`alert small py-2 ${atLimit ? 'alert-warning' : 'alert-secondary'}`}>
            {t('form.planUsage', { count: collectionCount, limit: tarantulaLimit })}
            {atLimit && ` ${t('form.limitReached')}`}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="card border-0 shadow-sm p-4 mb-3">
            <h6 className="fw-bold mb-3">{t('form.speciesSection')}</h6>

            {/* Autocomplete de especie */}
            <div className="mb-3 position-relative">
              <label className="form-label small fw-semibold">{t('form.searchSpecies')}</label>
              <div className="input-group">
                <input type="text" className="form-control" placeholder={t('form.searchPlaceholder')}
                       value={speciesQuery}
                       onChange={e => { setSpeciesQuery(e.target.value); setShowSugg(true) }}
                       onFocus={() => speciesQuery.length >= 2 && setShowSugg(true)}
                       autoComplete="off" />
                {selectedSpecies && (
                  <button type="button" className="btn btn-outline-secondary" onClick={clearSpecies}>✕</button>
                )}
              </div>

              {showSugg && (suggestions.length > 0 || gbifResults.length > 0 || wscResults.length > 0 || gbifLoading || wscLoading) && (
                <ul className="list-group position-absolute w-100 shadow-sm"
                    style={{ zIndex: 1000, top: '100%', maxHeight: 360, overflowY: 'auto' }}>
                  {/* Internal DB results */}
                  {suggestions.slice(0, 6).map(sp => (
                    <li key={sp.id}
                        className="list-group-item list-group-item-action"
                        style={{ cursor: 'pointer' }}
                        onMouseDown={() => selectSpecies(sp)}>
                      <span className="fw-semibold small">{sp.scientificName}</span>
                      {sp.commonName && <span className="text-muted small ms-2">· {sp.commonName}</span>}
                    </li>
                  ))}

                  {/* WSC section — primary taxonomic source */}
                  {(wscResults.length > 0 || wscLoading) && (
                    <>
                      <li className="list-group-item py-1 px-3"
                          style={{ background: '#f3e5ff', borderTop: '1px solid #d9b3ff', cursor: 'default' }}>
                        <span className="small fw-semibold" style={{ color: '#6a1b9a' }}>
                          {wscLoading ? t('form.wscLoading') : t('form.wscLabel')}
                        </span>
                      </li>
                      {wscResults.slice(0, 6).map(wr => (
                        <li key={wr.taxonId ?? wr.name}
                            className="list-group-item list-group-item-action"
                            style={{ cursor: 'pointer', background: '#fdf5ff' }}
                            onMouseDown={() => selectWsc(wr)}>
                          <span className="fw-semibold small">{wr.name}</span>
                          {wr.family && <span className="badge ms-2" style={{ background: '#6a1b9a', fontSize: '0.65rem' }}>{wr.family}</span>}
                          {wr.author && wr.year && <span className="text-muted small ms-2">· {wr.author}, {wr.year}</span>}
                        </li>
                      ))}
                    </>
                  )}

                  {/* GBIF section — distribution & synonyms */}
                  {(gbifResults.length > 0 || gbifLoading) && (
                    <>
                      <li className="list-group-item py-1 px-3"
                          style={{ background: '#e8f4fd', borderTop: '1px solid #bee5fb', cursor: 'default' }}>
                        <span className="small fw-semibold text-primary">
                          {gbifLoading ? t('form.gbifLoading') : t('form.gbifLabel')}
                        </span>
                      </li>
                      {gbifResults.slice(0, 6).map(gr => (
                        <li key={gr.key}
                            className="list-group-item list-group-item-action"
                            style={{ cursor: 'pointer', background: '#f0f8ff' }}
                            onMouseDown={() => selectGbif(gr)}>
                          <span className="fw-semibold small">{gr.canonicalName || gr.scientificName}</span>
                          {gr.vernacularName && <span className="text-muted small ms-2">· {gr.vernacularName}</span>}
                          {gr.family && <span className="badge bg-primary ms-2" style={{ fontSize: '0.65rem' }}>{gr.family}</span>}
                        </li>
                      ))}
                    </>
                  )}
                </ul>
              )}
            </div>

            {/* Ficha de especie seleccionada */}
            {selectedSpecies && (
              <div className="alert alert-dark small py-2 mb-0">
                <div className="fw-bold">{selectedSpecies.scientificName}</div>
                <div className="text-muted">
                  {selectedSpecies.habitatType} · Adulto: {selectedSpecies.adultSizeCmMin}–{selectedSpecies.adultSizeCmMax} cm · {selectedSpecies.experienceLevel}
                </div>
              </div>
            )}
          </div>

          <div className="card border-0 shadow-sm p-4 mb-3">
            <h6 className="fw-bold mb-3">{t('form.individualSection')}</h6>
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label small fw-semibold">{t('form.name')}</label>
                <input type="text" className="form-control" required
                       value={form.name} onChange={e => set('name', e.target.value)}
                       placeholder={t('form.namePlaceholder')} />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">{t('form.currentSize')}</label>
                <input type="number" step="0.1" min="0" className="form-control"
                       value={form.currentSizeCm} onChange={e => set('currentSizeCm', e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">{t('form.stage')}</label>
                <select className="form-select" value={form.stage} onChange={e => set('stage', e.target.value)}>
                  <option value="">–</option>
                  <option value="sling">{t('stages.sling')}</option>
                  <option value="juvenile">{t('stages.juvenile')}</option>
                  <option value="subadult">{t('stages.subadult')}</option>
                  <option value="adult">{t('stages.adult')}</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">{t('form.sex')}</label>
                <select className="form-select" value={form.sex} onChange={e => set('sex', e.target.value)}>
                  <option value="">–</option>
                  <option value="unsexed">{t('form.unsexed')}</option>
                  <option value="female">{t('form.female')}</option>
                  <option value="male">{t('form.male')}</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-semibold">{t('form.purchaseDate')}</label>
                <input type="date" className="form-control"
                       value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} />
              </div>
              <div className="col-12">
                <label className="form-label small fw-semibold">{t('form.profilePhoto')}</label>
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  {photoPreview && (
                    <img src={photoPreview} alt="preview"
                         style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8,
                                  border: '2px solid var(--ta-border)' }} />
                  )}
                  <div className="flex-grow-1">
                    <input type="file" accept="image/*" className="form-control"
                           onChange={handleFileSelect} />
                    <p className="text-muted small mb-0 mt-1">{t('form.photoCropHint')}</p>
                  </div>
                </div>
              </div>
              <div className="col-12">
                <label className="form-label small fw-semibold">{t('form.notes')}</label>
                <textarea className="form-control" rows={3}
                          value={form.notes} onChange={e => set('notes', e.target.value)}
                          placeholder={t('form.notesPlaceholder')} />
              </div>
            </div>
          </div>

          <div className="d-flex gap-2 justify-content-end mb-4">
            <button type="button" className="btn btn-light" onClick={() => navigate(-1)}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-dark" disabled={loading}>
              {loading ? t('common.saving') : isEdit ? t('form.saveBtn') : t('form.createBtn')}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de recorte — se abre cuando el usuario elige una imagen */}
      {cropSrc && (
        <PhotoCropModal
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}

      {createdTarantula && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('form.postCreateTitle', { name: createdTarantula.name })}</h5>
                <button type="button" className="btn-close" onClick={closePostCreate} disabled={postCreateSaving} />
              </div>
              <div className="modal-body">
                {postCreateError && <div className="alert alert-danger small py-2">{postCreateError}</div>}

                {postCreateMode === 'choice' && (
                  <>
                    <p className="small text-muted mb-3">{t('form.postCreateDesc')}</p>
                    <div className="d-grid gap-2">
                      <button type="button" className="btn btn-outline-primary" onClick={() => setPostCreateMode('feeding')}>
                        {t('form.addLastFeeding')}
                      </button>
                      <button type="button" className="btn btn-outline-purple" style={{ color: '#6f42c1', borderColor: '#6f42c1' }} onClick={() => setPostCreateMode('molt')}>
                        {t('form.addLastMolt')}
                      </button>
                      <button type="button" className="btn btn-outline-secondary" onClick={closePostCreate}>
                        {t('form.skipForNow')}
                      </button>
                    </div>
                    <p className="text-muted small mb-0 mt-3">{t('form.firstFeedingHint')}</p>
                  </>
                )}

                {postCreateMode === 'feeding' && (
                  <div className="small">
                    <div className="mb-2">
                      <label className="form-label fw-semibold small">{t('form.lastFeedingDate')}</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={feedingForm.fedAt}
                        onChange={e => setFeedingForm(f => ({ ...f, fedAt: e.target.value }))}
                      />
                    </div>
                    <div className="row g-2 mb-2">
                      <div className="col-6">
                        <label className="form-label fw-semibold small">{t('quickLog.prey')}</label>
                        <input
                          type="text"
                          className="form-control"
                          value={feedingForm.preyType}
                          onChange={e => setFeedingForm(f => ({ ...f, preyType: e.target.value }))}
                        />
                      </div>
                      <div className="col-3">
                        <label className="form-label fw-semibold small">{t('quickLog.size')}</label>
                        <select
                          className="form-select"
                          value={feedingForm.preySize}
                          onChange={e => setFeedingForm(f => ({ ...f, preySize: e.target.value }))}
                        >
                          <option value="small">S</option>
                          <option value="medium">M</option>
                          <option value="large">L</option>
                        </select>
                      </div>
                      <div className="col-3">
                        <label className="form-label fw-semibold small">{t('quickLog.qty')}</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          className="form-control"
                          value={feedingForm.quantity}
                          onChange={e => setFeedingForm(f => ({ ...f, quantity: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="form-check mb-2">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="initialAccepted"
                        checked={feedingForm.accepted}
                        onChange={e => setFeedingForm(f => ({ ...f, accepted: e.target.checked }))}
                      />
                      <label className="form-check-label small" htmlFor="initialAccepted">{t('quickLog.accepted')}</label>
                    </div>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder={t('quickLog.notes')}
                      value={feedingForm.notes}
                      onChange={e => setFeedingForm(f => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                )}

                {postCreateMode === 'molt' && (
                  <div className="small">
                    <div className="mb-2">
                      <label className="form-label fw-semibold small">{t('form.lastMoltDate')}</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={moltForm.moltedAt}
                        onChange={e => setMoltForm(m => ({ ...m, moltedAt: e.target.value }))}
                      />
                    </div>
                    <div className="row g-2 mb-2">
                      <div className="col-6">
                        <label className="form-label fw-semibold small">{t('quickLog.preMoltSize')}</label>
                        <input
                          type="number"
                          step="0.1"
                          className="form-control"
                          value={moltForm.preSizeCm}
                          onChange={e => setMoltForm(m => ({ ...m, preSizeCm: e.target.value }))}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label fw-semibold small">{t('quickLog.postMoltSize')}</label>
                        <input
                          type="number"
                          step="0.1"
                          className="form-control"
                          value={moltForm.postSizeCm}
                          onChange={e => setMoltForm(m => ({ ...m, postSizeCm: e.target.value }))}
                        />
                      </div>
                    </div>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder={t('quickLog.notes')}
                      value={moltForm.notes}
                      onChange={e => setMoltForm(m => ({ ...m, notes: e.target.value }))}
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                {postCreateMode !== 'choice' && (
                  <button type="button" className="btn btn-light btn-sm" onClick={() => setPostCreateMode('choice')} disabled={postCreateSaving}>
                    {t('common.back')}
                  </button>
                )}
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={closePostCreate} disabled={postCreateSaving}>
                  {t('form.skipForNow')}
                </button>
                {postCreateMode === 'feeding' && (
                  <button type="button" className="btn btn-dark btn-sm" onClick={saveInitialFeeding} disabled={postCreateSaving}>
                    {postCreateSaving ? t('common.saving') : t('form.saveAndContinue')}
                  </button>
                )}
                {postCreateMode === 'molt' && (
                  <button type="button" className="btn btn-dark btn-sm" onClick={saveInitialMolt} disabled={postCreateSaving}>
                    {postCreateSaving ? t('common.saving') : t('form.saveAndContinue')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
