import { useTranslation } from 'react-i18next'

function dash(v) {
  if (v === null || v === undefined || v === '') return '–'
  return String(v)
}

/**
 * Misma ficha compacta que “Nueva tarántula” al elegir especie ({@code alert alert-dark} + nombre + meta).
 * En Descubrir el nombre va en dorado para leerse sobre el shell oscuro.
 *
 * @param {{ scientificName?: string, habitatType?: string, adultSizeCmMin?: unknown, adultSizeCmMax?: unknown, experienceLevel?: string }} [species]
 * @param {'form'|'discover'} [variant]
 * @param {string} [title] — si no hay {@code species} (solo taxón)
 * @param {string} [subtitle] — segunda línea cuando no hay {@code species}
 */
export default function DiscoverSpeciesProfileSnippet({
  species,
  variant = 'discover',
  title,
  subtitle,
  className = '',
}) {
  const { t } = useTranslation()
  const isTaxonOnly = !species?.scientificName && (title || subtitle)
  const name = species?.scientificName || title || '–'
  const baseMeta = isTaxonOnly
    ? ''
    : t('discover.speciesProfileMeta', {
        habitat: dash(species?.habitatType),
        min: dash(species?.adultSizeCmMin),
        max: dash(species?.adultSizeCmMax),
        level: dash(species?.experienceLevel),
      })
  const worldSuffix =
    !isTaxonOnly && species?.hobbyWorld
      ? species.hobbyWorld === 'new_world'
        ? t('species.worldNewWorld')
        : t('species.worldOldWorld')
      : ''
  const line2 = isTaxonOnly
    ? subtitle || ''
    : [baseMeta, worldSuffix].filter(Boolean).join(' · ')

  const isForm = variant === 'form'
  const nameStyle = isForm ? undefined : { color: 'var(--ta-gold)' }
  const subStyle = isForm ? undefined : { color: 'rgba(255,255,255,0.55)' }

  return (
    <div
      className={`alert alert-dark small py-2 mb-0 ${className}`.trim()}
      style={
        isForm
          ? undefined
          : {
              background: 'rgba(0,0,0,0.45)',
              borderColor: 'var(--ta-border)',
              color: 'var(--ta-parchment)',
            }
      }
    >
      <div className="fw-bold" style={nameStyle}>
        {name}
      </div>
      {line2 ? (
        <div className={isForm ? 'text-muted' : ''} style={isForm ? undefined : subStyle}>
          {line2}
        </div>
      ) : null}
    </div>
  )
}
