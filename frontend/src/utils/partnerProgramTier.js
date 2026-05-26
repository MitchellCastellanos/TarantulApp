/** Official/founding partner tier helpers (legacy STRATEGIC_* still read during DB migration). */

export function isFoundingPartnerTier(entity) {
  if (!entity) return false
  if (entity.isFoundingPartner) return true
  const tier = entity.partnerProgramTier
  return tier === 'FOUNDING_PARTNER' || tier === 'STRATEGIC_FOUNDER'
}

export function isOfficialPartnerTier(entity) {
  if (!entity) return false
  const tier = entity.partnerProgramTier
  if (tier === 'OFFICIAL_PARTNER' || tier === 'STRATEGIC_PARTNER') return true
  return isFoundingPartnerTier(entity)
}
