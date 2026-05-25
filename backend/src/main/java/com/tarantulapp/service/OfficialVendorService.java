package com.tarantulapp.service;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.OfficialVendorLead;
import com.tarantulapp.entity.PartnerListingStatus;
import com.tarantulapp.entity.PartnerProgramTier;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.OfficialVendorLeadRepository;
import com.tarantulapp.repository.OfficialVendorRepository;
import com.tarantulapp.repository.PartnerListingRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class OfficialVendorService {
    private static final Logger log = LoggerFactory.getLogger(OfficialVendorService.class);

    private final OfficialVendorRepository officialVendorRepository;
    private final OfficialVendorLeadRepository officialVendorLeadRepository;
    private final PartnerListingRepository partnerListingRepository;
    private final EmailService emailService;
    private final String appBaseUrl;
    private final boolean seedOnStartup;

    public OfficialVendorService(OfficialVendorRepository officialVendorRepository,
                                 OfficialVendorLeadRepository officialVendorLeadRepository,
                                 PartnerListingRepository partnerListingRepository,
                                 EmailService emailService,
                                 @Value("${app.base-url:http://localhost:5173}") String appBaseUrl,
                                 @Value("${app.official-vendors.seed-on-startup:false}") boolean seedOnStartup) {
        this.officialVendorRepository = officialVendorRepository;
        this.officialVendorLeadRepository = officialVendorLeadRepository;
        this.partnerListingRepository = partnerListingRepository;
        this.emailService = emailService;
        this.appBaseUrl = trimTrailingSlash(appBaseUrl);
        this.seedOnStartup = seedOnStartup;
    }

    @PostConstruct
    @Transactional
    public void seedDefaults() {
        if (!seedOnStartup) return;
        try {
            ensureSeedData();
        } catch (Exception ex) {
            // No tumbar todo el backend por seed cuando la BD está saturada/intermitente.
            log.warn("Skipping official vendor seed on startup: {}", ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listOfficialVendors(String q,
                                                         String country,
                                                         String state,
                                                         String city,
                                                         String nearCountry,
                                                         String nearState,
                                                         String nearCity) {
        final String queryNorm = normalize(q);
        final String countryNorm = normalize(country);
        final String stateNorm = normalize(state);
        final String cityNorm = normalize(city);
        final String nearCountryNorm = normalize(nearCountry);
        final String nearStateNorm = normalize(nearState);
        final String nearCityNorm = normalize(nearCity);

        return officialVendorRepository.findByEnabledTrueOrderByInfluenceScoreDescNameAsc().stream()
                .map(this::mapVendor)
                .filter(v -> queryNorm == null || vendorMatchesQuery(v, queryNorm))
                .filter(v -> countryNorm == null || normalize((String) v.get("country")).equals(countryNorm))
                .filter(v -> stateNorm == null || normalize((String) v.get("state")).equals(stateNorm))
                .filter(v -> cityNorm == null || normalize((String) v.get("city")).equals(cityNorm))
                .sorted((a, b) -> Integer.compare(
                        rankVendor(b, nearCountryNorm, nearStateNorm, nearCityNorm),
                        rankVendor(a, nearCountryNorm, nearStateNorm, nearCityNorm)))
                .limit(50)
                .collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> submitVendorLead(String businessName, String contactName, String contactEmail,
                                                String websiteUrl, String country, String state, String city,
                                                String shippingScope, String note) {
        OfficialVendorLead lead = new OfficialVendorLead();
        lead.setBusinessName(cleanText(businessName, 140));
        lead.setContactName(cleanText(contactName, 120));
        lead.setContactEmail(cleanText(contactEmail, 255));
        lead.setWebsiteUrl(cleanText(websiteUrl, 350));
        lead.setCountry(cleanText(country, 80));
        lead.setState(cleanText(state, 80));
        lead.setCity(cleanText(city, 80));
        lead.setShippingScope(cleanText(shippingScope, 80));
        lead.setNote(cleanText(note, 1200));
        lead.setStatus("open");
        if (lead.getBusinessName() == null || lead.getContactEmail() == null) {
            throw new IllegalArgumentException("Nombre de negocio y email son requeridos");
        }
        return mapLead(officialVendorLeadRepository.save(lead));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> adminListVendors() {
        return officialVendorRepository.findAll().stream()
                .sorted((a, b) -> {
                    int scoreCompare = Integer.compare(
                            b.getInfluenceScore() == null ? 0 : b.getInfluenceScore(),
                            a.getInfluenceScore() == null ? 0 : a.getInfluenceScore());
                    if (scoreCompare != 0) return scoreCompare;
                    return (a.getName() == null ? "" : a.getName())
                            .compareToIgnoreCase(b.getName() == null ? "" : b.getName());
                })
                .map(this::mapVendor)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> adminListLeads() {
        return officialVendorLeadRepository.findTop100ByOrderByCreatedAtDesc().stream()
                .map(this::mapLead)
                .collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> adminSetVendorEnabled(UUID vendorId, boolean enabled) {
        OfficialVendor vendor = officialVendorRepository.findById(vendorId)
                .orElseThrow(() -> new NotFoundException("Vendor oficial no encontrado"));
        vendor.setEnabled(enabled);
        return mapVendor(officialVendorRepository.save(vendor));
    }

    /**
     * Updates partner ecosystem flags and feed config for an official vendor.
     * {@code listingImportEnabled} toggles approved ingest eligibility; vendor subscriptions do not imply sync.
     */
    @Transactional
    public Map<String, Object> adminUpdateStrategicProgram(UUID vendorId,
                                                           Boolean strategicFounder,
                                                           Boolean listingImportEnabled,
                                                           String partnerProgramTier,
                                                           String feedType,
                                                           String feedBaseUrl,
                                                           Map<String, Object> feedConfig,
                                                           String badge,
                                                           String websiteUrl,
                                                           Integer influenceScore,
                                                           String note) {
        OfficialVendor vendor = officialVendorRepository.findById(vendorId)
                .orElseThrow(() -> new NotFoundException("Vendor oficial no encontrado"));
        PartnerProgramTier tier = resolvePartnerProgramTier(partnerProgramTier, strategicFounder, vendor.getPartnerProgramTier());
        if (tier != null || partnerProgramTier != null || strategicFounder != null) {
            vendor.setPartnerProgramTier(tier);
        }
        if (listingImportEnabled != null) {
            vendor.setListingImportEnabled(listingImportEnabled);
        }
        if (feedType != null) {
            vendor.setFeedType(cleanFeedType(feedType));
        }
        if (feedBaseUrl != null) {
            vendor.setFeedBaseUrl(trimTrailingSlash(feedBaseUrl));
        }
        if (feedConfig != null) {
            vendor.setFeedConfig(sanitizeFeedConfig(feedConfig, vendor.getPartnerProgramTier()));
        }
        if (badge != null) {
            vendor.setBadge(cleanText(badge, 80));
        }
        if (websiteUrl != null) {
            String cleanedWebsite = trimTrailingSlash(websiteUrl);
            if (cleanedWebsite == null || cleanedWebsite.isBlank()) {
                throw new IllegalArgumentException("WEBSITE_URL_REQUIRED");
            }
            vendor.setWebsiteUrl(cleanedWebsite);
        }
        if (influenceScore != null) {
            vendor.setInfluenceScore(Math.max(0, Math.min(1000, influenceScore)));
        }
        if (note != null) {
            vendor.setNote(cleanText(note, 200));
        }
        return mapVendor(officialVendorRepository.save(vendor));
    }

    private boolean vendorMatchesQuery(Map<String, Object> vendor, String queryNorm) {
        String name = normalize((String) vendor.get("name"));
        String state = normalize((String) vendor.get("state"));
        String city = normalize((String) vendor.get("city"));
        String country = normalize((String) vendor.get("country"));
        String note = normalize((String) vendor.get("note"));
        return (name != null && name.contains(queryNorm))
                || (state != null && state.contains(queryNorm))
                || (city != null && city.contains(queryNorm))
                || (country != null && country.contains(queryNorm))
                || (note != null && note.contains(queryNorm));
    }

    private int rankVendor(Map<String, Object> vendor, String nearCountry, String nearState, String nearCity) {
        int score = 0;
        String vendorCountry = normalize((String) vendor.get("country"));
        String vendorState = normalize((String) vendor.get("state"));
        String vendorCity = normalize((String) vendor.get("city"));
        if (nearCountry != null && nearCountry.equals(vendorCountry)) score += 12;
        if (nearState != null && nearState.equals(vendorState)) score += 18;
        if (nearCity != null && nearCity.equals(vendorCity)) score += 24;

        @SuppressWarnings("unchecked")
        List<String> shipsTo = (List<String>) vendor.getOrDefault("shipsToCountries", List.of());
        if (nearCountry != null && shipsTo.stream().anyMatch(c -> nearCountry.equals(normalize(c)))) {
            score += 8;
        }

        Number influenceScore = (Number) vendor.getOrDefault("influenceScore", 0);
        score += influenceScore.intValue();
        return score;
    }

    private Map<String, Object> mapVendor(OfficialVendor vendor) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", vendor.getId());
        out.put("slug", vendor.getSlug());
        out.put("name", vendor.getName());
        out.put("country", vendor.getCountry());
        out.put("state", vendor.getState() == null ? "" : vendor.getState());
        out.put("city", vendor.getCity() == null ? "" : vendor.getCity());
        out.put("websiteUrl", vendor.getWebsiteUrl());
        out.put("nationalShipping", Boolean.TRUE.equals(vendor.getNationalShipping()));
        out.put("shipsToCountries", splitCountries(vendor.getShipsToCountries()));
        out.put("influenceScore", vendor.getInfluenceScore() == null ? 0 : vendor.getInfluenceScore());
        out.put("badge", vendor.getBadge() == null ? "Official partner" : vendor.getBadge());
        out.put("note", vendor.getNote() == null ? "" : vendor.getNote());
        out.put("enabled", Boolean.TRUE.equals(vendor.getEnabled()));
        out.put("partnerProgramTier", vendor.getPartnerProgramTier() == null ? null : vendor.getPartnerProgramTier().name());
        out.put("partnerTier", partnerTierKey(vendor.getPartnerProgramTier()));
        out.put("isFoundingPartner", vendor.getPartnerProgramTier() != null && vendor.getPartnerProgramTier().isFoundingPartner());
        out.put("listingImportEnabled", Boolean.TRUE.equals(vendor.getListingImportEnabled()));
        out.put("isDemo", Boolean.TRUE.equals(vendor.getIsDemo()));
        out.put("feedBaseUrl", vendor.getFeedBaseUrl() == null ? "" : vendor.getFeedBaseUrl());
        out.put("feedType", vendor.getFeedType() == null ? "" : vendor.getFeedType());
        out.put("feedConfig", vendor.getFeedConfig() == null ? Map.of() : vendor.getFeedConfig());
        out.put("createdAt", vendor.getCreatedAt());
        return out;
    }

    /**
     * Creates an {@link OfficialVendor} from a submitted lead and marks the lead converted.
     * Defaults: OFFICIAL_PARTNER, import off, vendor disabled until ops review.
     */
    @Transactional
    public Map<String, Object> adminPromoteLeadToVendor(UUID leadId,
                                                        Boolean enableImport,
                                                        Boolean strategicFounder,
                                                        String partnerProgramTier,
                                                        String feedType,
                                                        String feedBaseUrl,
                                                        Map<String, Object> feedConfig,
                                                        String badge,
                                                        Integer influenceScore) {
        OfficialVendorLead lead = officialVendorLeadRepository.findById(leadId)
                .orElseThrow(() -> new NotFoundException("Lead no encontrado"));
        if ("converted".equalsIgnoreCase(lead.getStatus())) {
            throw new IllegalArgumentException("LEAD_ALREADY_CONVERTED");
        }
        String slug = uniqueSlugFromBusinessName(lead.getBusinessName());
        String website = lead.getWebsiteUrl() == null ? "" : lead.getWebsiteUrl().trim();
        if (website.isBlank()) {
            throw new IllegalArgumentException("WEBSITE_URL_REQUIRED");
        }

        OfficialVendor vendor = new OfficialVendor();
        vendor.setSlug(slug);
        vendor.setName(lead.getBusinessName());
        vendor.setCountry(lead.getCountry() == null || lead.getCountry().isBlank() ? "International" : lead.getCountry().trim());
        vendor.setState(lead.getState());
        vendor.setCity(lead.getCity());
        vendor.setWebsiteUrl(website);
        vendor.setNationalShipping(true);
        vendor.setShipsToCountries(lead.getShippingScope() == null ? lead.getCountry() : lead.getShippingScope());
        vendor.setInfluenceScore(influenceScore == null ? 50 : Math.max(0, Math.min(1000, influenceScore)));
        vendor.setNote(lead.getNote());
        vendor.setBadge(cleanText(badge, 80) == null ? "Official partner" : cleanText(badge, 80));
        vendor.setEnabled(false);
        PartnerProgramTier tier = resolvePartnerProgramTier(partnerProgramTier, strategicFounder, PartnerProgramTier.OFFICIAL_PARTNER);
        vendor.setPartnerProgramTier(tier == null ? PartnerProgramTier.OFFICIAL_PARTNER : tier);
        vendor.setListingImportEnabled(Boolean.TRUE.equals(enableImport));
        vendor.setIsDemo(false);
        vendor.setFeedBaseUrl(trimTrailingSlash(feedBaseUrl == null || feedBaseUrl.isBlank() ? website : feedBaseUrl));
        vendor.setFeedType(cleanFeedType(feedType == null || feedType.isBlank() ? guessFeedType(website) : feedType));
        vendor.setFeedConfig(sanitizeFeedConfig(feedConfig, vendor.getPartnerProgramTier()));

        officialVendorRepository.save(vendor);
        lead.setStatus("converted");
        officialVendorLeadRepository.save(lead);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("vendor", mapVendor(vendor));
        out.put("lead", mapLead(lead));
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> sendPartnerCatalogLiveEmail(UUID vendorId, String toEmail, String locale) {
        OfficialVendor vendor = officialVendorRepository.findById(vendorId)
                .orElseThrow(() -> new NotFoundException("Vendor no encontrado"));
        String email = resolvePartnerContactEmail(vendor, toEmail);
        if (email.isBlank()) {
            throw new IllegalArgumentException("CONTACT_EMAIL_REQUIRED");
        }
        long listingCount = partnerListingRepository.countByOfficialVendorIdAndStatus(
                vendor.getId(), PartnerListingStatus.ACTIVE);
        String storefrontUrl = appBaseUrl + "/partner/" + vendor.getSlug();
        emailService.sendPartnerCatalogLiveEmail(
                email,
                vendor.getName(),
                listingCount,
                storefrontUrl,
                vendor.getWebsiteUrl(),
                locale);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("sent", true);
        out.put("email", email);
        out.put("listingCount", listingCount);
        out.put("storefrontUrl", storefrontUrl);
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> sendPartnerCatalogLiveEmailForLead(UUID leadId, String locale) {
        OfficialVendorLead lead = officialVendorLeadRepository.findById(leadId)
                .orElseThrow(() -> new NotFoundException("Lead no encontrado"));
        String email = lead.getContactEmail() == null ? "" : lead.getContactEmail().trim();
        if (email.isBlank()) {
            throw new IllegalArgumentException("CONTACT_EMAIL_REQUIRED");
        }
        String storefrontHint = appBaseUrl + "/partners";
        emailService.sendPartnerCatalogLiveEmail(
                email,
                lead.getBusinessName(),
                0L,
                storefrontHint,
                lead.getWebsiteUrl(),
                locale);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("sent", true);
        out.put("email", email);
        return out;
    }

    private String resolvePartnerContactEmail(OfficialVendor vendor, String overrideEmail) {
        if (overrideEmail != null && !overrideEmail.isBlank()) {
            return overrideEmail.trim();
        }
        String vendorSite = vendor.getWebsiteUrl() == null ? "" : vendor.getWebsiteUrl().trim().toLowerCase(Locale.ROOT);
        return officialVendorLeadRepository.findTop100ByOrderByCreatedAtDesc().stream()
                .filter(l -> l.getContactEmail() != null && !l.getContactEmail().isBlank())
                .filter(l -> {
                    if (l.getBusinessName() != null && vendor.getName() != null
                            && l.getBusinessName().equalsIgnoreCase(vendor.getName().trim())) {
                        return true;
                    }
                    String leadSite = l.getWebsiteUrl() == null ? "" : l.getWebsiteUrl().trim().toLowerCase(Locale.ROOT);
                    return !vendorSite.isBlank() && vendorSite.equals(leadSite);
                })
                .map(OfficialVendorLead::getContactEmail)
                .findFirst()
                .orElse("");
    }

    private static String guessFeedType(String websiteUrl) {
        if (websiteUrl == null) {
            return "";
        }
        String u = websiteUrl.toLowerCase(Locale.ROOT);
        if (u.contains("woocommerce") || u.contains("/product") || u.contains("wp-json")) {
            return "woocommerce";
        }
        return "woocommerce";
    }

    private static PartnerProgramTier resolvePartnerProgramTier(String raw,
                                                                Boolean strategicFounder,
                                                                PartnerProgramTier fallback) {
        if (raw != null) {
            String t = raw.trim().toUpperCase(Locale.ROOT)
                    .replace('-', '_')
                    .replace(' ', '_');
            if (t.isBlank() || "NONE".equals(t) || "COMMUNITY_SELLER".equals(t) || "VERIFIED_VENDOR".equals(t)) {
                return null;
            }
            if ("FOUNDING".equals(t) || "FOUNDING_PARTNER".equals(t) || "FOUNDER".equals(t)
                    || "STRATEGIC_FOUNDER".equals(t)) {
                return PartnerProgramTier.FOUNDING_PARTNER;
            }
            if ("OFFICIAL".equals(t) || "OFFICIAL_PARTNER".equals(t) || "STRATEGIC_PARTNER".equals(t)) {
                return PartnerProgramTier.OFFICIAL_PARTNER;
            }
            throw new IllegalArgumentException("INVALID_PARTNER_PROGRAM_TIER");
        }
        if (strategicFounder != null) {
            return Boolean.TRUE.equals(strategicFounder) ? PartnerProgramTier.FOUNDING_PARTNER : PartnerProgramTier.OFFICIAL_PARTNER;
        }
        return fallback;
    }

    private static String partnerTierKey(PartnerProgramTier tier) {
        if (tier == null) return null;
        return tier.isFoundingPartner() ? "founding" : "official";
    }

    private static String cleanFeedType(String raw) {
        if (raw == null) return null;
        String t = raw.trim().toLowerCase(Locale.ROOT);
        if (t.isBlank()) return null;
        if (!List.of("woocommerce", "static", "mock", "shopify", "html_scraper").contains(t)) {
            throw new IllegalArgumentException("INVALID_FEED_TYPE");
        }
        return t;
    }

    private static Map<String, Object> sanitizeFeedConfig(Map<String, Object> raw, PartnerProgramTier tier) {
        Map<String, Object> out = new LinkedHashMap<>();
        if (raw != null) {
            raw.forEach((key, value) -> {
                if (key != null && value != null) {
                    out.put(key.trim(), value);
                }
            });
        }
        String tierKey = partnerTierKey(tier);
        if (tierKey != null) {
            out.putIfAbsent("partnerTier", tierKey);
        }
        out.putIfAbsent("boostLevel", tier != null && tier.isFoundingPartner() ? 2 : 1);
        out.putIfAbsent("allowedCategories", List.of());
        out.putIfAbsent("blockedCategories", List.of());
        out.putIfAbsent("blockedCategorySlugs", List.of());
        out.putIfAbsent("categoryMapping", Map.of());
        return out;
    }

    private String uniqueSlugFromBusinessName(String businessName) {
        String base = slugify(businessName);
        if (base.isBlank()) {
            base = "partner";
        }
        String candidate = base;
        int n = 2;
        while (officialVendorRepository.findBySlug(candidate).isPresent()) {
            candidate = base + "-" + n;
            n++;
        }
        return candidate;
    }

    private static String slugify(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
    }

    private static String trimTrailingSlash(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String t = url.trim();
        return t.endsWith("/") ? t.substring(0, t.length() - 1) : t;
    }

    private Map<String, Object> mapLead(OfficialVendorLead lead) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", lead.getId());
        out.put("businessName", lead.getBusinessName());
        out.put("contactName", lead.getContactName() == null ? "" : lead.getContactName());
        out.put("contactEmail", lead.getContactEmail());
        out.put("websiteUrl", lead.getWebsiteUrl() == null ? "" : lead.getWebsiteUrl());
        out.put("country", lead.getCountry() == null ? "" : lead.getCountry());
        out.put("state", lead.getState() == null ? "" : lead.getState());
        out.put("city", lead.getCity() == null ? "" : lead.getCity());
        out.put("shippingScope", lead.getShippingScope() == null ? "" : lead.getShippingScope());
        out.put("note", lead.getNote() == null ? "" : lead.getNote());
        out.put("status", lead.getStatus());
        out.put("createdAt", lead.getCreatedAt());
        return out;
    }

    private List<String> splitCountries(String raw) {
        if (raw == null || raw.isBlank()) return List.of();
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toList());
    }

    private void ensureSeedData() {
        if (officialVendorRepository.count() > 0) return;
        officialVendorRepository.save(seedVendor("become-partner-us-breeder", "Are you a U.S. breeder?", "United States", null, null,
                "https://tarantulapp.com/marketplace#vendor-activation", true, "United States", 95,
                "This featured spot is open. Apply to become an official partner and get listed in front of every U.S. keeper.",
                "Open spot"));
        officialVendorRepository.save(seedVendor("become-partner-mexico-breeder", "¿Eres breeder en México?", "Mexico", null, null,
                "https://tarantulapp.com/marketplace#vendor-activation", true, "Mexico", 94,
                "Este lugar destacado está disponible. Aplica para ser partner oficial y aparecer aquí.",
                "Lugar disponible"));
        officialVendorRepository.save(seedVendor("become-partner-canada-breeder", "Breeder in Canada?", "Canada", null, null,
                "https://tarantulapp.com/marketplace#vendor-activation", true, "Canada", 93,
                "This featured slot is open for a vetted Canadian breeder or shop. Apply to claim it.",
                "Open spot"));
        officialVendorRepository.save(seedVendor("become-partner-exotic-shop", "Run an exotic invert shop?", "United States", null, null,
                "https://tarantulapp.com/marketplace#vendor-activation", true, "United States,Mexico,Canada", 92,
                "Showcase your storefront here. Apply for the official partner program in minutes — our team reviews every request.",
                "Open spot"));
        officialVendorRepository.save(seedVendor("become-partner-international", "Ship internationally?", "International", null, null,
                "https://tarantulapp.com/marketplace#vendor-activation", true, "United States,Mexico,Canada", 91,
                "Cross-border breeders welcome. Submit your operation to be reviewed for verified partner status.",
                "Open spot"));
    }

    private OfficialVendor seedVendor(String slug, String name, String country, String state, String city,
                                      String websiteUrl, boolean nationalShipping, String shipsToCountries,
                                      int influenceScore, String note, String badge) {
        OfficialVendor v = new OfficialVendor();
        v.setSlug(slug);
        v.setName(name);
        v.setCountry(country);
        v.setState(state);
        v.setCity(city);
        v.setWebsiteUrl(websiteUrl);
        v.setNationalShipping(nationalShipping);
        v.setShipsToCountries(shipsToCountries);
        v.setInfluenceScore(influenceScore);
        v.setBadge(badge);
        v.setNote(note);
        v.setEnabled(true);
        v.setPartnerProgramTier(null);
        v.setListingImportEnabled(false);
        v.setIsDemo(false);
        return v;
    }

    private String cleanText(String value, int maxLen) {
        if (value == null) return null;
        String out = value.trim().replaceAll("\\s+", " ");
        if (out.isEmpty()) return null;
        return out.length() > maxLen ? out.substring(0, maxLen) : out;
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim().toLowerCase();
    }
}
