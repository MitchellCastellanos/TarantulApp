import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import reminderService from '../services/reminderService'

const TYPE_ICONS = {
  feeding: '🍽️',
  cleaning: '🧹',
  checkup: '🔍',
  custom: '📌',
}

function formatDue(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = d - now
  const diffDays = Math.ceil(diffMs / 86400000)
  if (diffDays < 0) return { label: `Hace ${Math.abs(diffDays)} día(s)`, urgent: true }
  if (diffDays === 0) return { label: 'Hoy', urgent: true }
  if (diffDays === 1) return { label: 'Mañana', urgent: true }
  return { label: `En ${diffDays} días`, urgent: false }
}

export default function RemindersPanel() {
  const [reminders, setReminders] = useState([])

  const load = () =>
    reminderService.getPending().then(setReminders).catch(() => {})

  useEffect(() => { load() }, [])

  const handleDone = async (id) => {
    await reminderService.markDone(id)
    load()
  }

  if (reminders.length === 0) return null

  return (
    <div className="card border-0 shadow-sm mb-4 border-start border-4 border-warning">
      <div className="card-body py-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="fw-bold mb-0">🔔 Recordatorios próximos</h6>
          <Link to="/reminders" className="btn btn-link btn-sm p-0 text-muted small">Ver todos</Link>
        </div>
        <div className="d-flex flex-column gap-2">
          {reminders.map(r => {
            const { label, urgent } = formatDue(r.dueDate)
            return (
              <div key={r.id}
                   className="d-flex align-items-center gap-2 p-2 rounded"
                   style={{ background: urgent ? '#fff8e6' : '#f8f9fa' }}>
                <span style={{ fontSize: '1.1rem' }}>{TYPE_ICONS[r.type] ?? '📌'}</span>
                <div className="flex-grow-1 min-w-0">
                  <div className="small fw-semibold text-truncate">{r.message || r.type}</div>
                  <div className={`small ${urgent ? 'text-danger fw-semibold' : 'text-muted'}`}>{label}</div>
                </div>
                <button className="btn btn-sm btn-outline-success"
                        style={{ padding: '1px 8px', fontSize: '0.75rem' }}
                        onClick={() => handleDone(r.id)} title="Marcar como hecho">
                  ✓
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
