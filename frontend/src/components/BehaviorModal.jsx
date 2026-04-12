import { useState } from 'react'
import logsService from '../services/logsService'

const MOODS = [
  { value: 'calm',      label: '😌 Tranquila' },
  { value: 'active',    label: '🏃 Activa' },
  { value: 'hiding',    label: '🫣 Escondida' },
  { value: 'defensive', label: '😤 Defensiva' },
  { value: 'pre_molt',  label: '⚠️ Pre-muda' },
]

export default function BehaviorModal({ tarantulaId, onClose, onSaved }) {
  const [form, setForm] = useState({
    loggedAt: new Date().toISOString().slice(0, 16),
    mood: '', notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await logsService.addBehavior(tarantulaId, {
        loggedAt: new Date(form.loggedAt).toISOString(),
        mood: form.mood || null,
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
            <h5 className="modal-title">🔍 Registrar comportamiento</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && <div className="alert alert-danger small py-2">{error}</div>}
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-semibold">Fecha y hora</label>
                  <input type="datetime-local" className="form-control form-control-sm"
                         value={form.loggedAt} onChange={e => set('loggedAt', e.target.value)} required />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Estado / Humor</label>
                  <div className="d-flex flex-wrap gap-2 mt-1">
                    {MOODS.map(m => (
                      <button key={m.value} type="button"
                              className={`btn btn-sm ${form.mood === m.value ? 'btn-dark' : 'btn-outline-secondary'}`}
                              onClick={() => set('mood', form.mood === m.value ? '' : m.value)}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Notas</label>
                  <textarea className="form-control form-control-sm" rows={2}
                            value={form.notes} onChange={e => set('notes', e.target.value)}
                            placeholder="Describe lo que observaste..." />
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
