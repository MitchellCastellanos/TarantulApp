package com.tarantulapp.service.vendors.normalizers;

import com.tarantulapp.entity.PartnerListingAvailability;
import com.tarantulapp.entity.PartnerListingStatus;
import com.tarantulapp.repository.SpeciesRepository;
import com.tarantulapp.service.vendors.sources.StrategicVendorRawListing;
import com.tarantulapp.service.vendors.sync.PartnerListingUpsertRequest;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Component
public class StrategicPartnerListingNormalizer {

    private final SpeciesRepository speciesRepository;

    public StrategicPartnerListingNormalizer(SpeciesRepository speciesRepository) {
        this.speciesRepository = speciesRepository;
    }

    public PartnerListingUpsertRequest normalize(UUID officialVendorId, StrategicVendorRawListing raw) {
        if (raw == null) return null;

        String speciesNormalized = normalizeSpecies(raw.speciesNameRaw());
        Integer speciesId = speciesNormalized == null ? null : speciesRepository
                .findByScientificNameIgnoreCase(speciesNormalized)
                .map(s -> s.getId())
                .orElse(null);

        Integer stock = raw.stockQuantity();
        PartnerListingAvailability availability = PartnerListingAvailability.UNKNOWN;
        if (stock != null) {
            availability = stock > 0 ? PartnerListingAvailability.IN_STOCK : PartnerListingAvailability.OUT_OF_STOCK;
        }

        return new PartnerListingUpsertRequest(
                officialVendorId,
                clean(raw.externalId(), 180),
                clean(raw.title(), 180),
                clean(raw.description(), 2000),
                clean(raw.speciesNameRaw(), 180),
                speciesNormalized,
                speciesId,
                normalizePrice(raw.priceAmount()),
                normalizeCurrency(raw.currency()),
                stock,
                availability,
                normalizeImageUrl(raw.imageUrl()),
                clean(raw.productCanonicalUrl(), 600),
                clean(raw.country(), 80),
                clean(raw.state(), 80),
                clean(raw.city(), 80),
                Instant.now(),
                PartnerListingStatus.ACTIVE
        );
    }

    private String normalizeSpecies(String raw) {
        String cleaned = clean(raw, 180);
        if (cleaned == null) return null;
        String[] parts = cleaned.toLowerCase(Locale.ROOT).split("\\s+");
        if (parts.length == 0) return null;
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            String p = parts[i];
            if (p.isBlank()) continue;
            if (i == 0) {
                out.append(Character.toUpperCase(p.charAt(0))).append(p.substring(1));
            } else {
                out.append(' ').append(p);
            }
        }
        return out.toString();
    }

    private BigDecimal normalizePrice(BigDecimal raw) {
        if (raw == null) return null;
        if (raw.signum() < 0) return null;
        return raw.setScale(2, RoundingMode.HALF_UP);
    }

    private String normalizeCurrency(String raw) {
        String c = clean(raw, 8);
        if (c == null) return "USD";
        String up = c.toUpperCase(Locale.ROOT);
        return switch (up) {
            case "$", "US$", "USD" -> "USD";
            case "MX$", "MXN", "PESO", "PESOS" -> "MXN";
            case "CA$", "CAD" -> "CAD";
            default -> up;
        };
    }

    private String normalizeImageUrl(String raw) {
        String url = clean(raw, 600);
        if (url == null) return null;
        String lower = url.toLowerCase(Locale.ROOT);
        if (!(lower.startsWith("http://") || lower.startsWith("https://"))) {
            return null;
        }
        return url;
    }

    private String clean(String value, int maxLen) {
        if (value == null) return null;
        String out = value.trim().replaceAll("\\s+", " ");
        if (out.isEmpty()) return null;
        return out.length() > maxLen ? out.substring(0, maxLen) : out;
    }
}
