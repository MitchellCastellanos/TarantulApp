import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ChitinCardFrame from '../components/ChitinCardFrame'
import reminderService from '../services/reminderService'
import tarantulaService from '../services/tarantulaService'
import { useAuth } from '../context/AuthContext'
import { formatDateTimeInUserZone } from '../utils/dateFormat'
import { datetimeLocalToOffsetISO } from '../utils/datetimeSubmit'
import ProTrialCtaLink from '../components/ProTrialCtaLink'
import TaSegmentedControl from '../components/TaSegmentedControl'
import {
  readDismissedAutoKeys,
  dismissAutomaticReminder,
  dismissedAutoReminderKey,
} from '../utils/dismissedAutoReminders'

const TYPE_OPTS = [
  { value: 'feeding',  icon: '🍽️', labelKey: 'reminders.typeFeeding' },
  { value: 'cleaning', icon: '🧹', labelKey: 'reminders.typeCleaning' },
  { value: 'checkup',  icon: '🔍', labelKey: 'reminders.typeCheckup' },
  { value: 'custom',   icon: '📌', labelKey: 'reminders.typeCustom' },
]
const TYPE_ICONS = { feeding: '🍽️', feeding_auto: '🤖', cleaning: '🧹', checkup: '🔍', custom: '📌' }
const REMINDER_FORM_TYPES = new Set(TYPE_OPTS.map((o) => o.value))

function normalizeTypeParam(raw) {
  const v = String(raw || '').trim().toLowerCase()
  return REMINDER_FORM_TYPES.has(v) ? v : 'feeding'
}

function isOverdue(iso) {
  return new Date(iso) < new Date()
}

export default function RemindersPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [reminders, setReminders] = useState([])
  const [form, setForm] = useState({ type: 'feeding', dueDate: '', message: '', tarantulaId: '' })
  const [showForm, setShowForm] = useState(false)
  const [prefillTip, setPrefillTip] = useState(null) // { message: string, variant: 'info'|'warning' }
  const [saving, setSaving] = useState(false)
  /** @type {'all' | 'upcoming' | 'completed'} */
  const [listTab, setListTab] = useState('upcoming')
  const [tarantulas, setTarantulas] = useState([])
  const [dismissedAuto, setDismissedAuto] = useState(() => readDismissedAutoKeys())
  const hasProFeatures = user?.hasProFeatures === true
  const overFreeLimit = user?.overFreeLimit === true
  const lockedIds = useMemo(
    () => new Set(tarantulas.filter(t => t.locked).map(t => t.id)),
    [tarantulas],
  )
  const isReminderLocked = (r) => Boolean(r.tarantulaId && lockedIds.has(r.tarantulaId))

  const load = () => reminderService.getAll().then(setReminders)
  useEffect(() => {
    load()
    tarantulaService.getAll().then(setTarantulas).catch(() => {})
  }, [])

  const qTarantulaId = searchParams.get('tarantulaId')
  const qOpen = searchParams.get('open') === '1' || searchParams.get('new') === '1'
  const qType = searchParams.get('type')

  useEffect(() => {
    if (!qTarantulaId && !qOpen) return
    const typeNext = normalizeTypeParam(qType)
    if (qTarantulaId && tarantulas.length === 0) return

    if (qTarantulaId) {
      const ta = tarantulas.find((x) => String(x.id) === String(qTarantulaId))
      if (!ta) {
        setPrefillTip({ message: t('reminders.prefillNotFound'), variant: 'warning' })
        if (qOpen) setShowForm(true)
      } else if (ta.locked) {
        setForm((f) => ({ ...f, type: typeNext, tarantulaId: '', message: '' }))
        setPrefillTip({ message: t('reminders.prefillLocked', { name: ta.name }), variant: 'warning' })
        if (qOpen) setShowForm(true)
      } else {
        setForm((f) => ({
          ...f,
          tarantulaId: String(ta.id),
          type: typeNext,
          message: '',
        }))
        setPrefillTip({ message: t('reminders.prefillReady', { name: ta.name }), variant: 'info' })
        if (qOpen) setShowForm(true)
      }
    } else if (qOpen) {
      setForm((f) => ({ ...f, type: typeNext }))
      setShowForm(true)
    }

    navigate('/reminders', { replace: true })
  }, [qTarantulaId, qOpen, qType, tarantulas, navigate, t])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await reminderService.create({
        ...form,
        dueDate: datetimeLocalToOffsetISO(form.dueDate),
      })
      setForm({ type: 'feeding', dueDate: '', message: '', tarantulaId: '' })
      setShowForm(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleDoneReminder = async (r) => {
    if (r.source === 'automatic') {
      dismissAutomaticReminder(r)
      setDismissedAuto(readDismissedAutoKeys())
      return
    }
    if (!r.id) return
    await reminderService.markDone(r.id)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm(t('reminders.deleteConfirm'))) return
    await reminderService.delete(id)
    load()
  }

  const remindersActive = useMemo(
    () =>
      reminders.filter((r) => {
        const k = dismissedAutoReminderKey(r)
        return !k || !dismissedAuto.has(k)
      }),
    [reminders, dismissedAuto],
  )

  const listTabOptions = useMemo(
    () => [
      { id: 'all', label: t('reminders.tabAll') },
      { id: 'upcoming', label: t('reminders.tabUpcoming') },
      { id: 'completed', label: t('reminders.tabCompleted') },
    ],
    [t],
  )

  const visible = useMemo(() => {
    if (listTab === 'upcoming') return remindersActive.filter((r) => !r.isDone)
    if (listTab === 'completed') return remindersActive.filter((r) => r.isDone)
    return remindersActive
  }, [remindersActive, listTab])

  const emptyMessageKey =
    listTab === 'completed' ? 'reminders.emptyCompleted' : listTab === 'upcoming' ? 'reminders.emptyUpcoming' : 'reminders.emptyAll'

  return (
    <div>
      <Navbar />
      <div className="container mt-4" style={{ maxWidth: 640 }}>
        <ChitinCardFrame showSilhouettes={false}>
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <div className="min-w-0">
            <h4 className="fw-bold mb-0 text-break">🔔 {t('reminders.pageTitle')}</h4>
            <p className="text-muted small mb-0 text-break">
              {t('reminders.pendingCount', { count: remindersActive.filter(r => !r.isDone).length })}
            </p>
          </div>
          <button type="button" className="btn btn-dark btn-sm flex-shrink-0" onClick={() => setShowForm(v => !v)}>
            {showForm ? t('common.cancel') : t('reminders.new')}
          </button>
        </div>

        {overFreeLimit && (
          <div className="alert alert-warning small py-2 mb-3">
            {t('readOnly.overLimitBanner')}{' '}
            <Link to="/pro" className="alert-link">{t('pro.learnMore')}</Link>
          </div>
        )}

        <div className={`alert small py-2 ${hasProFeatures ? 'alert-dark' : 'alert-secondary'}`}>
          {hasProFeatures ? t('reminders.proNotice') : t('reminders.freeNotice')}
        </div>

        {prefillTip && (
          <div
            className={`alert small py-2 mb-3 d-flex justify-content-between align-items-start gap-2 ${
              prefillTip.variant === 'warning' ? 'alert-warning' : 'alert-info'
            }`}
          >
            <span className="mb-0">{prefillTip.message}</span>
            <button
              type="button"
              className="btn-close btn-close-sm mt-0"
              aria-label={t('common.dismissAlert')}
              onClick={() => setPrefillTip(null)}
            />
          </div>
        )}

        {!hasProFeatures && (
          <div className="d-flex flex-column flex-sm-row gap-2 align-items-sm-center justify-content-between mb-3 p-2 rounded"
               style={{ background: 'rgba(200, 160, 60, 0.08)', border: '1px solid rgba(200, 160, 60, 0.22)' }}>
            <p className="small text-muted mb-0">{t('reminders.freeAutoUpsell')}</p>
            <ProTrialCtaLink className="btn btn-sm flex-shrink-0 align-self-stretch align-self-sm-auto" />
          </div>
        )}

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
                      {tarantulas.map(ta => (
                        <option key={ta.id} value={ta.id} disabled={ta.locked}>
                          {ta.name} · {ta.species?.scientificName || t('common.unknown')}
                          {ta.locked ? ` (${t('tarantula.lockedShort')})` : ''}
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

        <TaSegmentedControl
          className="mb-3"
          ariaLabel={t('reminders.listTabsAria')}
          value={listTab}
          onChange={setListTab}
          options={listTabOptions}
        />

        {/* List */}
        {visible.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <div className="fs-1 mb-2">🔔</div>
            <p>{t(emptyMessageKey)}</p>
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
                  <div className="card-body py-2 px-3 d-flex align-items-start gap-3" style={{ minWidth: 0 }}>
                    <span className="flex-shrink-0 pt-1" style={{ fontSize: '1.4rem' }}>{TYPE_ICONS[r.type] ?? '📌'}</span>
                    <div className="flex-grow-1 min-w-0" style={{ minWidth: 0 }}>
                      <div className={`d-flex flex-wrap align-items-start gap-1 column-gap-2 ${r.isDone ? 'text-decoration-line-through text-muted' : ''}`}>
                        <div
                          className="fw-semibold small flex-grow-1"
                          style={{
                            minWidth: 0,
                            overflowWrap: 'anywhere',
                            wordBreak: 'break-word',
                            lineHeight: 1.35,
                            ...(r.isDone ? {} : { color: 'var(--ta-gold-light)' }),
                          }}
                        >
                          {r.message || r.type}
                        </div>
                        {isAutomatic && (
                          <span className="badge bg-dark flex-shrink-0 align-self-start" style={{ fontSize: '0.6rem' }}>PRO</span>
                        )}
                      </div>
                      <div className={`small ${overdue ? 'text-danger fw-semibold' : 'text-muted'}`}>
                        {overdue && '⚠️ '}
                        {formatDateTimeInUserZone(r.dueDate, i18n.language)}
                        {r.isDone && ` · ${t('reminders.done')}`}
                      </div>
                      {r.tarantulaName && (
                        <div className="small text-muted">
                          {t('reminders.forTarantula', { name: r.tarantulaName })}
                        </div>
                      )}
                    </div>
                    <div className="d-flex gap-1 flex-shrink-0">
                      {!r.isDone && (isAutomatic || (r.id && !isReminderLocked(r))) && (
                        <button className="btn btn-sm btn-outline-success"
                                style={{ padding: '2px 8px' }}
                                onClick={() => handleDoneReminder(r)} title={t('reminders.markDone')}>✓</button>
                      )}
                      {!isAutomatic && !isReminderLocked(r) && (
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
        </ChitinCardFrame>
      </div>
    </div>
  )
}
