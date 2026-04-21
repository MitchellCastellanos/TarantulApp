import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import reminderService from '../services/reminderService'
import tarantulaService from '../services/tarantulaService'
import { useAuth } from '../context/AuthContext'
import ChitinCardFrame from './ChitinCardFrame'
import {
  readDismissedAutoKeys,
  dismissAutomaticReminder,
  dismissedAutoReminderKey,
} from '../utils/dismissedAutoReminders'

const TYPE_ICONS = {
  feeding: '🍽️',
  feeding_auto: '🤖',
  cleaning: '🧹',
  checkup: '🔍',
  custom: '📌',
}

const DASHBOARD_REMINDER_LIMIT = 3

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
  const [tarantulas, setTarantulas] = useState([])
  const [dismissedAuto, setDismissedAuto] = useState(() => readDismissedAutoKeys())
  const hasProFeatures = user?.hasProFeatures === true
  const showFreeUpsell = Boolean(user) && !hasProFeatures
  const lockedIds = useMemo(
    () => new Set(tarantulas.filter(t => t.locked).map(t => t.id)),
    [tarantulas],
  )
  const isReminderLocked = (r) => Boolean(r.tarantulaId && lockedIds.has(r.tarantulaId))

  const load = () =>
    Promise.all([
      reminderService.getPending(),
      tarantulaService.getAll(),
    ]).then(([rems, ts]) => {
      setReminders(rems)
      setTarantulas(ts)
    }).catch(() => {})

  useEffect(() => { load() }, [])

  const activeReminders = useMemo(
    () =>
      reminders.filter((r) => {
        const k = dismissedAutoReminderKey(r)
        return !k || !dismissedAuto.has(k)
      }),
    [reminders, dismissedAuto],
  )

  const panelReminders = useMemo(
    () => activeReminders.slice(0, DASHBOARD_REMINDER_LIMIT),
    [activeReminders],
  )

  const hasMoreReminders = activeReminders.length > DASHBOARD_REMINDER_LIMIT

  const handleDone = async (r) => {
    if (r.source === 'automatic') {
      dismissAutomaticReminder(r)
      setDismissedAuto(readDismissedAutoKeys())
      return
    }
    if (!r.id) return
    await reminderService.markDone(r.id)
    load()
  }

  if (activeReminders.length === 0 && !showFreeUpsell) return null

  return (
    <ChitinCardFrame showSilhouettes={false} variant="auth" className="mb-4">
      <div className="card border-0 bg-transparent shadow-none w-100 mb-0">
        <div
          className="card-body py-3 py-md-4"
          style={{
            paddingLeft: 'clamp(1.25rem, 4.5vw, 2.75rem)',
            paddingRight: 'clamp(1.25rem, 4.5vw, 2.75rem)',
          }}
        >
        <div className="ta-section-header mb-3">
          <span>🔔 {t('reminders.panelTitle')}</span>
          <Link
            to="/reminders"
            className="small text-decoration-underline"
            style={{ color: 'var(--ta-gold)', letterSpacing: '0.06em' }}
          >
            {t('reminders.viewAll')}
          </Link>
        </div>
        {showFreeUpsell && (
          <div className="d-flex flex-column flex-sm-row gap-2 align-items-sm-center justify-content-between mb-3">
            <p className="small mb-0 min-w-0" style={{ color: 'var(--ta-text-muted)', overflowWrap: 'anywhere' }}>
              {t('reminders.panelFreeUpsell')}
            </p>
            <Link
              to="/pro"
              className="btn btn-dark btn-sm flex-shrink-0 align-self-stretch align-self-sm-auto fw-semibold"
            >
              {t('pro.ctaTryFree')}
            </Link>
          </div>
        )}
        {hasProFeatures && activeReminders.length > 0 && (
          <div className="small text-muted mb-2 min-w-0" style={{ overflowWrap: 'anywhere' }}>
            {t('reminders.panelProNotice')}
          </div>
        )}
        <div className="d-flex flex-column gap-2">
          {panelReminders.map((r) => {
            const { label, urgent } = formatDue(r.dueDate, t)
            const isAutomatic = r.source === 'automatic'
            const showDoneBtn = isAutomatic || (r.id && !isReminderLocked(r))
            return (
              <div
                key={r.id || `${r.type}-${r.tarantulaId}-${r.dueDate}`}
                className="d-flex align-items-start gap-2 p-2 rounded-2"
                style={{
                  background: 'var(--ta-bg-input)',
                  border: `1px solid ${urgent ? 'rgba(201,168,76,0.42)' : 'rgba(100,60,200,0.35)'}`,
                  minWidth: 0,
                }}
              >
                <span className="flex-shrink-0 pt-1" style={{ fontSize: '1.1rem' }}>
                  {TYPE_ICONS[r.type] ?? '📌'}
                </span>
                <div className="flex-grow-1 min-w-0" style={{ minWidth: 0 }}>
                  <div className="d-flex flex-wrap align-items-start gap-1 column-gap-2 row-gap-1">
                    <div
                      className="small fw-semibold flex-grow-1"
                      style={{
                        minWidth: 0,
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                        color: 'var(--ta-gold-light)',
                        lineHeight: 1.35,
                      }}
                    >
                      {r.message || r.type}
                    </div>
                    {isAutomatic && (
                      <span
                        className="badge bg-dark flex-shrink-0 align-self-start"
                        style={{ fontSize: '0.6rem' }}
                      >
                        PRO
                      </span>
                    )}
                  </div>
                  <div
                    className={`small min-w-0 ${urgent ? 'text-danger fw-semibold' : 'text-muted'}`}
                    style={{ overflowWrap: 'anywhere', lineHeight: 1.35 }}
                  >
                    {label}
                    {r.tarantulaName && ` · ${r.tarantulaName}`}
                  </div>
                </div>
                {showDoneBtn && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary py-0 px-2 flex-shrink-0 align-self-start"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => handleDone(r)}
                    title={t('reminders.markDone')}
                  >
                    ✓
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {hasMoreReminders && (
          <div className="mt-3 text-center">
            <Link
              to="/reminders"
              className="btn btn-outline-secondary btn-sm"
            >
              {t('reminders.viewMore')}
            </Link>
          </div>
        )}
      </div>
      </div>
    </ChitinCardFrame>
  )
}
