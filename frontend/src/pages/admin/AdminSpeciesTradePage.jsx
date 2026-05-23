import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import adminService from '../../services/adminService'
import speciesService from '../../services/speciesService'
import { COUNTRY_OPTIONS } from '../../constants/locations'

const EMPTY_FORM = {
  speciesId: '',
  country: 'Mexico',
  citesAppendix: '',
  laceyStatus: '',
  notesMd: '',
}

export default function AdminSpeciesTradePage() {
  const { t } = useTranslation()
  const [notes, setNotes] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [speciesQuery, setSpeciesQuery] = useState('')
  const [speciesHits, setSpeciesHits] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const reload = useCallback(() => {
    setLoading(true)
    adminService
      .listSpeciesTradeNotes()
      .then((rows) => setNotes(Array.isArray(rows) ? rows : []))
      .catch(() => setError(t('admin.loadError')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    const q = speciesQuery.trim()
    if (q.length < 2) {
      setSpeciesHits([])
      return undefined
    }
    const id = window.setTimeout(() => {
      speciesService
        .getDiscoverCatalog(q)
        .then((rows) => setSpeciesHits(Array.isArray(rows) ? rows.slice(0, 8) : []))
        .catch(() => setSpeciesHits([]))
    }, 280)
    return () => window.clearTimeout(id)
  }, [speciesQuery])

  const save = async () => {
    const speciesId = Number(form.speciesId)
    if (!Number.isFinite(speciesId) || speciesId <= 0) {
      setError(t('admin.trade.pickSpecies'))
      return
    }
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await adminService.upsertSpeciesTradeNote({
        speciesId,
        country: form.country,
        citesAppendix: form.citesAppendix || null,
        laceyStatus: form.laceyStatus || null,
        notesMd: form.notesMd || null,
      })
      setSuccess(t('admin.trade.saved'))
      setForm(EMPTY_FORM)
      setSpeciesQuery('')
      reload()
    } catch (e) {
      setError(e?.response?.data?.message || t('admin.trade.saveError'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm(t('admin.trade.deleteConfirm'))) return
    setBusy(true)
    try {
      await adminService.deleteSpeciesTradeNote(id)
      reload()
    } catch {
      setError(t('admin.trade.deleteError'))
    } finally {
      setBusy(false)
    }
  }

  const editRow = (row) => {
    setForm({
      speciesId: String(row.speciesId),
      country: row.country || 'Mexico',
      citesAppendix: row.citesAppendix || '',
      laceyStatus: row.laceyStatus || '',
      notesMd: row.notesMd || '',
    })
    setSpeciesQuery(row.scientificName || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      <h2 className="h5 mb-1">{t('admin.trade.title')}</h2>
      <p className="small text-muted mb-3">{t('admin.trade.blurb')}</p>

      {error && <div className="alert alert-danger small py-2">{error}</div>}
      {success && <div className="alert alert-success small py-2">{success}</div>}

      <div className="card p-3 mb-4">
        <h3 className="h6 mb-3">{t('admin.trade.formTitle')}</h3>
        <div className="mb-3">
          <label className="form-label small">{t('admin.trade.speciesSearch')}</label>
          <input
            className="form-control form-control-sm"
            value={speciesQuery}
            onChange={(e) => setSpeciesQuery(e.target.value)}
            placeholder={t('admin.trade.speciesSearchPlaceholder')}
          />
          {speciesHits.length > 0 && (
            <ul className="list-group list-group-flush small mt-1 border rounded">
              {speciesHits.map((sp) => (
                <li key={sp.id} className="list-group-item py-1">
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-start"
                    onClick={() => {
                      setForm((f) => ({ ...f, speciesId: String(sp.id) }))
                      setSpeciesQuery(sp.scientificName)
                      setSpeciesHits([])
                    }}
                  >
                    <span className="fst-italic">{sp.scientificName}</span>
                    {sp.commonName ? ` — ${sp.commonName}` : ''}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {form.speciesId ? (
            <p className="small text-muted mt-1 mb-0">
              {t('admin.trade.selectedSpecies', { id: form.speciesId })}
            </p>
          ) : null}
        </div>
        <div className="row g-2 mb-3">
          <div className="col-md-4">
            <label className="form-label small">{t('admin.trade.country')}</label>
            <select
              className="form-select form-select-sm"
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label small">{t('admin.trade.cites')}</label>
            <input
              className="form-control form-control-sm"
              value={form.citesAppendix}
              onChange={(e) => setForm((f) => ({ ...f, citesAppendix: e.target.value }))}
              placeholder="II"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small">{t('admin.trade.lacey')}</label>
            <input
              className="form-control form-control-sm"
              value={form.laceyStatus}
              onChange={(e) => setForm((f) => ({ ...f, laceyStatus: e.target.value }))}
              placeholder={t('admin.trade.laceyPlaceholder')}
            />
          </div>
        </div>
        <div className="mb-3">
          <label className="form-label small">{t('admin.trade.notes')}</label>
          <textarea
            className="form-control form-control-sm"
            rows={4}
            value={form.notesMd}
            onChange={(e) => setForm((f) => ({ ...f, notesMd: e.target.value }))}
            placeholder={t('admin.trade.notesPlaceholder')}
          />
        </div>
        <button type="button" className="btn btn-sm btn-dark" disabled={busy} onClick={save}>
          {busy ? t('common.saving') : t('admin.trade.save')}
        </button>
      </div>

      <div className="card p-3">
        <h3 className="h6 mb-2">{t('admin.trade.listTitle')}</h3>
        {loading ? (
          <p className="small text-muted mb-0">{t('common.loading')}</p>
        ) : notes.length === 0 ? (
          <p className="small text-muted mb-0">{t('admin.trade.listEmpty')}</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('admin.trade.colSpecies')}</th>
                  <th>{t('admin.trade.colCountry')}</th>
                  <th>{t('admin.trade.cites')}</th>
                  <th>{t('admin.trade.lacey')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {notes.map((n) => (
                  <tr key={n.id}>
                    <td className="small fst-italic">{n.scientificName || n.speciesId}</td>
                    <td className="small">{n.country}</td>
                    <td className="small">{n.citesAppendix || '—'}</td>
                    <td className="small">{n.laceyStatus || '—'}</td>
                    <td className="text-end text-nowrap">
                      <button type="button" className="btn btn-sm btn-outline-secondary me-1" onClick={() => editRow(n)}>
                        {t('common.edit')}
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => remove(n.id)}>
                        {t('common.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
