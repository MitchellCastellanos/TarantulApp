import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import adminService from '../../services/adminService'

const HABITATS = ['terrestrial', 'arboreal', 'fossorial']
const WORLDS = ['new_world', 'old_world']
const LEVELS = ['beginner', 'intermediate', 'advanced']
const GROWTH = ['slow', 'medium', 'fast']

const EMPTY = {
  scientificName: '',
  commonName: '',
  originRegion: '',
  habitatType: '',
  hobbyWorld: '',
  experienceLevel: '',
  growthRate: '',
  temperament: '',
  careNotes: '',
  referencePhotoUrl: '',
}

export default function AdminSpeciesPage() {
  const { t } = useTranslation()
  const [gaps, setGaps] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [gapReportId, setGapReportId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadGaps = () =>
    adminService
      .speciesGaps()
      .then((d) => setGaps(d?.open || []))
      .catch(() => {})

  useEffect(() => {
    loadGaps()
  }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const prefillFromGap = (gap) => {
    setForm({ ...EMPTY, scientificName: gap.normalizedName || gap.sampleRawName || '' })
    setGapReportId(gap.id)
    setSuccess('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const dismissGap = async (id) => {
    await adminService.dismissSpeciesGap(id).catch(() => {})
    await loadGaps()
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const payload = { ...form, gapReportId: gapReportId || undefined }
      const data = await adminService.createSpecies(payload)
      if (data?.error) {
        setError(t(`adminSpecies.error.${data.error}`, { defaultValue: t('adminSpecies.createError') }))
      } else {
        setSuccess(t('adminSpecies.createSuccess', { name: data.scientificName }))
        setForm(EMPTY)
        setGapReportId(null)
        await loadGaps()
      }
    } catch {
      setError(t('adminSpecies.createError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <h2 className="h5 mb-1">{t('adminSpecies.title')}</h2>
      <p className="small text-muted">{t('adminSpecies.subtitle')}</p>

      <div className="card p-3 mb-4">
        <h3 className="h6 mb-2">
          {t('adminSpecies.gapsTitle')}{' '}
          {gaps.length > 0 && <span className="badge text-bg-danger">{gaps.length}</span>}
        </h3>
        {gaps.length === 0 ? (
          <p className="small text-muted mb-0">{t('adminSpecies.gapsEmpty')}</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('adminSpecies.colName')}</th>
                  <th>{t('adminSpecies.colSource')}</th>
                  <th className="text-end">{t('adminSpecies.colSeen')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {gaps.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <span className="fst-italic">{g.normalizedName}</span>
                      {g.sampleRawName && g.sampleRawName !== g.normalizedName && (
                        <div className="small text-muted">“{g.sampleRawName}”</div>
                      )}
                    </td>
                    <td className="small text-muted">{g.source}</td>
                    <td className="text-end">{g.occurrences}</td>
                    <td className="text-end">
                      <button type="button" className="btn btn-sm btn-dark me-1" onClick={() => prefillFromGap(g)}>
                        {t('adminSpecies.addCta')}
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => dismissGap(g.id)}>
                        {t('adminSpecies.dismissCta')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-3">
        <h3 className="h6 mb-2">{t('adminSpecies.createTitle')}</h3>
        {error && <div className="alert alert-danger small py-2">{error}</div>}
        {success && <div className="alert alert-success small py-2">{success}</div>}
        <form onSubmit={submit}>
          <div className="row g-2">
            <div className="col-md-6">
              <label className="form-label small">{t('adminSpecies.scientificName')} *</label>
              <input className="form-control form-control-sm" required value={form.scientificName}
                     onChange={(e) => set('scientificName', e.target.value)} placeholder="Aphonopelma chalcodes" />
            </div>
            <div className="col-md-6">
              <label className="form-label small">{t('adminSpecies.commonName')}</label>
              <input className="form-control form-control-sm" value={form.commonName}
                     onChange={(e) => set('commonName', e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label small">{t('adminSpecies.originRegion')}</label>
              <input className="form-control form-control-sm" value={form.originRegion}
                     onChange={(e) => set('originRegion', e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label small">{t('adminSpecies.habitatType')}</label>
              <select className="form-select form-select-sm" value={form.habitatType}
                      onChange={(e) => set('habitatType', e.target.value)}>
                <option value="">—</option>
                {HABITATS.map((h) => <option key={h} value={h}>{t(`species.habitat.${h}`, h)}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small">{t('adminSpecies.hobbyWorld')}</label>
              <select className="form-select form-select-sm" value={form.hobbyWorld}
                      onChange={(e) => set('hobbyWorld', e.target.value)}>
                <option value="">—</option>
                {WORLDS.map((w) => <option key={w} value={w}>{t(`species.world.${w}`, w)}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small">{t('adminSpecies.experienceLevel')}</label>
              <select className="form-select form-select-sm" value={form.experienceLevel}
                      onChange={(e) => set('experienceLevel', e.target.value)}>
                <option value="">—</option>
                {LEVELS.map((l) => <option key={l} value={l}>{t(`species.level.${l}`, l)}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small">{t('adminSpecies.growthRate')}</label>
              <select className="form-select form-select-sm" value={form.growthRate}
                      onChange={(e) => set('growthRate', e.target.value)}>
                <option value="">—</option>
                {GROWTH.map((g) => <option key={g} value={g}>{t(`species.growth.${g}`, g)}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small">{t('adminSpecies.temperament')}</label>
              <input className="form-control form-control-sm" value={form.temperament}
                     onChange={(e) => set('temperament', e.target.value)} />
            </div>
            <div className="col-12">
              <label className="form-label small">{t('adminSpecies.careNotes')}</label>
              <textarea className="form-control form-control-sm" rows={3} value={form.careNotes}
                        onChange={(e) => set('careNotes', e.target.value)} />
            </div>
            <div className="col-12">
              <label className="form-label small">{t('adminSpecies.referencePhotoUrl')}</label>
              <input type="url" className="form-control form-control-sm" value={form.referencePhotoUrl}
                     onChange={(e) => set('referencePhotoUrl', e.target.value)} placeholder="https://" />
            </div>
          </div>
          <button type="submit" className="btn btn-dark btn-sm mt-3" disabled={busy || !form.scientificName.trim()}>
            {busy ? t('common.loading') : t('adminSpecies.createCta')}
          </button>
        </form>
      </div>
    </div>
  )
}
