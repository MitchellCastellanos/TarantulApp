import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { COUNTRY_OPTIONS, STATES_BY_COUNTRY, CITIES_BY_STATE, SHIPS_TO_OPTIONS } from '../constants/locations'

function FilterPill({ active, onClick, children, id }) {
  return (
    <button
      type="button"
      id={id}
      className={`ta-marketplace-filter-pill${active ? ' ta-marketplace-filter-pill--active' : ''}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default function MarketplaceFilterBar({
  query,
  setQuery,
  filters,
  setFilters,
  onSaveFilters,
  onLoadFilters,
}) {
  const { t } = useTranslation()
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const availableStates = STATES_BY_COUNTRY[filters.country || 'Mexico'] || []
  const filterCities = CITIES_BY_STATE[filters.state] || []

  const activeAdvancedCount = [
    filters.country,
    filters.state,
    filters.city,
    filters.shipsToCountry,
    filters.sellerTier,
    filters.listingOrigin,
    filters.minPrice,
    filters.maxPrice,
    filters.hasImage !== null,
    filters.hasRegulatoryRefs,
  ].filter(Boolean).length

  const toggleNearMe = () => setFilters((f) => ({ ...f, nearMe: !f.nearMe }))
  const toggleVerified = () => setFilters((f) => ({ ...f, verifiedOnly: !f.verifiedOnly }))
  const toggleBoosted = () => setFilters((f) => ({ ...f, boostedOnly: !f.boostedOnly }))

  return (
    <div className="ta-marketplace-filter-bar card border-0 shadow-sm mb-3 ta-premium-pane">
      <div className="card-body p-3">
        <div className="ta-marketplace-filter-bar__search-row mb-3">
          <input
            className="form-control form-control-sm ta-marketplace-filter-bar__search"
            placeholder={t('marketplace.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t('marketplace.searchPlaceholder')}
          />
          <button
            type="button"
            className={`btn btn-sm ta-marketplace-filter-bar__advanced-toggle${advancedOpen ? ' active' : ''}`}
            onClick={() => setAdvancedOpen((v) => !v)}
            aria-expanded={advancedOpen}
            aria-controls="marketplace-advanced-filters"
          >
            {t('marketplace.filtersToggle')}
            {activeAdvancedCount > 0 && (
              <span className="ta-marketplace-filter-bar__badge">{activeAdvancedCount}</span>
            )}
          </button>
        </div>

        <div className="ta-marketplace-filter-bar__quick" role="group" aria-label={t('marketplace.filtersQuickAria')}>
          <FilterPill id="nearMePill" active={filters.nearMe} onClick={toggleNearMe}>
            {t('marketplace.nearMe')}
          </FilterPill>
          <FilterPill active={filters.verifiedOnly} onClick={toggleVerified}>
            {t('marketplace.verifiedOnlyShort')}
          </FilterPill>
          <FilterPill active={filters.boostedOnly} onClick={toggleBoosted}>
            {t('marketplace.boostedOnlyShort')}
          </FilterPill>
        </div>

        {advancedOpen && (
          <div id="marketplace-advanced-filters" className="ta-marketplace-filter-bar__advanced mt-3 pt-3">
            <div className="row g-2 g-md-3">
              <div className="col-md-4">
                <label className="small text-muted mb-1 d-block">{t('marketplace.anyCountry')}</label>
                <select
                  className="form-select form-select-sm"
                  value={filters.country}
                  onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value, state: '', city: '' }))}
                >
                  <option value="">{t('marketplace.anyCountry')}</option>
                  {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="small text-muted mb-1 d-block">{t('marketplace.anyState')}</label>
                <select
                  className="form-select form-select-sm"
                  value={filters.state}
                  onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value, city: '' }))}
                >
                  <option value="">{t('marketplace.anyState')}</option>
                  {availableStates.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="small text-muted mb-1 d-block">{t('marketplace.anyCity')}</label>
                <select
                  className="form-select form-select-sm"
                  value={filters.city}
                  onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
                >
                  <option value="">{t('marketplace.anyCity')}</option>
                  {filterCities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="small text-muted mb-1 d-block">{t('marketplace.shipsToFilterLabel')}</label>
                <select
                  className="form-select form-select-sm"
                  value={filters.shipsToCountry || ''}
                  onChange={(e) => setFilters((f) => ({ ...f, shipsToCountry: e.target.value }))}
                  aria-label={t('marketplace.shipsToFilterLabel')}
                >
                  <option value="">{t('marketplace.shipsToFilterAny')}</option>
                  {SHIPS_TO_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {t('marketplace.shipsToFilterTo', { country: opt.label })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="small text-muted mb-1 d-block">{t('marketplace.anySellerTier')}</label>
                <select
                  className="form-select form-select-sm"
                  value={filters.sellerTier}
                  onChange={(e) => setFilters((f) => ({ ...f, sellerTier: e.target.value }))}
                >
                  <option value="">{t('marketplace.anySellerTier')}</option>
                  <option value="community">{t('marketplace.sellerTierCommunity')}</option>
                  <option value="pro">{t('marketplace.sellerTierPro')}</option>
                  <option value="vendor">{t('marketplace.sellerTierVendor')}</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="small text-muted mb-1 d-block">{t('marketplace.anyOrigin')}</label>
                <select
                  className="form-select form-select-sm"
                  value={filters.listingOrigin}
                  onChange={(e) => setFilters((f) => ({ ...f, listingOrigin: e.target.value }))}
                >
                  <option value="">{t('marketplace.anyOrigin')}</option>
                  <option value="captive_bred">{t('marketplace.originCaptiveBred')}</option>
                  <option value="wild_caught">{t('marketplace.originWildCaught')}</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="small text-muted mb-1 d-block">{t('marketplace.imageFilterAny')}</label>
                <select
                  className="form-select form-select-sm"
                  value={filters.hasImage === null ? '' : filters.hasImage ? 'with' : 'without'}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      hasImage: e.target.value === '' ? null : e.target.value === 'with',
                    }))
                  }
                >
                  <option value="">{t('marketplace.imageFilterAny')}</option>
                  <option value="with">{t('marketplace.imageFilterWith')}</option>
                  <option value="without">{t('marketplace.imageFilterWithout')}</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="small text-muted mb-1 d-block">{t('marketplace.priceMin')}</label>
                <input
                  className="form-control form-control-sm"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t('marketplace.priceMin')}
                  value={filters.minPrice}
                  onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value }))}
                />
              </div>
              <div className="col-md-3">
                <label className="small text-muted mb-1 d-block">{t('marketplace.priceMax')}</label>
                <input
                  className="form-control form-control-sm"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t('marketplace.priceMax')}
                  value={filters.maxPrice}
                  onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <div className="form-check mt-md-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="hasRegulatoryRefs"
                    checked={filters.hasRegulatoryRefs}
                    onChange={(e) => setFilters((f) => ({ ...f, hasRegulatoryRefs: e.target.checked }))}
                  />
                  <label className="form-check-label small" htmlFor="hasRegulatoryRefs">
                    {t('marketplace.withRegulatoryRefsOnly')}
                  </label>
                </div>
              </div>
              <div className="col-12 d-flex gap-2 flex-wrap">
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onSaveFilters}>
                  {t('marketplace.savedSearchSave')}
                </button>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onLoadFilters}>
                  {t('marketplace.savedSearchLoad')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
