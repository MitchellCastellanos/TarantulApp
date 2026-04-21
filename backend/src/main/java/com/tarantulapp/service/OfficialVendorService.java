package com.tarantulapp.service;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.OfficialVendorLead;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.OfficialVendorLeadRepository;
import com.tarantulapp.repository.OfficialVendorRepository;
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
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class OfficialVendorService {
    private static final Logger log = LoggerFactory.getLogger(OfficialVendorService.class);

    private final OfficialVendorRepository officialVendorRepository;
    private final OfficialVendorLeadRepository officialVendorLeadRepository;
    private final boolean seedOnStartup;

    public OfficialVendorService(OfficialVendorRepository officialVendorRepository,
                                 OfficialVendorLeadRepository officialVendorLeadRepository,
                                 @Value("${app.official-vendors.seed-on-startup:false}") boolean seedOnStartup) {
        this.officialVendorRepository = officialVendorRepository;
        this.officialVendorLeadRepository = officialVendorLeadRepository;
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
        out.put("createdAt", vendor.getCreatedAt());
        return out;
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
        officialVendorRepository.save(seedVendor("fear-not-tarantulas", "Fear Not Tarantulas", "United States", "Virginia", "Virginia Beach",
                "https://www.fearnottarantulas.com", true, "United States", 93, "National shipping coverage"));
        officialVendorRepository.save(seedVendor("swifts-invertebrates", "Swift's Invertebrates", "United States", "Mississippi", "Little Rock",
                "https://www.swiftinverts.com", true, "United States", 88, "Long-standing breeder and importer"));
        officialVendorRepository.save(seedVendor("spider-shoppe", "Spider Shoppe", "United States", "Washington", "Tacoma",
                "https://spidershoppe.com", true, "United States", 84, "Wide species catalog and online support"));
        officialVendorRepository.save(seedVendor("pinchers-pokies", "Pinchers & Pokies Exotics", "United States", "South Carolina", "Summerville",
                "https://www.pinchersandpokies.com", true, "United States", 82, "Community-trusted specialty invertebrate seller"));
        officialVendorRepository.save(seedVendor("primal-fear", "Primal Fear Tarantulas", "United States", "California", "Los Angeles",
                "https://primalfeartarantulas.com", true, "United States", 78, "Strong West Coast presence"));
        officialVendorRepository.save(seedVendor("tarantula-canada", "Tarantula Canada", "Canada", "Quebec", "Montreal",
                "https://www.tarantulacanada.ca", true, "Canada", 90, "Bilingual service for Canada"));
        officialVendorRepository.save(seedVendor("tarantulas-de-mexico", "Tarantulas de Mexico", "Mexico", "Jalisco", "Zapopan",
                "http://www.tarantulasdemexico.com", true, "Mexico", 91, "Recognized legal breeding project in Mexico"));
        officialVendorRepository.save(seedVendor("mexico-exotico", "Mexico Exotico (PIMVS)", "Mexico", "CDMX", "Ciudad de Mexico",
                "https://pimvsmexicoexotico.wixsite.com/pimvsmexicoexotico", true, "Mexico", 79, "Focused on legal and conservation-driven trade"));
    }

    private OfficialVendor seedVendor(String slug, String name, String country, String state, String city,
                                      String websiteUrl, boolean nationalShipping, String shipsToCountries,
                                      int influenceScore, String note) {
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
        v.setBadge("Official partner");
        v.setNote(note);
        v.setEnabled(true);
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
