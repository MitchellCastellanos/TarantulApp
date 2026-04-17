import { useTranslation } from 'react-i18next'

const TYPE_CONFIG = {
  feeding:  { icon: '🍽️', color: '#4a8fcf' },
  molt:     { icon: '🕸️', color: '#9060e0' },
  behavior: { icon: '🔍', color: '#c09040' },
}

function formatDate(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export default function TimelineItem({ event, onDelete }) {
  const { t } = useTranslation()
  const cfg = TYPE_CONFIG[event.type] || { icon: '📝', color: '#6c757d' }

  const getTitle = () => {
    if (event.type === 'behavior') {
      return `${t('quickLog.behavior')}: ${t('timeline.' + event.title, event.title)}`
    }
    return t('timeline.' + event.title, event.title)
  }

  return (
    <div className="d-flex gap-3 mb-3">
      {/* Icono con línea */}
      <div className="d-flex flex-column align-items-center">
        <div className="rounded-circle d-flex align-items-center justify-content-center"
             style={{ width: 36, height: 36, background: cfg.color + '22', border: `2px solid ${cfg.color}`, flexShrink: 0 }}>
          <span style={{ fontSize: '1rem' }}>{cfg.icon}</span>
        </div>
        <div style={{ width: 2, flex: 1, background: 'rgba(100,60,200,0.2)', minHeight: 16 }} />
      </div>

      {/* Contenido */}
      <div className="flex-grow-1 pb-2">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <span className="fw-semibold small ta-history-title">{getTitle()}</span>
            <span className="small ms-2 ta-history-meta">{formatDate(event.eventDate)}</span>
          </div>
          {onDelete && (
            <button className="btn btn-link btn-sm text-danger p-0 ms-2"
                    onClick={() => onDelete(event.id, event.type)}
                    title={t('common.delete')}>
              ✕
            </button>
          )}
        </div>
        {event.summary && (
          <p className="small mb-0 mt-1 ta-history-summary">{event.summary}</p>
        )}
      </div>
    </div>
  )
}
