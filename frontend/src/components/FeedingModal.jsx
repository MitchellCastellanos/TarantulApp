import { useState } from 'react'
import logsService from '../services/logsService'

const PREY_TYPES = ['Grillo', 'Dubia', 'Superworm', 'Lombriz', 'Pinkies', 'Otro']
const PREY_SIZES = ['extra-small', 'small', 'medium', 'large']

export default function FeedingModal({ tarantulaId, onClose, onSaved }) {
  const [form, setForm] = useState({
    fedAt: new Date().toISOString().slice(0, 16),
    preyType: '', preySize: '', quantity: 1, accepted: true, notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await logsService.addFeeding(tarantulaId, {
        ...form,
        fedAt: new Date(form.fedAt).toISOString(),
        quantity: Number(form.quantity),
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
            <h5 className="modal-title">🍽️ Registrar alimentación</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && <div className="alert alert-danger small py-2">{error}</div>}

              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-semibold">Fecha y hora</label>
                  <input type="datetime-local" className="form-control form-control-sm"
                         value={form.fedAt} onChange={e => set('fedAt', e.target.value)} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Tipo de presa</label>
                  <select className="form-select form-select-sm"
                          value={form.preyType} onChange={e => set('preyType', e.target.value)}>
                    <option value="">– Selecciona –</option>
                    {PREY_TYPES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Tamaño</label>
                  <select className="form-select form-select-sm"
                          value={form.preySize} onChange={e => set('preySize', e.target.value)}>
                    <option value="">– Selecciona –</option>
                    {PREY_SIZES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Cantidad</label>
                  <input type="number" min="1" className="form-control form-control-sm"
                         value={form.quantity} onChange={e => set('quantity', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">¿Aceptó?</label>
                  <select className="form-select form-select-sm"
                          value={form.accepted} onChange={e => set('accepted', e.target.value === 'true')}>
                    <option value="true">Sí</option>
                    <option value="false">No (rechazó)</option>
                  </select>
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
