import { useAuth } from '../context/AuthContext'
import { inferBillingRegion } from '../utils/inferBillingRegion'
import { COUNTRY_NAME_TO_ISO } from '../constants/locations'

/** Regions that get a localized, country-scoped marketplace. Keep in sync with backend RegionPolicy. */
const LOCALIZED_REGIONS = ['MX', 'US', 'CA']

const REGION_TO_COUNTRY = {
  MX: 'Mexico',
  US: 'United States',
  CA: 'Canada',
}

/**
 * Resolves the viewer's marketplace region for country gating.
 *
 * - Logged-in users map from their saved profile country.
 * - Guests fall back to the inferred billing region (timezone/language).
 * - Anyone outside MX/US/CA is treated as {@code INT}: they browse everything
 *   but see a "coming soon to your country" hint instead of a scoped feed.
 *
 * @returns {{ region: string, supported: boolean, country: string|null }}
 */
export function useViewerRegion() {
  const { user } = useAuth()
  const fromProfile = user?.profileCountry ? COUNTRY_NAME_TO_ISO[user.profileCountry] : null
  const region = fromProfile || inferBillingRegion()
  const supported = LOCALIZED_REGIONS.includes(region)
  return {
    region: supported ? region : 'INT',
    supported,
    country: supported ? REGION_TO_COUNTRY[region] : null,
  }
}
