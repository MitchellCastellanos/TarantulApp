import { useTranslation } from 'react-i18next'
import { getSpeciesCatalogOverride } from '../data/speciesCatalogTranslations'
import { toSpeciesSlug } from '../utils/speciesSlug'
import { pickSpeciesNarrativeField } from '../utils/speciesNarrative'

const HABITAT_ICON = { terrestrial: '🌎', arboreal: '🌳', fossorial: '🕳️' }
const LEVEL_COLOR = { beginner: 'success', intermediate: 'warning', advanced: 'danger' }

function Field({ iconClass, iconTone, label, children }) {
  return (
    <div className="ta-spec-field mb-2 mb-md-3">
      <div className="ta-spec-field__label text-muted">
        <i className={`bi ${iconClass} ta-spec-icon ta-spec-icon--${iconTone}`} aria-hidden />
        <span>{label}</span>
        <span className="ta-spec-asterisk">*</span>
      </div>
      <div className="ta-spec-field__value fw-semibold">{children}</div>
    </div>
  )
}

function FieldPlain({ iconClass, iconTone, label, children }) {
  return (
    <div className="ta-spec-field mb-2 mb-md-3">
      <div className="ta-spec-field__label text-muted">
        <i className={`bi ${iconClass} ta-spec-icon ta-spec-icon--${iconTone}`} aria-hidden />
        <span>{label}</span>
      </div>
      <div className="ta-spec-field__value fw-semibold">{children}</div>
    </div>
  )
}

function SourceCatalog({ species, t }) {
  if (species.dataSource === 'gbif') {
    return (
      <span className="badge ta-catalog-pill" title={t('species.estimatedNoteGbif')}>
        <i className="bi bi-globe2 me-1" aria-hidden />
        GBIF
      </span>
    )
  }
  if (species.dataSource === 'wsc') {
    return (
      <span className="badge ta-catalog-pill ta-catalog-pill--violet" title={t('species.estimatedNoteWsc')}>
        <i className="bi bi-bug me-1" aria-hidden />
        WSC
      </span>
    )
  }
  if (species.dataSource === 'seed') {
    return (
      <span className="badge ta-catalog-pill ta-catalog-pill--catalog" title={t('species.catalog')}>
        <i className="bi bi-search me-1" aria-hidden />
        {t('species.catalog')}
      </span>
    )
  }
  return null
}

function LevelChitin({ badgeColor, label }) {
  const tone = { success: 'ok', warning: 'mid', danger: 'hot', secondary: 'muted' }[badgeColor] || 'muted'
  return (
    <span className={`ta-level-chitin ta-level-chitin--${tone}`}>
      <span className="ta-level-chitin__text">{label}</span>
    </span>
  )
}

export default function SpeciesProfileCard({ species, tarantula, t }) {
  const { i18n } = useTranslation()
  const slug = toSpeciesSlug(species.scientificName)
  const catalog = getSpeciesCatalogOverride(slug, i18n.language)
  const lang = i18n.language
  const temperamentText =
    pickSpeciesNarrativeField(species.narrativeI18n, 'temperament', lang)
    ?? catalog?.temperament
    ?? species.temperament
  const substrateText =
    pickSpeciesNarrativeField(species.narrativeI18n, 'substrate', lang)
    ?? catalog?.substrate
    ?? species.substrateType
  const careNotesText =
    pickSpeciesNarrativeField(species.narrativeI18n, 'careNotes', lang)
    ?? catalog?.careNotes
    ?? species.careNotes

  const levelKey = species.experienceLevel
  const levelLabel = levelKey
    ? t(`species.level${levelKey.charAt(0).toUpperCase() + levelKey.slice(1)}`)
    : t('common.unknown')
  const badgeColor = LEVEL_COLOR[species.experienceLevel] ?? 'secondary'

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-2 ta-spec-header-row">
        <h2 className="ta-spec-title h6 mb-0 text-uppercase letter-spacing-wide">
          {t('species.cardTitle')}
        </h2>
        <SourceCatalog species={species} t={t} />
      </div>

      {species.referencePhotoUrl && !tarantula.profilePhoto && (
        <div className="mb-3 text-center position-relative">
          <img
            src={species.referencePhotoUrl}
            alt={species.scientificName}
            className="rounded w-100"
            style={{ maxHeight: 180, objectFit: 'cover' }}
          />
          <div className="text-muted" style={{ fontSize: '0.65rem', marginTop: 2 }}>
            {t('species.refPhoto')}
          </div>
        </div>
      )}

      <div className="d-flex flex-column flex-md-row align-items-stretch gap-0 gap-md-2">
        <div className="flex-fill px-md-1">
          <FieldPlain iconClass="bi-geo-alt" iconTone="cyan" label={t('species.origin')}>
            {species.originRegion ?? t('common.unknown')}
          </FieldPlain>
          <FieldPlain iconClass="bi-tree" iconTone="cyan" label={t('species.habitat')}>
            {species.habitatType
              ? `${HABITAT_ICON[species.habitatType]} ${t(`habitat.${species.habitatType}`)}`
              : t('common.unknown')}
          </FieldPlain>
          <Field iconClass="bi-rulers" iconTone="pink" label={t('species.adultSize')}>
            {species.adultSizeCmMin ?? '?'}–{species.adultSizeCmMax ?? '?'} cm
          </Field>
        </div>

        <div className="ta-chitin-col-divider d-none d-md-block flex-shrink-0" aria-hidden />

        <div className="flex-fill px-md-1">
          <Field iconClass="bi-graph-up-arrow" iconTone="violet" label={t('species.growth')}>
            {species.growthRate
              ? t(`species.growth${species.growthRate.charAt(0).toUpperCase() + species.growthRate.slice(1)}`)
              : t('common.unknown')}
          </Field>
          <Field iconClass="bi-droplet-half" iconTone="violet" label={t('species.humidity')}>
            {species.humidityMin ?? '?'}–{species.humidityMax ?? '?'}%
          </Field>
          <Field iconClass="bi-wind" iconTone="pink" label={t('species.ventilation')}>
            {species.ventilation
              ? t(`species.vent${species.ventilation.charAt(0).toUpperCase() + species.ventilation.slice(1)}`)
              : t('common.unknown')}
          </Field>
        </div>

        <div className="ta-chitin-col-divider d-none d-md-block flex-shrink-0" aria-hidden />

        <div className="flex-fill px-md-1">
          <div className="ta-spec-field mb-2 mb-md-3">
            <div className="ta-spec-field__label text-muted">
              <i className="bi bi-stars ta-spec-icon ta-spec-icon--pink" aria-hidden />
              <span>{t('species.level')}</span>
              <span className="ta-spec-asterisk">*</span>
            </div>
            <div className="ta-spec-field__value">
              <LevelChitin badgeColor={badgeColor} label={levelLabel} />
            </div>
          </div>
          <Field iconClass="bi-lightning-charge" iconTone="violet" label={t('species.temperament')}>
            {temperamentText ?? t('common.unknown')}
          </Field>
          {substrateText && (
            <Field iconClass="bi-layers-half" iconTone="cyan" label={t('species.substrate')}>
              {substrateText}
            </Field>
          )}
        </div>
      </div>

      {careNotesText && (
        <div className="mt-2">
          <div className="alert alert-light small py-2 mb-0 border-start border-4 border-dark">
            {careNotesText}
          </div>
        </div>
      )}

      <p className="text-muted mb-0 mt-3 pt-2 small" style={{ fontSize: '0.7rem' }}>
        {t('species.estimatedNote')}
        {(species.dataSource === 'gbif' || species.dataSource === 'seed') && t('species.estimatedNoteGbif')}
        {species.dataSource === 'wsc' && t('species.estimatedNoteWsc')}
      </p>
    </>
  )
}
