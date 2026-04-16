import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import reminderService from '../services/reminderService'
import { useAuth } from '../context/AuthContext'

const TYPE_ICONS = {
  feeding: '🍽️',
  feeding_auto: '🤖',
  cleaning: '🧹',
  checkup: '🔍',
  custom: '📌',
}

function formatDue(iso, t) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = d - now
  const diffDays = Math.ceil(diffMs / 86400000)
  if (diffDays < 0) return { label: t('reminders.overdueDays', { count: Math.abs(diffDays) }), urgent: true }
  if (diffDays === 0) return { label: t('reminders.today'), urgent: true }
  if (diffDays === 1) return { label: t('reminders.tomorrow'), urgent: true }
  return { label: t('reminders.inDays', { count: diffDays }), urgent: false }
}

export default function RemindersPanel() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [reminders, setReminders] = useState([])
  const isPro = (user?.plan || 'FREE') === 'PRO'

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
          <h6 className="fw-bold mb-0">🔔 {t('reminders.panelTitle')}</h6>
          <Link to="/reminders" className="btn btn-link btn-sm p-0 text-muted small">
            {t('reminders.viewAll')}
          </Link>
        </div>
        {isPro && (
          <div className="small text-muted mb-2">
            {t('reminders.panelProNotice')}
          </div>
        )}
        <div className="d-flex flex-column gap-2">
          {reminders.map(r => {
            const { label, urgent } = formatDue(r.dueDate, t)
            const isAutomatic = r.source === 'automatic'
            return (
              <div key={r.id || `${r.type}-${r.tarantulaId}-${r.dueDate}`}
                   className="d-flex align-items-center gap-2 p-2 rounded"
                   style={{ background: urgent ? '#fff8e6' : '#f8f9fa' }}>
                <span style={{ fontSize: '1.1rem' }}>{TYPE_ICONS[r.type] ?? '📌'}</span>
                <div className="flex-grow-1 min-w-0">
                  <div className="small fw-semibold text-truncate">
                    {r.message || r.type}
                    {isAutomatic && (
                      <span className="badge bg-dark ms-2" style={{ fontSize: '0.6rem' }}>PRO</span>
                    )}
                  </div>
                  <div className={`small ${urgent ? 'text-danger fw-semibold' : 'text-muted'}`}>
                    {label}
                    {r.tarantulaName && ` · ${r.tarantulaName}`}
                  </div>
                </div>
                {!isAutomatic && (
                  <button className="btn btn-sm btn-outline-success"
                          style={{ padding: '1px 8px', fontSize: '0.75rem' }}
                          onClick={() => handleDone(r.id)} title="Marcar como hecho">
                    ✓
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
