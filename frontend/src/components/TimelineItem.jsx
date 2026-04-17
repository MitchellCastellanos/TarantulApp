import { useTranslation } from 'react-i18next'
import { formatEventDateTime } from '../utils/dateFormat'

const TYPE_CONFIG = {
  feeding:  { icon: '🍽️', color: '#4a8fcf' },
  molt:     { icon: '🕸️', color: '#9060e0' },
  behavior: { icon: '🔍', color: '#c09040' },
}

export default function TimelineItem({ event, onDelete }) {
  const { t, i18n } = useTranslation()
  const cfg = TYPE_CONFIG[event.type] || { icon: '📝', color: '#6c757d' }

  const getTitle = () => {
    if (event.type === 'behavior') {
      return `${t('quickLog.behavior')}: ${t('timeline.' + event.title, event.title)}`
    }
    return t('timeline.' + event.title, event.title)
  }

  return (
    <div className="d-flex gap-2 gap-md-3 ta-timeline-row ta-timeline-entry">
      {/* Icono con línea (colores del pergamino vía .ta-parchment-scroll) */}
      <div className="d-flex flex-column align-items-center flex-shrink-0 ta-timeline-icon-col">
        <div
          className="ta-timeline-marker rounded-circle d-flex align-items-center justify-content-center"
          style={{ width: 34, height: 34 }}
        >
          <span style={{ fontSize: '0.95rem' }}>{cfg.icon}</span>
        </div>
        <div className="ta-timeline-vline" style={{ width: 2, flex: 1, minHeight: 12 }} />
      </div>

      {/* Contenido: título, fecha y × en la misma línea (× pegada al registro) */}
      <div className="flex-grow-1 min-w-0">
        <div className="d-flex flex-wrap align-items-baseline gap-2 ta-timeline-head-row">
          <span className="fw-semibold small ta-history-title flex-grow-1 min-w-0">{getTitle()}</span>
          <span className="d-inline-flex align-items-baseline gap-1 flex-shrink-0 ta-timeline-meta-actions">
            <span className="small ta-history-meta text-nowrap">{formatEventDateTime(event.eventDate, i18n.language)}</span>
            {onDelete && (
              <button
                type="button"
                className="ta-history-delete-inline"
                onClick={() => onDelete(event.id, event.type)}
                title={t('common.delete')}
                aria-label={t('common.delete')}
              >
                ×
              </button>
            )}
          </span>
        </div>
        {event.summary && (
          <p className="small mb-0 mt-1 ps-0 ta-history-summary">{event.summary}</p>
        )}
      </div>
    </div>
  )
}
