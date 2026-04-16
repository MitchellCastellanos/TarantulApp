import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import tarantulaService from '../services/tarantulaService'
import speciesService from '../services/speciesService'
import PhotoCropModal from '../components/PhotoCropModal'

export default function AddTarantulaPage() {
  const { t } = useTranslation()
  const { id } = useParams()  // si hay id, es edición
  const navigate = useNavigate()
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
  const debounceRef = useRef(null)

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
      navigate(`/tarantulas/${tarantula.id}`)
    } catch (err) {
      setError(err.response?.data?.error ?? 'Algo salió mal.')
      setLoading(false)
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
    </div>
  )
}
