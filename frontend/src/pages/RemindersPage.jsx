import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import reminderService from '../services/reminderService'

const TYPE_OPTS = [
  { value: 'feeding',  label: '🍽️ Alimentación' },
  { value: 'cleaning', label: '🧹 Limpieza' },
  { value: 'checkup',  label: '🔍 Revisión' },
  { value: 'custom',   label: '📌 Personalizado' },
]
const TYPE_ICONS = { feeding: '🍽️', cleaning: '🧹', checkup: '🔍', custom: '📌' }

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function isOverdue(iso) {
  return new Date(iso) < new Date()
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState([])
  const [form, setForm] = useState({ type: 'feeding', dueDate: '', message: '' })
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDone, setShowDone] = useState(false)

  const load = () => reminderService.getAll().then(setReminders)
  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await reminderService.create({
        ...form,
        dueDate: new Date(form.dueDate).toISOString(),
      })
      setForm({ type: 'feeding', dueDate: '', message: '' })
      setShowForm(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleDone = async (id) => {
    await reminderService.markDone(id)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este recordatorio?')) return
    await reminderService.delete(id)
    load()
  }

  const visible = reminders.filter(r => showDone ? true : !r.isDone)

  return (
    <div>
      <Navbar />
      <div className="container mt-4" style={{ maxWidth: 640 }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold mb-0">🔔 Recordatorios</h4>
            <p className="text-muted small mb-0">
              {reminders.filter(r => !r.isDone).length} pendiente(s)
            </p>
          </div>
          <button className="btn btn-dark btn-sm" onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Cancelar' : '+ Nuevo'}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <form onSubmit={handleCreate}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Tipo</label>
                    <select className="form-select form-select-sm"
                            value={form.type} onChange={e => set('type', e.target.value)}>
                      {TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Fecha y hora *</label>
                    <input type="datetime-local" className="form-control form-control-sm" required
                           value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold">Mensaje</label>
                    <input type="text" className="form-control form-control-sm"
                           placeholder="ej. Dar de comer a Mole"
                           value={form.message} onChange={e => set('message', e.target.value)} />
                  </div>
                  <div className="col-12 text-end">
                    <button type="submit" className="btn btn-dark btn-sm" disabled={saving}>
                      {saving ? 'Guardando...' : 'Crear recordatorio'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Toggle done */}
        <div className="d-flex justify-content-end mb-2">
          <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" id="showDone"
                   checked={showDone} onChange={e => setShowDone(e.target.checked)} />
            <label className="form-check-label small" htmlFor="showDone">Mostrar completados</label>
          </div>
        </div>

        {/* List */}
        {visible.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <div className="fs-1 mb-2">🔔</div>
            <p>{showDone ? 'No hay recordatorios.' : 'No hay recordatorios pendientes.'}</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {visible.map(r => {
              const overdue = !r.isDone && isOverdue(r.dueDate)
              return (
                <div key={r.id}
                     className="card border-0 shadow-sm"
                     style={{ opacity: r.isDone ? 0.6 : 1 }}>
                  <div className="card-body py-2 px-3 d-flex align-items-center gap-3">
                    <span style={{ fontSize: '1.4rem' }}>{TYPE_ICONS[r.type] ?? '📌'}</span>
                    <div className="flex-grow-1">
                      <div className={`fw-semibold small ${r.isDone ? 'text-decoration-line-through text-muted' : ''}`}>
                        {r.message || r.type}
                      </div>
                      <div className={`small ${overdue ? 'text-danger fw-semibold' : 'text-muted'}`}>
                        {overdue && '⚠️ '}
                        {formatDate(r.dueDate)}
                        {r.isDone && ' · ✅ Completado'}
                      </div>
                    </div>
                    <div className="d-flex gap-1">
                      {!r.isDone && (
                        <button className="btn btn-sm btn-outline-success"
                                style={{ padding: '2px 8px' }}
                                onClick={() => handleDone(r.id)} title="Marcar como hecho">✓</button>
                      )}
                      <button className="btn btn-sm btn-outline-danger"
                              style={{ padding: '2px 8px' }}
                              onClick={() => handleDelete(r.id)} title="Eliminar">✕</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
