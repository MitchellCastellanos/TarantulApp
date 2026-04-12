import { useState } from 'react'
import logsService from '../services/logsService'

export default function MoltModal({ tarantulaId, onClose, onSaved }) {
  const [form, setForm] = useState({
    moltedAt: new Date().toISOString().slice(0, 16),
    preSizeCm: '', postSizeCm: '', notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await logsService.addMolt(tarantulaId, {
        moltedAt: new Date(form.moltedAt).toISOString(),
        preSizeCm: form.preSizeCm ? Number(form.preSizeCm) : null,
        postSizeCm: form.postSizeCm ? Number(form.postSizeCm) : null,
        notes: form.notes,
      })
      onSaved()
    } catch {
      setError('No se pudo guardar el registro.')
      setLoading(false)
    }
  }

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">🕸️ Registrar muda</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && <div className="alert alert-danger small py-2">{error}</div>}
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-semibold">Fecha y hora</label>
                  <input type="datetime-local" className="form-control form-control-sm"
                         value={form.moltedAt} onChange={e => set('moltedAt', e.target.value)} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Tamaño pre-muda (cm)</label>
                  <input type="number" step="0.1" min="0" className="form-control form-control-sm"
                         value={form.preSizeCm} onChange={e => set('preSizeCm', e.target.value)}
                         placeholder="ej. 5.0" />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Tamaño post-muda (cm)</label>
                  <input type="number" step="0.1" min="0" className="form-control form-control-sm"
                         value={form.postSizeCm} onChange={e => set('postSizeCm', e.target.value)}
                         placeholder="ej. 6.0" />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Notas</label>
                  <input type="text" className="form-control form-control-sm"
                         value={form.notes} onChange={e => set('notes', e.target.value)}
                         placeholder="Opcional..." />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-light btn-sm" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-dark btn-sm" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
