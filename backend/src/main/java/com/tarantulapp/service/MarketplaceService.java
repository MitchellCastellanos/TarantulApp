package com.tarantulapp.service;

import com.tarantulapp.entity.MarketplaceListing;
import com.tarantulapp.entity.SellerReview;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.MarketplaceListingRepository;
import com.tarantulapp.repository.SellerReviewRepository;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.repository.FeedingLogRepository;
import com.tarantulapp.repository.MoltLogRepository;
import com.tarantulapp.repository.BehaviorLogRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import com.tarantulapp.util.FileStorageService;
import com.tarantulapp.util.PublicHandleRules;

@Service
public class MarketplaceService {

    private final MarketplaceListingRepository marketplaceListingRepository;
    private final SellerReviewRepository sellerReviewRepository;
    private final UserRepository userRepository;
    private final TarantulaRepository tarantulaRepository;
    private final FeedingLogRepository feedingLogRepository;
    private final MoltLogRepository moltLogRepository;
    private final BehaviorLogRepository behaviorLogRepository;
    private final FileStorageService fileStorageService;

    public MarketplaceService(MarketplaceListingRepository marketplaceListingRepository,
                              SellerReviewRepository sellerReviewRepository,
                              UserRepository userRepository,
                              TarantulaRepository tarantulaRepository,
                              FeedingLogRepository feedingLogRepository,
                              MoltLogRepository moltLogRepository,
                              BehaviorLogRepository behaviorLogRepository,
                              FileStorageService fileStorageService) {
        this.marketplaceListingRepository = marketplaceListingRepository;
        this.sellerReviewRepository = sellerReviewRepository;
        this.userRepository = userRepository;
        this.tarantulaRepository = tarantulaRepository;
        this.feedingLogRepository = feedingLogRepository;
        this.moltLogRepository = moltLogRepository;
        this.behaviorLogRepository = behaviorLogRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    public Map<String, Object> upsertMyProfile(UUID userId, String displayName, String handle, String bio, String location,
                                               String featuredCollection, String contactWhatsapp,
                                               String contactInstagram, String country, String state, String city) {
        User profile = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        String normalizedHandle = normalizeHandle(handle);
        if (normalizedHandle != null
                && userRepository.existsByPublicHandleIgnoreCaseAndIdNot(normalizedHandle, userId)) {
            throw new IllegalArgumentException("El handle ya esta en uso");
        }
        profile.setDisplayName(cleanText(displayName, 100));
        profile.setPublicHandle(normalizedHandle);
        profile.setBio(cleanText(bio, 500));
        profile.setLocation(cleanText(location, 140));
        profile.setFeaturedCollection(cleanText(featuredCollection, 180));
        profile.setContactWhatsapp(cleanText(contactWhatsapp, 80));
        profile.setContactInstagram(cleanText(contactInstagram, 80));
        profile.setProfileCountry(cleanText(country, 80));
        profile.setProfileState(cleanText(state, 80));
        profile.setProfileCity(cleanText(city, 80));
        return mapUserProfile(userRepository.save(profile));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMyProfile(UUID userId) {
        User profile = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        Map<String, Object> out = mapUserProfile(profile);
        out.put("badges", computeBadges(userId));
        out.put("badgesProgress", computeBadgeProgress(userId));
        out.put("reputation", computeReputation(userId));
        return out;
    }

    @Transactional
    public Map<String, Object> createListing(UUID userId, String title, String description, String speciesName,
                                             String stage, String sex, BigDecimal priceAmount, String currency,
                                             String city, String state, String country, String imageUrl, String pedigreeRef) {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Titulo requerido");
        }
        MarketplaceListing listing = new MarketplaceListing();
        listing.setSellerUserId(userId);
        listing.setTitle(cleanText(title, 140));
        listing.setDescription(cleanText(description, 1000));
        listing.setSpeciesName(cleanText(speciesName, 140));
        listing.setStage(cleanText(stage, 30));
        listing.setSex(cleanText(sex, 20));
        listing.setPriceAmount(priceAmount == null ? null : priceAmount.setScale(2, RoundingMode.HALF_UP));
        listing.setCurrency(cleanCurrency(currency));
        listing.setCity(cleanText(city, 80));
        listing.setState(cleanText(state, 80));
        listing.setCountry(cleanText(country, 80));
        listing.setImageUrl(cleanText(imageUrl, 350));
        listing.setPedigreeRef(cleanText(pedigreeRef, 180));
        listing.setStatus("active");
        return mapListing(marketplaceListingRepository.save(listing));
    }

    @Transactional
    public Map<String, Object> updateListingStatus(UUID listingId, UUID userId, String status) {
        MarketplaceListing listing = marketplaceListingRepository.findById(listingId)
                .orElseThrow(() -> new NotFoundException("Listing no encontrado"));
        if (!listing.getSellerUserId().equals(userId)) {
            throw new AccessDeniedException("No puedes editar este listing");
        }
        String next = normalizeStatus(status);
        if (next == null) throw new IllegalArgumentException("Status invalido");
        listing.setStatus(next);
        return mapListing(marketplaceListingRepository.save(listing));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> myListings(UUID userId) {
        return marketplaceListingRepository.findTop100BySellerUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::mapListing).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> publicListings(String q, String status,
                                                    String country, String state, String city,
                                                    String nearCountry, String nearState, String nearCity) {
        String normalizedStatus = normalizeStatus(status);
        if (normalizedStatus == null || "hidden".equals(normalizedStatus)) {
            normalizedStatus = "active";
        }
        List<MarketplaceListing> byTitle;
        if (q == null || q.trim().isEmpty()) {
            byTitle = marketplaceListingRepository.findTop100ByStatusOrderByCreatedAtDesc(normalizedStatus);
        } else {
            String query = q.trim();
            byTitle = new ArrayList<>(marketplaceListingRepository
                    .findTop100ByStatusAndTitleContainingIgnoreCaseOrderByCreatedAtDesc(normalizedStatus, query));
            byTitle.addAll(marketplaceListingRepository
                    .findTop100ByStatusAndSpeciesNameContainingIgnoreCaseOrderByCreatedAtDesc(normalizedStatus, query));
        }
        final String filterCountry = normalizeFilter(country);
        final String filterState = normalizeFilter(state);
        final String filterCity = normalizeFilter(city);
        final String nearCountryNorm = normalizeFilter(nearCountry);
        final String nearStateNorm = normalizeFilter(nearState);
        final String nearCityNorm = normalizeFilter(nearCity);

        return byTitle.stream()
                .collect(Collectors.toMap(MarketplaceListing::getId, m -> m, (a, b) -> a, LinkedHashMap::new))
                .values()
                .stream()
                .filter(m -> filterCountry == null || normalizeFilter(m.getCountry()).equals(filterCountry))
                .filter(m -> filterState == null || normalizeFilter(m.getState()).equals(filterState))
                .filter(m -> filterCity == null || normalizeFilter(m.getCity()).equals(filterCity))
                .sorted((a, b) -> Integer.compare(
                        proximityScore(b, nearCountryNorm, nearStateNorm, nearCityNorm),
                        proximityScore(a, nearCountryNorm, nearStateNorm, nearCityNorm)
                ))
                .limit(100)
                .map(this::mapListing)
                .collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> addReview(UUID sellerUserId, UUID reviewerUserId, UUID listingId, Integer rating, String comment) {
        if (sellerUserId.equals(reviewerUserId)) {
            throw new IllegalArgumentException("No puedes calificarte a ti mismo");
        }
        if (rating == null || rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating invalido");
        }
        userRepository.findById(sellerUserId).orElseThrow(() -> new NotFoundException("Seller no encontrado"));
        if (sellerReviewRepository.existsBySellerUserIdAndReviewerUserId(sellerUserId, reviewerUserId)) {
            throw new IllegalArgumentException("Ya dejaste una review a este seller");
        }
        SellerReview review = new SellerReview();
        review.setSellerUserId(sellerUserId);
        review.setReviewerUserId(reviewerUserId);
        review.setListingId(listingId);
        review.setRating(rating.shortValue());
        review.setComment(cleanText(comment, 500));
        return mapReview(sellerReviewRepository.save(review));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> sellerReviews(UUID sellerUserId) {
        return sellerReviewRepository.findTop50BySellerUserIdOrderByCreatedAtDesc(sellerUserId)
                .stream().map(this::mapReview).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> publicSellerProfile(UUID sellerUserId) {
        User user = userRepository.findById(sellerUserId).orElseThrow(() -> new NotFoundException("Keeper no encontrado"));
        Double avgRaw = sellerReviewRepository.avgRatingBySellerUserId(sellerUserId);
        double avg = avgRaw == null ? 0d : Math.round(avgRaw * 10.0) / 10.0;
        long reviewsCount = sellerReviewRepository.countBySellerUserId(sellerUserId);
        List<Map<String, Object>> activeListings = marketplaceListingRepository
                .findTop100BySellerUserIdOrderByCreatedAtDesc(sellerUserId)
                .stream()
                .filter(m -> "active".equalsIgnoreCase(m.getStatus()))
                .limit(20)
                .map(this::mapListing)
                .collect(Collectors.toList());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("userId", user.getId());
        out.put("displayName", user.getDisplayName() == null || user.getDisplayName().isBlank() ? user.getEmail() : user.getDisplayName());
        out.put("profile", mapUserProfile(user));
        out.put("badges", computeBadges(sellerUserId));
        out.put("badgesProgress", computeBadgeProgress(sellerUserId));
        out.put("reputation", computeReputation(sellerUserId));
        out.put("ratingAvg", avg);
        out.put("reviewsCount", reviewsCount);
        out.put("activeListings", activeListings);
        return out;
    }

    @Transactional
    public void registerQrPrintExport(UUID userId) {
        userRepository.findById(userId).ifPresent(u -> {
            int current = u.getQrPrintExports() == null ? 0 : u.getQrPrintExports();
            u.setQrPrintExports(current + 1);
            userRepository.save(u);
        });
    }

    @Transactional
    public Map<String, Object> uploadProfilePhoto(UUID userId, MultipartFile file) throws IOException {
        User user = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        String path = fileStorageService.saveFile(file, "keepers/" + userId);
        user.setProfilePhoto(path);
        userRepository.save(user);
        Map<String, Object> out = mapUserProfile(user);
        out.put("badges", computeBadges(userId));
        out.put("badgesProgress", computeBadgeProgress(userId));
        out.put("reputation", computeReputation(userId));
        return out;
    }

    private Map<String, Object> mapListing(MarketplaceListing l) {
        User seller = userRepository.findById(l.getSellerUserId()).orElse(null);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", l.getId());
        out.put("sellerUserId", l.getSellerUserId());
        out.put("sellerName", seller == null ? "Keeper" : (seller.getDisplayName() == null || seller.getDisplayName().isBlank() ? seller.getEmail() : seller.getDisplayName()));
        out.put("title", l.getTitle());
        out.put("description", l.getDescription() == null ? "" : l.getDescription());
        out.put("speciesName", l.getSpeciesName() == null ? "" : l.getSpeciesName());
        out.put("stage", l.getStage() == null ? "" : l.getStage());
        out.put("sex", l.getSex() == null ? "" : l.getSex());
        out.put("priceAmount", l.getPriceAmount());
        out.put("currency", l.getCurrency());
        out.put("status", l.getStatus());
        out.put("city", l.getCity() == null ? "" : l.getCity());
        out.put("state", l.getState() == null ? "" : l.getState());
        out.put("country", l.getCountry() == null ? "" : l.getCountry());
        out.put("imageUrl", l.getImageUrl() == null ? "" : l.getImageUrl());
        out.put("pedigreeRef", l.getPedigreeRef() == null ? "" : l.getPedigreeRef());
        out.put("createdAt", l.getCreatedAt());
        return out;
    }

    private Map<String, Object> mapUserProfile(User p) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("userId", p.getId());
        out.put("displayName", p.getDisplayName() == null ? "" : p.getDisplayName());
        out.put("handle", p.getPublicHandle() == null ? "" : p.getPublicHandle());
        out.put("bio", p.getBio() == null ? "" : p.getBio());
        out.put("location", p.getLocation() == null ? "" : p.getLocation());
        out.put("featuredCollection", p.getFeaturedCollection() == null ? "" : p.getFeaturedCollection());
        out.put("contactWhatsapp", p.getContactWhatsapp() == null ? "" : p.getContactWhatsapp());
        out.put("contactInstagram", p.getContactInstagram() == null ? "" : p.getContactInstagram());
        out.put("country", p.getProfileCountry() == null ? "" : p.getProfileCountry());
        out.put("state", p.getProfileState() == null ? "" : p.getProfileState());
        out.put("city", p.getProfileCity() == null ? "" : p.getProfileCity());
        out.put("profilePhoto", p.getProfilePhoto() == null ? "" : p.getProfilePhoto());
        return out;
    }

    private List<Map<String, Object>> computeBadges(UUID userId) {
        long total = tarantulaRepository.countByUserId(userId);
        long species = tarantulaRepository.countDistinctSpeciesByUserId(userId);
        long feeding = feedingLogRepository.countByOwnerUserId(userId);
        long molts = moltLogRepository.countByOwnerUserId(userId);
        long behavior = behaviorLogRepository.countByOwnerUserId(userId);
        long events = feeding + molts + behavior;
        int qrPrints = userRepository.findById(userId).map(u -> u.getQrPrintExports() == null ? 0 : u.getQrPrintExports()).orElse(0);
        List<Map<String, Object>> badges = new ArrayList<>();
        if (total >= 1) badges.add(Map.of("key", "starter_keeper", "label", "Starter keeper"));
        if (total >= 10) badges.add(Map.of("key", "collection_10", "label", "Coleccion 10+"));
        if (total >= 25) badges.add(Map.of("key", "collection_25", "label", "Coleccion 25+"));
        if (species >= 5) badges.add(Map.of("key", "species_5", "label", "Diversidad 5+ especies"));
        if (species >= 12) badges.add(Map.of("key", "species_12", "label", "Diversidad 12+ especies"));
        if (events >= 30) badges.add(Map.of("key", "logger_30", "label", "Bitacora activa (30+ eventos)"));
        if (events >= 100) badges.add(Map.of("key", "logger_100", "label", "Maestro del registro (100+ eventos)"));
        if (qrPrints >= 1) badges.add(Map.of("key", "qr_printed", "label", "Terrario etiquetado (QR impreso)"));
        if (qrPrints >= 10) badges.add(Map.of("key", "qr_printed_10", "label", "Etiquetador pro (10+ impresiones QR)"));
        return badges;
    }

    private Map<String, Object> computeBadgeProgress(UUID userId) {
        long total = tarantulaRepository.countByUserId(userId);
        long species = tarantulaRepository.countDistinctSpeciesByUserId(userId);
        long events = feedingLogRepository.countByOwnerUserId(userId)
                + moltLogRepository.countByOwnerUserId(userId)
                + behaviorLogRepository.countByOwnerUserId(userId);
        int qrPrints = userRepository.findById(userId).map(u -> u.getQrPrintExports() == null ? 0 : u.getQrPrintExports()).orElse(0);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("collectionNext", progressMetric(total, 10, 25, "Coleccion 10+", "Coleccion 25+"));
        out.put("speciesNext", progressMetric(species, 5, 12, "Diversidad 5+ especies", "Diversidad 12+ especies"));
        out.put("eventsNext", progressMetric(events, 30, 100, "Bitacora activa", "Maestro del registro"));
        out.put("qrNext", progressMetric(qrPrints, 1, 10, "QR impreso", "Etiquetador pro"));
        return out;
    }

    private Map<String, Object> progressMetric(long value, int tier1, int tier2, String label1, String label2) {
        Map<String, Object> m = new LinkedHashMap<>();
        if (value < tier1) {
            m.put("current", value);
            m.put("target", tier1);
            m.put("nextLabel", label1);
            return m;
        }
        if (value < tier2) {
            m.put("current", value);
            m.put("target", tier2);
            m.put("nextLabel", label2);
            return m;
        }
        m.put("current", value);
        m.put("target", value);
        m.put("nextLabel", "Max");
        return m;
    }

    private Map<String, Object> computeReputation(UUID userId) {
        long total = tarantulaRepository.countByUserId(userId);
        long species = tarantulaRepository.countDistinctSpeciesByUserId(userId);
        long events = feedingLogRepository.countByOwnerUserId(userId)
                + moltLogRepository.countByOwnerUserId(userId)
                + behaviorLogRepository.countByOwnerUserId(userId);
        int qrPrints = userRepository.findById(userId).map(u -> u.getQrPrintExports() == null ? 0 : u.getQrPrintExports()).orElse(0);
        double reviewsAvg = sellerReviewRepository.avgRatingBySellerUserId(userId) == null ? 0 : sellerReviewRepository.avgRatingBySellerUserId(userId);
        long reviewsCount = sellerReviewRepository.countBySellerUserId(userId);
        int score = (int) Math.min(100, total * 2 + species * 3 + Math.min(30, events / 5) + qrPrints * 2 + Math.round(reviewsAvg * Math.min(10, reviewsCount)));

        String tier;
        if (score >= 70) tier = "Gold";
        else if (score >= 35) tier = "Silver";
        else tier = "Bronze";

        Map<String, Object> out = new HashMap<>();
        out.put("score", score);
        out.put("tier", tier);
        out.put("nextTier", "Bronze".equals(tier) ? "Silver" : ("Silver".equals(tier) ? "Gold" : "Max"));
        out.put("nextTierTarget", "Bronze".equals(tier) ? 35 : ("Silver".equals(tier) ? 70 : 100));
        return out;
    }

    private String normalizeFilter(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim().toLowerCase();
    }

    private int proximityScore(MarketplaceListing listing, String country, String state, String city) {
        int score = 0;
        String lCountry = normalizeFilter(listing.getCountry());
        String lState = normalizeFilter(listing.getState());
        String lCity = normalizeFilter(listing.getCity());
        if (country != null && country.equals(lCountry)) score += 3;
        if (state != null && state.equals(lState)) score += 5;
        if (city != null && city.equals(lCity)) score += 8;
        return score;
    }

    private Map<String, Object> mapReview(SellerReview r) {
        User reviewer = r.getReviewerUserId() == null ? null : userRepository.findById(r.getReviewerUserId()).orElse(null);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", r.getId());
        out.put("sellerUserId", r.getSellerUserId());
        out.put("reviewerUserId", r.getReviewerUserId());
        out.put("reviewerName", reviewer == null ? "Keeper" : (reviewer.getDisplayName() == null || reviewer.getDisplayName().isBlank() ? reviewer.getEmail() : reviewer.getDisplayName()));
        out.put("listingId", r.getListingId());
        out.put("rating", r.getRating());
        out.put("comment", r.getComment() == null ? "" : r.getComment());
        out.put("createdAt", r.getCreatedAt());
        return out;
    }

    private String cleanText(String value, int maxLen) {
        if (value == null) return null;
        String out = value.trim().replaceAll("\\s+", " ");
        if (out.isEmpty()) return null;
        return out.length() > maxLen ? out.substring(0, maxLen) : out;
    }

    private String normalizeHandle(String raw) {
        return PublicHandleRules.normalize(raw);
    }

    private String cleanCurrency(String raw) {
        if (raw == null || raw.isBlank()) return "MXN";
        String out = raw.trim().toUpperCase();
        if (out.length() > 8) out = out.substring(0, 8);
        return out;
    }

    private String normalizeStatus(String raw) {
        if (raw == null || raw.isBlank()) return "active";
        String s = raw.trim().toLowerCase();
        if ("active".equals(s) || "sold".equals(s) || "hidden".equals(s)) return s;
        return null;
    }
}
