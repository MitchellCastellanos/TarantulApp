package com.tarantulapp.service.vendors.sync;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.PartnerListing;
import com.tarantulapp.entity.PartnerListingAvailability;
import com.tarantulapp.entity.PartnerListingStatus;
import com.tarantulapp.marketplace.MarketplaceListingCategories;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.OfficialVendorRepository;
import com.tarantulapp.repository.PartnerListingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
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

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PartnerListingUpsertResult upsert(PartnerListingUpsertRequest request) {
        validateRequired(request);
        OfficialVendor vendor = officialVendorRepository.findById(request.officialVendorId())
                .orElseThrow(() -> new NotFoundException("Vendor oficial no encontrado"));
        assertStrategicPartnerImportEnabled(vendor);

        String normalizedExternalId = cleanText(request.externalId(), 180);
        var existingOpt = partnerListingRepository
                .findByOfficialVendorIdAndExternalId(request.officialVendorId(), normalizedExternalId);
        boolean isNew = existingOpt.isEmpty();
        PartnerListing listing = existingOpt.orElseGet(PartnerListing::new);

        PartnerListingStatus previousStatus = listing.getStatus();
        ListingSnapshot before = isNew ? null : ListingSnapshot.capture(listing);

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
        listing.setListingCategory(MarketplaceListingCategories.normalizeOrDefault(request.listingCategory()));
        listing.setPromoted(request.promoted());

        PartnerListing saved = partnerListingRepository.save(listing);
        if (isNew) {
            return new PartnerListingUpsertResult(saved, PartnerListingUpsertChange.CREATED, null);
        }

        String changeDetail = buildChangeDetail(before, saved);
        if (changeDetail == null) {
            return new PartnerListingUpsertResult(saved, PartnerListingUpsertChange.UNCHANGED, null);
        }
        PartnerListingUpsertChange change = previousStatus == PartnerListingStatus.STALE
                && saved.getStatus() != PartnerListingStatus.STALE
                ? PartnerListingUpsertChange.RESTORED
                : PartnerListingUpsertChange.UPDATED;
        return new PartnerListingUpsertResult(saved, change, changeDetail);
    }

    private String buildChangeDetail(ListingSnapshot before, PartnerListing after) {
        if (before == null) {
            return null;
        }
        List<String> parts = new ArrayList<>();
        if (!Objects.equals(before.title(), after.getTitle())) {
            parts.add("titulo");
        }
        if (!Objects.equals(before.priceAmount(), after.getPriceAmount())
                || !Objects.equals(before.currency(), after.getCurrency())) {
            parts.add("precio " + formatPrice(before.priceAmount(), before.currency())
                    + " -> " + formatPrice(after.getPriceAmount(), after.getCurrency()));
        }
        if (!Objects.equals(before.stockQuantity(), after.getStockQuantity())) {
            parts.add("stock " + formatStock(before.stockQuantity()) + " -> " + formatStock(after.getStockQuantity()));
        }
        if (before.availability() != after.getAvailability()) {
            parts.add("disponibilidad " + before.availability() + " -> " + after.getAvailability());
        }
        if (before.status() != after.getStatus()) {
            parts.add("estado " + before.status() + " -> " + after.getStatus());
        }
        if (!Objects.equals(before.speciesNameRaw(), after.getSpeciesNameRaw())) {
            parts.add("especie");
        }
        return parts.isEmpty() ? null : String.join(", ", parts);
    }

    private String formatPrice(BigDecimal amount, String currency) {
        if (amount == null) {
            return "—";
        }
        String cur = currency == null || currency.isBlank() ? "USD" : currency;
        return cur + " " + amount.setScale(2, RoundingMode.HALF_UP);
    }

    private String formatStock(Integer stock) {
        return stock == null ? "?" : String.valueOf(stock);
    }

    private record ListingSnapshot(
            String title,
            BigDecimal priceAmount,
            String currency,
            Integer stockQuantity,
            PartnerListingAvailability availability,
            PartnerListingStatus status,
            String speciesNameRaw
    ) {
        static ListingSnapshot capture(PartnerListing listing) {
            return new ListingSnapshot(
                    listing.getTitle(),
                    listing.getPriceAmount(),
                    listing.getCurrency(),
                    listing.getStockQuantity(),
                    listing.getAvailability(),
                    listing.getStatus(),
                    listing.getSpeciesNameRaw()
            );
        }
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
        boolean tierOk = vendor.getPartnerProgramTier() != null && vendor.getPartnerProgramTier().isOfficialPartner();
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
