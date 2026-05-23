import { useTranslation } from 'react-i18next'

export default function SpeciesTradeNoteBlock({ note, countryLabel }) {
  const { t } = useTranslation()
  if (!note) return null
  const hasContent =
    note.citesAppendix || note.laceyStatus || (note.notesMd && String(note.notesMd).trim())
  if (!hasContent) return null

  return (
    <section
      className="border rounded p-3 small ta-species-trade-note"
      style={{ borderColor: 'var(--ta-border)', background: 'rgba(0,0,0,0.15)' }}
      aria-labelledby="species-trade-note-heading"
    >
      <h3 id="species-trade-note-heading" className="h6 fw-semibold mb-2" style={{ color: 'var(--ta-parchment)' }}>
        {countryLabel
          ? t('discover.tradeNoteTitleForCountry', { country: countryLabel })
          : t('discover.tradeNoteTitle')}
      </h3>
      <p className="text-muted mb-2" style={{ lineHeight: 1.45 }}>
        {t('discover.tradeNoteDisclaimer')}
      </p>
      {note.citesAppendix ? (
        <p className="mb-1">
          <span className="text-muted">{t('discover.tradeNoteCites')}: </span>
          <strong>{note.citesAppendix}</strong>
        </p>
      ) : null}
      {note.laceyStatus ? (
        <p className="mb-1">
          <span className="text-muted">{t('discover.tradeNoteLacey')}: </span>
          <strong>{note.laceyStatus}</strong>
        </p>
      ) : null}
      {note.notesMd ? (
        <p className="mb-0 mt-2" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
          {note.notesMd}
        </p>
      ) : null}
    </section>
  )
}
