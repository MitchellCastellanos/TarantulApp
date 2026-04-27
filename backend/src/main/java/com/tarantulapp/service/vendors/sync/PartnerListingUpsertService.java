package com.tarantulapp.service.vendors.sync;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.PartnerListing;
import com.tarantulapp.entity.PartnerListingAvailability;
import com.tarantulapp.entity.PartnerListingStatus;
import com.tarantulapp.entity.PartnerProgramTier;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.OfficialVendorRepository;
import com.tarantulapp.repository.PartnerListingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Objects;

@Service
public class PartnerListingUpsertService {

    private final OfficialVendorRepository officialVendorRepository;
    private final PartnerListingRepository partnerListingRepository;

    public PartnerListingUpsertService(OfficialVendorRepository officialVendorRepository,
                                       PartnerListingRepository partnerListingRepository) {
        this.officialVendorRepository = officialVendorRepository;
        this.partnerListingRepository = partnerListingRepository;
    }

    @Transactional
    public PartnerListing upsert(PartnerListingUpsertRequest request) {
        validateRequired(request);
        OfficialVendor vendor = officialVendorRepository.findById(request.officialVendorId())
                .orElseThrow(() -> new NotFoundException("Vendor oficial no encontrado"));
        assertStrategicPartnerImportEnabled(vendor);

        String normalizedExternalId = cleanText(request.externalId(), 180);
        PartnerListing listing = partnerListingRepository
                .findByOfficialVendorIdAndExternalId(request.officialVendorId(), normalizedExternalId)
                .orElseGet(PartnerListing::new);

        listing.setOfficialVendorId(request.officialVendorId());
        listing.setExternalId(normalizedExternalId);
        listing.setTitle(cleanText(request.title(), 180));
        listing.setDescription(cleanText(request.description(), 2000));
        listing.setSpeciesNameRaw(cleanText(request.speciesNameRaw(), 180));
        listing.setSpeciesNormalized(cleanText(request.speciesNormalized(), 180));
        listing.setSpeciesId(request.speciesId());
        listing.setPriceAmount(cleanPrice(request.priceAmount()));
        listing.setCurrency(cleanCurrency(request.currency()));
        listing.setStockQuantity(request.stockQuantity());
        listing.setAvailability(request.availability() == null ? PartnerListingAvailability.UNKNOWN : request.availability());
        listing.setImageUrl(cleanText(request.imageUrl(), 600));
        listing.setProductCanonicalUrl(cleanText(request.productCanonicalUrl(), 600));
        listing.setCountry(cleanText(request.country(), 80));
        listing.setState(cleanText(request.state(), 80));
        listing.setCity(cleanText(request.city(), 80));
        listing.setLastSyncedAt(request.lastSyncedAt() == null ? Instant.now() : request.lastSyncedAt());
        listing.setStatus(request.status() == null ? PartnerListingStatus.ACTIVE : request.status());
        return partnerListingRepository.save(listing);
    }

    private void validateRequired(PartnerListingUpsertRequest request) {
        if (request == null) throw new IllegalArgumentException("Request requerido");
        if (request.officialVendorId() == null) throw new IllegalArgumentException("officialVendorId requerido");
        if (cleanText(request.externalId(), 180) == null) throw new IllegalArgumentException("externalId requerido");
        if (cleanText(request.title(), 180) == null) throw new IllegalArgumentException("title requerido");
        if (cleanText(request.productCanonicalUrl(), 600) == null) {
            throw new IllegalArgumentException("productCanonicalUrl requerido");
        }
    }

    private void assertStrategicPartnerImportEnabled(OfficialVendor vendor) {
        boolean importEnabled = Boolean.TRUE.equals(vendor.getListingImportEnabled());
        boolean tierOk = Objects.equals(vendor.getPartnerProgramTier(), PartnerProgramTier.STRATEGIC_FOUNDER)
                || Objects.equals(vendor.getPartnerProgramTier(), PartnerProgramTier.STRATEGIC_PARTNER);
        if (!importEnabled || !tierOk) {
            throw new IllegalArgumentException("El vendor no esta habilitado para import estrategico");
        }
    }

    private String cleanText(String value, int maxLen) {
        if (value == null) return null;
        String out = value.trim().replaceAll("\\s+", " ");
        if (out.isEmpty()) return null;
        return out.length() > maxLen ? out.substring(0, maxLen) : out;
    }

    private BigDecimal cleanPrice(BigDecimal raw) {
        if (raw == null) return null;
        return raw.setScale(2, RoundingMode.HALF_UP);
    }

    private String cleanCurrency(String raw) {
        if (raw == null || raw.isBlank()) return "USD";
        String out = raw.trim().toUpperCase();
        if (out.length() > 8) out = out.substring(0, 8);
        return out;
    }
}
