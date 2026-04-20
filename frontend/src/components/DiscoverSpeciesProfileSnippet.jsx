import { useTranslation } from 'react-i18next'

function dash(v) {
  if (v === null || v === undefined || v === '') return '–'
  return String(v)
}

/**
 * Ficha compacta (nombre + meta + nota hobby) sobre panel oscuro legible en formulario y Descubrir.
 *
 * @param {{ scientificName?: string, habitatType?: string, adultSizeCmMin?: unknown, adultSizeCmMax?: unknown, experienceLevel?: string }} [species]
 * @param {'form'|'discover'} [variant] — mismo estilo legible en formulario y Descubrir
 * @param {string} [title] — si no hay {@code species} (solo taxón)
 * @param {string} [subtitle] — segunda línea cuando no hay {@code species}
 * @param {'div'|'h1'} [nameAs] — en fichas públicas usar {@code h1} para SEO
 */
export default function DiscoverSpeciesProfileSnippet({
  species,
  variant: _variant = 'discover',
  title,
  subtitle,
  className = '',
  nameAs = 'div',
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

  const panelStyle = {
    background: 'rgba(10, 10, 22, 0.92)',
    border: '1px solid rgba(100, 60, 200, 0.38)',
    color: 'var(--ta-parchment)',
  }
  const nameStyle = { color: 'var(--ta-gold)' }
  const subStyle = { color: 'rgba(218, 208, 245, 0.82)' }
  const noteStyle = {
    fontSize: '0.68rem',
    lineHeight: 1.35,
    marginTop: '0.35rem',
    color: 'rgba(190, 180, 220, 0.78)',
  }

  const NameTag = nameAs === 'h1' ? 'h1' : 'div'
  const nameClass =
    nameAs === 'h1' ? 'fw-bold h4 mb-0' : 'fw-bold'

  return (
    <div
      className={`small py-2 px-2 rounded-2 mb-0 ta-species-profile-snippet ${className}`.trim()}
      style={panelStyle}
    >
      <NameTag className={nameClass} style={nameStyle}>
        {name}
      </NameTag>
      {line2 ? <div style={subStyle}>{line2}</div> : null}
      {!isTaxonOnly && species?.hobbyWorld && (
        <div style={noteStyle}>
          {t('species.hobbyWorldSnippetNote')}
        </div>
      )}
    </div>
  )
}
