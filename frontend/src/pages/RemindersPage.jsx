import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import reminderService from '../services/reminderService'
import tarantulaService from '../services/tarantulaService'
import { useAuth } from '../context/AuthContext'

const TYPE_OPTS = [
  { value: 'feeding',  icon: '🍽️', labelKey: 'reminders.typeFeeding' },
  { value: 'cleaning', icon: '🧹', labelKey: 'reminders.typeCleaning' },
  { value: 'checkup',  icon: '🔍', labelKey: 'reminders.typeCheckup' },
  { value: 'custom',   icon: '📌', labelKey: 'reminders.typeCustom' },
]
const TYPE_ICONS = { feeding: '🍽️', feeding_auto: '🤖', cleaning: '🧹', checkup: '🔍', custom: '📌' }

function formatDate(iso, locale) {
  return new Date(iso).toLocaleDateString(locale || undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isOverdue(iso) {
  return new Date(iso) < new Date()
}

export default function RemindersPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [reminders, setReminders] = useState([])
  const [form, setForm] = useState({ type: 'feeding', dueDate: '', message: '', tarantulaId: '' })
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [tarantulas, setTarantulas] = useState([])
  const isPro = (user?.plan || 'FREE') === 'PRO'

  const load = () => reminderService.getAll().then(setReminders)
  useEffect(() => {
    load()
    tarantulaService.getAll().then(setTarantulas).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await reminderService.create({
        ...form,
        dueDate: new Date(form.dueDate).toISOString(),
      })
      setForm({ type: 'feeding', dueDate: '', message: '', tarantulaId: '' })
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
            <h4 className="fw-bold mb-0">🔔 {t('reminders.pageTitle')}</h4>
            <p className="text-muted small mb-0">
              {t('reminders.pendingCount', { count: reminders.filter(r => !r.isDone).length })}
            </p>
          </div>
          <button className="btn btn-dark btn-sm" onClick={() => setShowForm(v => !v)}>
            {showForm ? t('common.cancel') : t('reminders.new')}
          </button>
        </div>

        <div className={`alert small py-2 ${isPro ? 'alert-dark' : 'alert-secondary'}`}>
          {isPro ? t('reminders.proNotice') : t('reminders.freeNotice')}
        </div>

        {/* Form */}
        {showForm && (
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <form onSubmit={handleCreate}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">{t('reminders.type')}</label>
                    <select className="form-select form-select-sm"
                            value={form.type} onChange={e => set('type', e.target.value)}>
                      {TYPE_OPTS.map(o => (
                        <option key={o.value} value={o.value}>
                          {o.icon} {t(o.labelKey)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">{t('reminders.dateTime')}</label>
                    <input type="datetime-local" className="form-control form-control-sm" required
                           value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold">{t('reminders.tarantula')}</label>
                    <select
                      className="form-select form-select-sm"
                      required
                      value={form.tarantulaId}
                      onChange={e => set('tarantulaId', e.target.value)}
                    >
                      <option value="">{t('reminders.selectTarantula')}</option>
                      {tarantulas.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} · {t.species?.scientificName || t('common.unknown')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold">{t('reminders.message')}</label>
                    <input type="text" className="form-control form-control-sm"
                           placeholder={t('reminders.messagePlaceholder')}
                           value={form.message} onChange={e => set('message', e.target.value)} />
                  </div>
                  <div className="col-12 text-end">
                    <button type="submit" className="btn btn-dark btn-sm" disabled={saving}>
                      {saving ? t('common.saving') : t('reminders.create')}
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
            <label className="form-check-label small" htmlFor="showDone">
              {t('reminders.showDone')}
            </label>
          </div>
        </div>

        {/* List */}
        {visible.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <div className="fs-1 mb-2">🔔</div>
            <p>{showDone ? t('reminders.emptyAll') : t('reminders.emptyPending')}</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {visible.map(r => {
              const overdue = !r.isDone && isOverdue(r.dueDate)
              const isAutomatic = r.source === 'automatic'
              return (
                <div key={r.id || `${r.type}-${r.tarantulaId}-${r.dueDate}`}
                     className="card border-0 shadow-sm"
                     style={{ opacity: r.isDone ? 0.6 : 1 }}>
                  <div className="card-body py-2 px-3 d-flex align-items-center gap-3">
                    <span style={{ fontSize: '1.4rem' }}>{TYPE_ICONS[r.type] ?? '📌'}</span>
                    <div className="flex-grow-1">
                      <div className={`fw-semibold small ${r.isDone ? 'text-decoration-line-through text-muted' : ''}`}>
                        {r.message || r.type}
                        {isAutomatic && (
                          <span className="badge bg-dark ms-2" style={{ fontSize: '0.6rem' }}>PRO</span>
                        )}
                      </div>
                      <div className={`small ${overdue ? 'text-danger fw-semibold' : 'text-muted'}`}>
                        {overdue && '⚠️ '}
                        {formatDate(r.dueDate, i18n.language)}
                        {r.isDone && ` · ${t('reminders.done')}`}
                      </div>
                      {r.tarantulaName && (
                        <div className="small text-muted">
                          Para {r.tarantulaName}
                        </div>
                      )}
                    </div>
                    <div className="d-flex gap-1">
                      {!r.isDone && !isAutomatic && (
                        <button className="btn btn-sm btn-outline-success"
                                style={{ padding: '2px 8px' }}
                                onClick={() => handleDone(r.id)} title={t('reminders.markDone')}>✓</button>
                      )}
                      {!isAutomatic && (
                        <button className="btn btn-sm btn-outline-danger"
                                style={{ padding: '2px 8px' }}
                                onClick={() => handleDelete(r.id)} title={t('common.delete')}>✕</button>
                      )}
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
