import { useTranslation } from 'react-i18next'
import { formatEventDateTime } from '../utils/dateFormat'
import { buildEventShareText } from '../utils/shareTemplates'
import { detectShareChannel, shareOrCopyText } from '../utils/shareUtils'

const TYPE_COLOR = {
  feeding: '#4a8fcf',
  molt: '#9060e0',
  behavior: '#c09040',
}

export default function TimelineItem({ event, onDelete, shareMeta }) {
  const { t, i18n } = useTranslation()
  const glyphKey =
    event.type === 'feeding'
      ? 'timeline.glyphFeeding'
      : event.type === 'molt'
        ? 'timeline.glyphMolt'
        : event.type === 'behavior'
          ? 'timeline.glyphBehavior'
          : 'timeline.glyphNote'
  const cfg = {
    icon: t(glyphKey),
    color: TYPE_COLOR[event.type] || '#6c757d',
  }

  const getTitle = () => {
    if (event.type === 'behavior') {
      return `${t('quickLog.behavior')}: ${t('timeline.' + event.title, event.title)}`
    }
    return t('timeline.' + event.title, event.title)
  }

  const handleShare = async () => {
    if (!shareMeta?.tarantulaName) return
    const text = buildEventShareText({
      tarantulaName: shareMeta.tarantulaName,
      speciesName: shareMeta.speciesName,
      event,
      t,
      language: i18n.language,
      profileUrl: shareMeta.profileUrl,
      channel: detectShareChannel(),
    })
    try {
      await shareOrCopyText(text)
    } catch {
      // no-op
    }
  }

  return (
    <div className="d-flex gap-2 gap-md-3 ta-timeline-row ta-timeline-entry">
      {/* Icono con línea — tonos en .ta-timeline-panel */}
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
      <div
        className="flex-grow-1 min-w-0"
        title={event.type === 'molt' ? t('molt.timelineRowHint') : undefined}
      >
        <div className="d-flex flex-wrap align-items-baseline gap-2 ta-timeline-head-row">
          <span className="fw-semibold small ta-history-title flex-grow-1 min-w-0">{getTitle()}</span>
          <div className="d-inline-flex align-items-baseline gap-1 flex-shrink-0 ta-timeline-meta-actions">
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
            {shareMeta && (
              <button
                type="button"
                className="btn btn-sm ta-history-share-inline"
                onClick={handleShare}
                title={t('share.shareEvent')}
                aria-label={t('share.shareEvent')}
              >
                <i className="bi bi-share-fill" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        {event.summary && (
          <p className="small mb-0 mt-1 ps-0 ta-history-summary">{event.summary}</p>
        )}
        {event.type === 'molt' && event.successful === false && (
          <span
            className="badge mt-1 d-inline-block"
            style={{
              background: 'rgba(220,53,69,0.18)',
              color: '#e07080',
              fontSize: '0.7rem',
              border: '1px solid rgba(220,53,69,0.35)',
            }}
          >
            ⚠{' '}
            {event.complicationType
              ? t(`molt.complication_${event.complicationType}`)
              : t('molt.hadComplication')}
          </span>
        )}
        {event.type === 'molt' && event.durationMinutes != null && event.durationMinutes > 0 && (
          <span className="ms-1 small" style={{ color: 'var(--ta-text-muted)', fontSize: '0.72rem' }}>
            · {event.durationMinutes} min
          </span>
        )}
      </div>
    </div>
  )
}
