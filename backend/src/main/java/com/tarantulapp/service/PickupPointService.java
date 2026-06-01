package com.tarantulapp.service;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.OfficialVendorPickupPoint;
import com.tarantulapp.entity.PartnerListing;
import com.tarantulapp.entity.PartnerListingPickupPoint;
import com.tarantulapp.entity.PartnerListingStatus;
import com.tarantulapp.entity.PickupPoint;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.OfficialVendorPickupPointRepository;
import com.tarantulapp.repository.OfficialVendorRepository;
import com.tarantulapp.repository.PartnerListingPickupPointRepository;
import com.tarantulapp.repository.PartnerListingRepository;
import com.tarantulapp.repository.PickupPointRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class PickupPointService {

    public static final String FULFILLMENT_PICKUP_POINT = "pickup_point";
    public static final String FULFILLMENT_PARTNER_SITE = "partner_site";

    private final PickupPointRepository pickupPointRepository;
    private final OfficialVendorRepository officialVendorRepository;
    private final OfficialVendorPickupPointRepository vendorPickupPointRepository;
    private final PartnerListingRepository partnerListingRepository;
    private final PartnerListingPickupPointRepository listingPickupPointRepository;
    private final UserRepository userRepository;

    public PickupPointService(PickupPointRepository pickupPointRepository,
                              OfficialVendorRepository officialVendorRepository,
                              OfficialVendorPickupPointRepository vendorPickupPointRepository,
                              PartnerListingRepository partnerListingRepository,
                              PartnerListingPickupPointRepository listingPickupPointRepository,
                              UserRepository userRepository) {
        this.pickupPointRepository = pickupPointRepository;
        this.officialVendorRepository = officialVendorRepository;
        this.vendorPickupPointRepository = vendorPickupPointRepository;
        this.partnerListingRepository = partnerListingRepository;
        this.listingPickupPointRepository = listingPickupPointRepository;
        this.userRepository = userRepository;
    }

    public List<Map<String, Object>> adminListPickupPoints() {
        return pickupPointRepository.findAllByOrderByActiveDescCountryAscStateAscCityAscNameAsc()
                .stream().map(this::mapPickupPoint).toList();
    }

    @Transactional
    public Map<String, Object> adminCreatePickupPoint(Map<String, Object> req) {
        PickupPoint point = new PickupPoint();
        applyPickupPoint(point, req);
        return mapPickupPoint(pickupPointRepository.save(point));
    }

    @Transactional
    public Map<String, Object> adminUpdatePickupPoint(UUID id, Map<String, Object> req) {
        PickupPoint point = pickupPointRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Pickup point no encontrado"));
        applyPickupPoint(point, req);
        return mapPickupPoint(pickupPointRepository.save(point));
    }

    public Map<String, Object> adminVendorPickupConfig(UUID vendorId) {
        OfficialVendor vendor = officialVendorRepository.findById(vendorId)
                .orElseThrow(() -> new NotFoundException("Partner no encontrado"));
        List<OfficialVendorPickupPoint> assigned = vendorPickupPointRepository.findByOfficialVendorId(vendorId);
        Set<UUID> assignedIds = assigned.stream().map(OfficialVendorPickupPoint::getPickupPointId).collect(Collectors.toSet());
        UUID defaultId = assigned.stream()
                .filter(vp -> Boolean.TRUE.equals(vp.getDefaultForVendor()))
                .map(OfficialVendorPickupPoint::getPickupPointId)
                .findFirst().orElse(null);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("vendorId", vendor.getId());
        out.put("vendorName", vendor.getName());
        out.put("pickupAuthorized", vendorPickupAuthorized(vendor.getSlug()));
        out.put("assignedPickupPointIds", assignedIds.stream().map(UUID::toString).toList());
        out.put("defaultPickupPointId", defaultId == null ? null : defaultId.toString());
        out.put("pickupPoints", adminListPickupPoints());
        out.put("activeListings", adminVendorActiveListings(vendorId));
        return out;
    }

    public List<Map<String, Object>> adminVendorActiveListings(UUID vendorId) {
        return partnerListingRepository
                .findByOfficialVendorIdAndStatusInOrderByPromotedDescLastSyncedAtDesc(
                        vendorId, List.of(PartnerListingStatus.ACTIVE))
                .stream()
                .map(listing -> {
                    Map<String, Object> out = new LinkedHashMap<>();
                    out.put("id", listing.getId().toString());
                    out.put("externalId", listing.getExternalId());
                    out.put("title", listing.getTitle());
                    out.put("pickupPointIds", listingPickupPointRepository.findByPartnerListingId(listing.getId())
                            .stream().map(PartnerListingPickupPoint::getPickupPointId).map(UUID::toString).toList());
                    return out;
                })
                .toList();
    }

    @Transactional
    public Map<String, Object> adminSetVendorPickupPoints(UUID vendorId, Collection<UUID> pickupPointIds,
                                                           UUID defaultPickupPointId) {
        officialVendorRepository.findById(vendorId)
                .orElseThrow(() -> new NotFoundException("Partner no encontrado"));
        Set<UUID> next = pickupPointIds == null ? Set.of() : new HashSet<>(pickupPointIds);
        if (defaultPickupPointId != null && !next.contains(defaultPickupPointId)) {
            throw new IllegalArgumentException("DEFAULT_PICKUP_NOT_ASSIGNED");
        }
        Map<UUID, PickupPoint> points = pickupPointRepository.findAllById(next).stream()
                .collect(Collectors.toMap(PickupPoint::getId, Function.identity()));
        if (points.size() != next.size()) {
            throw new IllegalArgumentException("PICKUP_POINT_NOT_FOUND");
        }
        Map<UUID, OfficialVendorPickupPoint> existing = vendorPickupPointRepository.findByOfficialVendorId(vendorId)
                .stream().collect(Collectors.toMap(OfficialVendorPickupPoint::getPickupPointId, Function.identity()));
        for (OfficialVendorPickupPoint old : existing.values()) {
            if (!next.contains(old.getPickupPointId())) {
                old.setActive(false);
                old.setDefaultForVendor(false);
                vendorPickupPointRepository.save(old);
            }
        }
        for (UUID id : next) {
            OfficialVendorPickupPoint row = existing.getOrDefault(id, new OfficialVendorPickupPoint());
            row.setOfficialVendorId(vendorId);
            row.setPickupPointId(id);
            row.setActive(true);
            row.setDefaultForVendor(id.equals(defaultPickupPointId));
            vendorPickupPointRepository.save(row);
        }
        return adminVendorPickupConfig(vendorId);
    }

    @Transactional
    public Map<String, Object> adminSetListingPickupPoints(UUID listingId, Collection<UUID> pickupPointIds) {
        PartnerListing listing = partnerListingRepository.findById(listingId)
                .orElseThrow(() -> new NotFoundException("Listing partner no encontrado"));
        Set<UUID> requested = pickupPointIds == null ? Set.of() : new HashSet<>(pickupPointIds);
        Set<UUID> allowed = vendorPickupPointRepository.findByOfficialVendorIdAndActiveTrue(listing.getOfficialVendorId())
                .stream().map(OfficialVendorPickupPoint::getPickupPointId).collect(Collectors.toSet());
        if (!allowed.containsAll(requested)) {
            throw new IllegalArgumentException("LISTING_PICKUP_NOT_ASSIGNED_TO_VENDOR");
        }
        listingPickupPointRepository.deleteByPartnerListingId(listingId);
        for (UUID pickupPointId : requested) {
            PartnerListingPickupPoint row = new PartnerListingPickupPoint();
            row.setPartnerListingId(listingId);
            row.setPickupPointId(pickupPointId);
            listingPickupPointRepository.save(row);
        }
        return Map.of(
                "listingId", listingId.toString(),
                "pickupPointIds", requested.stream().map(UUID::toString).toList());
    }

    public Map<String, Object> fulfillmentOptions(String vendorSlug, List<String> externalProductIds) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("pickupAvailable", false);
        out.put("pickupPoints", List.of());
        if (vendorSlug == null || vendorSlug.isBlank() || externalProductIds == null || externalProductIds.isEmpty()) {
            return out;
        }
        OfficialVendor vendor = officialVendorRepository.findBySlug(vendorSlug.trim()).orElse(null);
        if (vendor == null || !vendorInCanada(vendor) || !vendorPickupAuthorized(vendor.getSlug())) {
            return out;
        }
        List<PartnerListing> listings = new ArrayList<>();
        for (String externalId : externalProductIds) {
            if (externalId == null || externalId.isBlank()) continue;
            PartnerListing listing = partnerListingRepository
                    .findByOfficialVendorIdAndExternalId(vendor.getId(), externalId.trim())
                    .orElse(null);
            if (listing == null || listing.getStatus() != PartnerListingStatus.ACTIVE) {
                return out;
            }
            listings.add(listing);
        }
        if (listings.isEmpty()) {
            return out;
        }
        List<Map<String, Object>> points = commonPickupPoints(vendor, listings).stream()
                .map(this::mapPublicPickupPoint).toList();
        out.put("pickupAvailable", !points.isEmpty());
        out.put("pickupPoints", points);
        return out;
    }

    public PickupSelection validatePickupSelection(OfficialVendor vendor, List<PartnerListing> listings, UUID pickupPointId) {
        if (vendor == null || pickupPointId == null || listings == null || listings.isEmpty()
                || !vendorInCanada(vendor) || !vendorPickupAuthorized(vendor.getSlug())) {
            throw new IllegalArgumentException("PICKUP_UNAVAILABLE");
        }
        return commonPickupPoints(vendor, listings).stream()
                .filter(p -> p.getId().equals(pickupPointId))
                .findFirst()
                .map(p -> new PickupSelection(p, pickupSnapshot(p), Instant.now().plus(p.getHoldDays(), ChronoUnit.DAYS)))
                .orElseThrow(() -> new IllegalArgumentException("PICKUP_UNAVAILABLE"));
    }

    public Map<String, Object> pickupSnapshot(PickupPoint point) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", point.getId().toString());
        out.put("name", point.getName());
        out.put("country", point.getCountry());
        out.put("state", point.getState());
        out.put("city", point.getCity());
        out.put("addressLine1", point.getAddressLine1());
        out.put("postalCode", point.getPostalCode());
        out.put("timezone", point.getTimezone());
        out.put("publicInstructions", point.getPublicInstructions());
        out.put("contactPhone", point.getContactPhone());
        out.put("contactEmail", point.getContactEmail());
        out.put("holdDays", point.getHoldDays());
        return out;
    }

    private List<PickupPoint> commonPickupPoints(OfficialVendor vendor, List<PartnerListing> listings) {
        Set<UUID> vendorPointIds = vendorPickupPointRepository.findByOfficialVendorIdAndActiveTrue(vendor.getId())
                .stream().map(OfficialVendorPickupPoint::getPickupPointId).collect(Collectors.toSet());
        if (vendorPointIds.isEmpty()) {
            return List.of();
        }
        Set<UUID> common = null;
        for (PartnerListing listing : listings) {
            Set<UUID> listingIds = listingPickupPointRepository.findByPartnerListingId(listing.getId())
                    .stream().map(PartnerListingPickupPoint::getPickupPointId).collect(Collectors.toSet());
            listingIds.retainAll(vendorPointIds);
            common = common == null ? listingIds : intersect(common, listingIds);
            if (common.isEmpty()) {
                return List.of();
            }
        }
        Set<UUID> allowed = common == null ? Set.of() : common;
        return pickupPointRepository.findAllById(allowed).stream()
                .filter(p -> Boolean.TRUE.equals(p.getActive()))
                .toList();
    }

    private boolean vendorPickupAuthorized(String vendorSlug) {
        if (vendorSlug == null || vendorSlug.isBlank()) {
            return false;
        }
        return userRepository.findByPublicHandleIgnoreCase(vendorSlug.trim())
                .map(User::getPickupAuthorizedAt)
                .filter(Objects::nonNull)
                .isPresent();
    }

    private boolean vendorInCanada(OfficialVendor vendor) {
        String country = vendor.getCountry();
        return country != null && ("canada".equalsIgnoreCase(country.trim()) || "ca".equalsIgnoreCase(country.trim()));
    }

    private Set<UUID> intersect(Set<UUID> a, Set<UUID> b) {
        Set<UUID> out = new HashSet<>(a);
        out.retainAll(b);
        return out;
    }

    private void applyPickupPoint(PickupPoint point, Map<String, Object> req) {
        if (req == null) {
            throw new IllegalArgumentException("PICKUP_POINT_REQUIRED");
        }
        if (req.containsKey("name")) point.setName(string(req.get("name")));
        if (req.containsKey("country")) point.setCountry(defaultString(req.get("country"), "Canada"));
        if (req.containsKey("state")) point.setState(string(req.get("state")));
        if (req.containsKey("city")) point.setCity(string(req.get("city")));
        if (req.containsKey("addressLine1")) point.setAddressLine1(string(req.get("addressLine1")));
        if (req.containsKey("postalCode")) point.setPostalCode(string(req.get("postalCode")));
        if (req.containsKey("timezone")) point.setTimezone(defaultString(req.get("timezone"), "America/Toronto"));
        if (req.containsKey("publicInstructions")) point.setPublicInstructions(string(req.get("publicInstructions")));
        if (req.containsKey("contactPhone")) point.setContactPhone(string(req.get("contactPhone")));
        if (req.containsKey("contactEmail")) point.setContactEmail(string(req.get("contactEmail")));
        if (req.containsKey("adminNotes")) point.setAdminNotes(string(req.get("adminNotes")));
        if (req.containsKey("holdDays")) point.setHoldDays(Math.max(1, Math.min(30, number(req.get("holdDays"), 3))));
        if (req.containsKey("active")) point.setActive(Boolean.TRUE.equals(req.get("active")));
        if (point.getName() == null || point.getName().isBlank()) {
            throw new IllegalArgumentException("PICKUP_NAME_REQUIRED");
        }
        if (point.getCity() == null || point.getCity().isBlank()) {
            throw new IllegalArgumentException("PICKUP_CITY_REQUIRED");
        }
    }

    private Map<String, Object> mapPickupPoint(PickupPoint p) {
        Map<String, Object> out = mapPublicPickupPoint(p);
        out.put("active", p.getActive());
        out.put("adminNotes", p.getAdminNotes());
        out.put("createdAt", p.getCreatedAt());
        out.put("updatedAt", p.getUpdatedAt());
        return out;
    }

    private Map<String, Object> mapPublicPickupPoint(PickupPoint p) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", p.getId().toString());
        out.put("name", p.getName());
        out.put("country", p.getCountry());
        out.put("state", p.getState());
        out.put("city", p.getCity());
        out.put("addressLine1", p.getAddressLine1());
        out.put("postalCode", p.getPostalCode());
        out.put("timezone", p.getTimezone());
        out.put("publicInstructions", p.getPublicInstructions());
        out.put("contactPhone", p.getContactPhone());
        out.put("contactEmail", p.getContactEmail());
        out.put("holdDays", p.getHoldDays());
        return out;
    }

    private String string(Object v) {
        if (v == null) return null;
        String s = String.valueOf(v).trim();
        return s.isEmpty() ? null : s;
    }

    private String defaultString(Object v, String fallback) {
        String s = string(v);
        return s == null ? fallback : s;
    }

    private int number(Object v, int fallback) {
        if (v instanceof Number n) return n.intValue();
        try {
            return v == null ? fallback : Integer.parseInt(String.valueOf(v));
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    public record PickupSelection(PickupPoint point, Map<String, Object> snapshot, Instant holdUntil) {}
}
