import { useMemo } from 'react'
import { pickSpeciesNarrativeField } from '../utils/speciesNarrative'

const MOLT_TOPIC_KEYS = [
  { field: 'preMoltSigns', titleKey: 'species.careTopicPreMolt', icon: 'bi-binoculars' },
  { field: 'moltCare', titleKey: 'species.careTopicMolt', icon: 'bi-arrow-repeat' },
  { field: 'postMoltCare', titleKey: 'species.careTopicPostMolt', icon: 'bi-hourglass-split' },
  { field: 'moltRhythm', titleKey: 'species.careTopicRhythm', icon: 'bi-activity' },
]

function growthLabel(species, t) {
  const g = species?.growthRate
  if (!g || typeof g !== 'string') return null
  const key = `species.growth${g.charAt(0).toUpperCase() + g.slice(1)}`
  const label = t(key, { defaultValue: '' })
  return label && label !== key ? label : g
}

/**
 * Bloques “care” alimentados solo por campos del DTO y narrativas opcionales (sin inventar hechos por especie).
 */
export default function SpeciesCarePanels({ species, t, i18nLanguage }) {
  const narrative = species?.narrativeI18n

  const moltBlocks = useMemo(() => {
    return MOLT_TOPIC_KEYS.map((row) => {
      const text = pickSpeciesNarrativeField(narrative, row.field, i18nLanguage)
      return text ? { ...row, text } : null
    }).filter(Boolean)
  }, [narrative, i18nLanguage])

  const growthText = growthLabel(species, t)
  const sizeKnown = species?.adultSizeCmMin != null || species?.adultSizeCmMax != null
  const humidityKnown = species?.humidityMin != null && species?.humidityMax != null

  const showDataStrip = Boolean(growthText || sizeKnown || humidityKnown)

  return (
    <div className="mt-3 pt-2 border-top" style={{ borderColor: 'var(--ta-border, rgba(255,255,255,0.08))' }}>
      {showDataStrip && (
        <section className="mb-3">
          <h3 className="h6 text-uppercase letter-spacing mb-2 ta-accent-heading">{t('species.careFromDataTitle')}</h3>
          <ul className="small mb-0 ps-3" style={{ color: 'var(--ta-text-muted)' }}>
            {growthText && (
              <li className="mb-1">{t('species.careDataBulletGrowth', { value: growthText })}</li>
            )}
            {sizeKnown && (
              <li className="mb-1">
                {t('species.careDataBulletSize', {
                  min: species.adultSizeCmMin ?? '—',
                  max: species.adultSizeCmMax ?? '—',
                })}
              </li>
            )}
            {humidityKnown && (
              <li>{t('species.careDataBulletHumidity', { min: species.humidityMin, max: species.humidityMax })}</li>
            )}
          </ul>
        </section>
      )}

      <section>
        <h3 className="h6 text-uppercase letter-spacing mb-2 ta-accent-heading">{t('species.careTopicsTitle')}</h3>
        {moltBlocks.length > 0 ? (
          <div className="d-flex flex-column gap-2">
            {moltBlocks.map((b) => (
              <div
                key={b.field}
                className="rounded-3 border p-3 ta-premium-pane"
                style={{ borderColor: 'var(--ta-border, rgba(255,255,255,0.12))' }}
              >
                <div className="d-flex gap-2 align-items-start">
                  <i className={`bi ${b.icon} flex-shrink-0 ta-spec-icon ta-spec-icon--violet`} aria-hidden />
                  <div className="min-w-0">
                    <div className="fw-semibold small mb-1" style={{ color: 'var(--ta-parchment, #f5f0e6)' }}>
                      {t(b.titleKey)}
                    </div>
                    <p className="small mb-0 text-break" style={{ color: 'var(--ta-text-muted)', whiteSpace: 'pre-wrap' }}>
                      {b.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="rounded-3 p-3 small"
            style={{
              border: '1px solid rgba(212, 175, 55, 0.38)',
              background: 'linear-gradient(135deg, rgba(30, 24, 12, 0.35), rgba(12, 10, 22, 0.5))',
            }}
          >
            <div className="fw-semibold mb-1" style={{ color: 'var(--ta-gold)' }}>
              {t('species.careMoltFallbackTitle')}
            </div>
            <p className="mb-0" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.5 }}>
              {t('species.careMoltFallbackBody')}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
