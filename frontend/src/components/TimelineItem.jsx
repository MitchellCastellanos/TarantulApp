import { useTranslation } from 'react-i18next'

const TYPE_CONFIG = {
  feeding:  { icon: '🍽️', color: '#0d6efd' },
  molt:     { icon: '🕸️', color: '#6f42c1' },
  behavior: { icon: '🔍', color: '#fd7e14' },
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
        <div style={{ width: 2, flex: 1, background: '#dee2e6', minHeight: 16 }} />
      </div>

      {/* Contenido */}
      <div className="flex-grow-1 pb-2">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <span className="fw-semibold small">{getTitle()}</span>
            <span className="text-muted small ms-2">{formatDate(event.eventDate)}</span>
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
          <p className="text-muted small mb-0 mt-1">{event.summary}</p>
        )}
      </div>
    </div>
  )
}
