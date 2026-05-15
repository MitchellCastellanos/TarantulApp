package com.tarantulapp.service;

import com.tarantulapp.entity.MarketplaceListing;
import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.PartnerListing;
import com.tarantulapp.entity.PartnerListingStatus;
import com.tarantulapp.entity.PartnerProgramTier;
import com.tarantulapp.entity.SellerReview;
import com.tarantulapp.entity.User;
import com.tarantulapp.entity.UserPlan;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.MarketplaceListingRepository;
import com.tarantulapp.repository.OfficialVendorRepository;
import com.tarantulapp.repository.PartnerListingRepository;
import com.tarantulapp.repository.SellerReviewRepository;
import com.tarantulapp.repository.TarantulaSpoodRepository;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.repository.FeedingLogRepository;
import com.tarantulapp.repository.MoltLogRepository;
import com.tarantulapp.repository.BehaviorLogRepository;
import com.tarantulapp.repository.ChatMessageRepository;
import com.tarantulapp.repository.ChatThreadRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Comparator;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.regex.Pattern;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import com.tarantulapp.marketplace.MarketplaceListingCategories;
import com.tarantulapp.util.FileStorageService;
import com.tarantulapp.util.PublicHandleRules;

@Service
public class MarketplaceService {
    private static final Pattern ISO_COUNTRY = Pattern.compile("[A-Z]{2}");
    private static final int FREE_ACTIVE_LISTING_LIMIT = 5;
    private static final int PRO_ACTIVE_LISTING_LIMIT = 25;
    private static final int VENDOR_ACTIVE_LISTING_LIMIT = 250;
    private static final BigDecimal COMMISSION_RATE_COMMUNITY = new BigDecimal("0.10");
    private static final BigDecimal COMMISSION_RATE_PRO = new BigDecimal("0.08");
    private static final BigDecimal COMMISSION_RATE_VENDOR = new BigDecimal("0.06");
    private static final int PAYOUT_HOLD_DAYS = 3;

    private static final long MIN_MESSAGES_TO_ENABLE_REVIEW = 6L;
    private static final long MIN_MESSAGES_PER_PARTICIPANT = 2L;

    /** Official vendors whose partner listings appear in the public marketplace feed. */
    private static final List<PartnerProgramTier> STRATEGIC_PARTNER_FEED_TIERS = List.of(
            PartnerProgramTier.STRATEGIC_FOUNDER,
            PartnerProgramTier.STRATEGIC_PARTNER);
    private final MarketplaceListingRepository marketplaceListingRepository;
    private final PartnerListingRepository partnerListingRepository;
    private final OfficialVendorRepository officialVendorRepository;
    private final SellerReviewRepository sellerReviewRepository;
    private final TarantulaSpoodRepository tarantulaSpoodRepository;
    private final UserRepository userRepository;
    private final TarantulaRepository tarantulaRepository;
    private final FeedingLogRepository feedingLogRepository;
    private final MoltLogRepository moltLogRepository;
    private final BehaviorLogRepository behaviorLogRepository;
    private final ChatThreadRepository chatThreadRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final FileStorageService fileStorageService;
    private final BillingService billingService;
    private final KeeperRankCalculator keeperRankCalculator;
    @Value("${app.marketplace.partner-feed.hard-cap:50}")
    private int partnerFeedHardCap = 50;
    @Value("${app.marketplace.partner-feed.share.bootstrap-under-10:0.60}")
    private double partnerShareBootstrapUnder10 = 0.60d;
    @Value("${app.marketplace.partner-feed.share.warm-under-25:0.40}")
    private double partnerShareWarmUnder25 = 0.40d;
    @Value("${app.marketplace.partner-feed.share.growth-under-60:0.25}")
    private double partnerShareGrowthUnder60 = 0.25d;
    @Value("${app.marketplace.partner-feed.share.steady-60-plus:0.15}")
    private double partnerShareSteady60Plus = 0.15d;

    public MarketplaceService(MarketplaceListingRepository marketplaceListingRepository,
                              PartnerListingRepository partnerListingRepository,
                              OfficialVendorRepository officialVendorRepository,
                              SellerReviewRepository sellerReviewRepository,
                              TarantulaSpoodRepository tarantulaSpoodRepository,
                              UserRepository userRepository,
                              TarantulaRepository tarantulaRepository,
                              FeedingLogRepository feedingLogRepository,
                              MoltLogRepository moltLogRepository,
                              BehaviorLogRepository behaviorLogRepository,
                              ChatThreadRepository chatThreadRepository,
                              ChatMessageRepository chatMessageRepository,
                              FileStorageService fileStorageService,
                              BillingService billingService,
                              KeeperRankCalculator keeperRankCalculator) {
        this.marketplaceListingRepository = marketplaceListingRepository;
        this.partnerListingRepository = partnerListingRepository;
        this.officialVendorRepository = officialVendorRepository;
        this.sellerReviewRepository = sellerReviewRepository;
        this.tarantulaSpoodRepository = tarantulaSpoodRepository;
        this.userRepository = userRepository;
        this.tarantulaRepository = tarantulaRepository;
        this.feedingLogRepository = feedingLogRepository;
        this.moltLogRepository = moltLogRepository;
        this.behaviorLogRepository = behaviorLogRepository;
        this.chatThreadRepository = chatThreadRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.fileStorageService = fileStorageService;
        this.billingService = billingService;
        this.keeperRankCalculator = keeperRankCalculator;
    }

    @Transactional
    public Map<String, Object> upsertMyProfile(UUID userId, String displayName, String handle, String bio, String location,
                                               String featuredCollection, String contactWhatsapp,
                                               String contactInstagram, String country, String state, String city,
                                               Boolean searchVisible, String communityProfileVisibility,
                                               String storefrontName, String storefrontTagline,
                                               String storefrontShippingPolicy, String storefrontLagPolicy) {
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
        profile.setSearchVisible(searchVisible == null ? Boolean.TRUE : searchVisible);
        profile.setCommunityProfileVisibility(normalizeCommunityProfileVisibility(communityProfileVisibility));
        profile.setStorefrontName(cleanText(storefrontName, 120));
        profile.setStorefrontTagline(cleanText(storefrontTagline, 180));
        profile.setStorefrontShippingPolicy(cleanText(storefrontShippingPolicy, 1000));
        profile.setStorefrontLagPolicy(cleanText(storefrontLagPolicy, 1000));
        return mapUserProfile(userRepository.save(profile));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMyProfile(UUID userId) {
        User profile = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        Map<String, Object> out = mapUserProfile(profile);
        out.put("badges", computeBadges(userId));
        out.put("badgesProgress", computeBadgeProgress(userId));
        out.put("reputation", computeReputation(userId));
        out.put("sellerProgram", resolveSellerProgram(profile));
        return out;
    }

    @Transactional(readOnly = true)
    public boolean isListingBoostOffered() {
        return billingService.isListingBoostCheckoutAvailable();
    }

    @Transactional
    public Map<String, Object> createListing(UUID userId, String title, String description, String speciesName,
                                             String stage, String sex, BigDecimal priceAmount, String currency,
                                             String city, String state, String country, String imageUrl, String pedigreeRef,
                                             String listingCategory,
                                             boolean requestListingBoost,
                                             boolean sellerCertifiesLegalTradeCompliance,
                                             boolean wildCaught,
                                             String captureOriginCountryIso,
                                             String regulatoryPermitRefs) {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Titulo requerido");
        }
        User seller = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        Map<String, Object> sellerProgram = resolveSellerProgram(seller);
        String tier = String.valueOf(sellerProgram.get("tier"));
        String category = MarketplaceListingCategories.normalizeOrDefault(listingCategory);
        if ("community".equals(tier) && !MarketplaceListingCategories.isCommunityPeerCategory(category)) {
            throw new IllegalArgumentException("Los keepers de comunidad solo pueden publicar tarántulas o proyectos de cría (máx. 5 anuncios activos).");
        }
        boolean tradeCertRequired = Boolean.TRUE.equals(sellerProgram.get("tradeCertificationRequired"));
        if (tradeCertRequired && !sellerCertifiesLegalTradeCompliance) {
            throw new IllegalArgumentException("Debes confirmar el cumplimiento legal de comercio para publicar");
        }
        String permitRefs = cleanText(regulatoryPermitRefs, 420);
        String iso = normalizeIsoCountry(captureOriginCountryIso);
        validateWildCaughtOrigin(wildCaught, iso);
        int activeLimit = ((Number) sellerProgram.get("activeListingLimit")).intValue();
        long activeCount = marketplaceListingRepository.countBySellerUserIdAndStatusIgnoreCase(userId, "active");
        if (activeCount >= activeLimit) {
            throw new IllegalArgumentException("Alcanzaste el limite de listings activos de tu plan. Actualiza a Pro/Vendor para escalar.");
        }
        if (requestListingBoost && !Boolean.TRUE.equals(sellerProgram.get("canRequestBoost"))) {
            throw new IllegalArgumentException("Listing Boost requiere plan Pro o Vendor.");
        }

        MarketplaceListing listing = new MarketplaceListing();
        listing.setSellerUserId(userId);
        listing.setListingCategory(category);
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
        listing.setWildCaught(wildCaught);
        listing.setCaptureOriginCountryIso(wildCaught ? iso : null);
        listing.setRegulatoryPermitRefs(permitRefs);
        if (tradeCertRequired && sellerCertifiesLegalTradeCompliance) {
            listing.setSellerTradeDisclosureAcceptedAt(Instant.now());
        }
        listing.setStatus("active");
        listing = marketplaceListingRepository.save(listing);
        Map<String, Object> out = mapListing(listing);
        out.put("listingBoostAvailable", billingService.isListingBoostCheckoutAvailable());
        out.put("sellerProgram", sellerProgram);
        if (requestListingBoost && billingService.isListingBoostCheckoutAvailable()) {
            try {
                String url = billingService.createListingBoostCheckoutSession(userId, seller.getEmail(), listing.getId());
                out.put("boostCheckoutUrl", url);
            } catch (Exception ignored) {
                // Listing is still published; boost checkout can be retried later if we add that flow.
            }
        }
        return out;
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
                                                    String nearCountry, String nearState, String nearCity,
                                                    String listingCategory,
                                                    String listingOrigin, Boolean hasRegulatoryRefs,
                                                    String sellerTier, Boolean verifiedOnly,
                                                    Boolean boostedOnly, Boolean hasImage,
                                                    BigDecimal minPrice, BigDecimal maxPrice) {
        final String filterCountry = normalizeFilter(country);
        final String filterState = normalizeFilter(state);
        final String filterCity = normalizeFilter(city);
        final String nearCountryNorm = normalizeFilter(nearCountry);
        final String nearStateNorm = normalizeFilter(nearState);
        final String nearCityNorm = normalizeFilter(nearCity);
        final String categoryNorm = MarketplaceListingCategories.normalizeOrDefault(listingCategory);
        final String listingOriginNorm = normalizeListingOriginFilter(listingOrigin);
        final boolean withTradeFilters = listingOriginNorm != null || hasRegulatoryRefs != null;

        List<Map<String, Object>> partner = withTradeFilters
                ? List.of()
                : partnerPublicListings(
                q, categoryNorm, filterCountry, filterState, filterCity, nearCountryNorm, nearStateNorm, nearCityNorm
        );
        List<Map<String, Object>> peer = peerPublicListings(
                q, status, categoryNorm, filterCountry, filterState, filterCity, nearCountryNorm, nearStateNorm, nearCityNorm,
                listingOriginNorm, hasRegulatoryRefs, sellerTier, verifiedOnly, boostedOnly, hasImage, minPrice, maxPrice
        );
        int partnerCap = dynamicPartnerCap(peer.size(), partner.size());
        List<Map<String, Object>> out = new ArrayList<>(partnerCap + peer.size());
        out.addAll(partner.stream().limit(partnerCap).collect(Collectors.toList()));
        out.addAll(peer);
        return out.stream().limit(100).collect(Collectors.toList());
    }

    /**
     * Bootstrap behavior: strategic partner listings can fill gaps early on, but once peer supply grows,
     * partner share is progressively reduced so community inventory dominates the feed.
     */
    private int dynamicPartnerCap(int peerCount, int partnerAvailable) {
        if (partnerAvailable <= 0) {
            return 0;
        }
        int hardCap = Math.max(1, partnerFeedHardCap);
        if (peerCount <= 0) {
            return Math.min(hardCap, partnerAvailable);
        }
        double targetShare;
        if (peerCount < 10) {
            targetShare = sanitizePartnerShare(partnerShareBootstrapUnder10, 0.60d);
        } else if (peerCount < 25) {
            targetShare = sanitizePartnerShare(partnerShareWarmUnder25, 0.40d);
        } else if (peerCount < 60) {
            targetShare = sanitizePartnerShare(partnerShareGrowthUnder60, 0.25d);
        } else {
            targetShare = sanitizePartnerShare(partnerShareSteady60Plus, 0.15d);
        }
        int capByShare = (int) Math.floor((peerCount * targetShare) / (1.0d - targetShare));
        int capped = Math.min(hardCap, Math.max(1, capByShare));
        return Math.min(capped, partnerAvailable);
    }

    private double sanitizePartnerShare(double configured, double fallback) {
        if (configured <= 0.01d || configured >= 0.95d) {
            return fallback;
        }
        return configured;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> publicListingDetail(UUID listingId) {
        Optional<MarketplaceListing> peerOpt = marketplaceListingRepository.findById(listingId);
        if (peerOpt.isPresent()) {
            MarketplaceListing l = peerOpt.get();
            if (!"active".equalsIgnoreCase(l.getStatus())) {
                throw new NotFoundException("Listing no encontrado");
            }
            Map<String, Object> listing = mapListing(l);
            listing.put("imageUrls", buildImageGallery(l.getImageUrl()));
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("listing", listing);
            payload.put("relatedListings", relatedPeerListings(l.getSellerUserId(), listingId));
            payload.put("sellerPreview", buildSellerPreview(l.getSellerUserId()));
            return payload;
        }

        Optional<PartnerListing> partnerOpt = partnerListingRepository.findById(listingId);
        if (partnerOpt.isEmpty()) {
            throw new NotFoundException("Listing no encontrado");
        }
        PartnerListing pl = partnerOpt.get();
        if (pl.getStatus() != PartnerListingStatus.ACTIVE) {
            throw new NotFoundException("Listing no encontrado");
        }
        OfficialVendor vendor = officialVendorRepository.findById(pl.getOfficialVendorId()).orElse(null);
        if (!isVendorEligibleForPublicFeed(vendor)) {
            throw new NotFoundException("Listing no encontrado");
        }
        Map<String, Object> listing = mapPartnerListing(pl, vendor);
        listing.put("imageUrls", buildImageGallery(pl.getImageUrl()));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("listing", listing);
        payload.put("relatedListings", relatedPartnerListings(pl.getOfficialVendorId(), listingId, vendor));
        payload.put("sellerPreview", null);
        return payload;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dealQuote(UUID listingId, BigDecimal overrideSubtotal) {
        MarketplaceListing listing = marketplaceListingRepository.findById(listingId)
                .orElseThrow(() -> new NotFoundException("Listing no encontrado"));
        User seller = userRepository.findById(listing.getSellerUserId()).orElse(null);
        String sellerTier = sellerProgramTierKey(seller);
        BigDecimal subtotal = overrideSubtotal != null
                ? overrideSubtotal
                : (listing.getPriceAmount() == null ? BigDecimal.ZERO : listing.getPriceAmount());
        if (subtotal.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Subtotal invalido");
        }
        BigDecimal rate = commissionRateBySellerTier(sellerTier);
        BigDecimal commission = subtotal.multiply(rate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal payout = subtotal.subtract(commission).setScale(2, RoundingMode.HALF_UP);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("listingId", listing.getId());
        out.put("currency", listing.getCurrency());
        out.put("subtotal", subtotal.setScale(2, RoundingMode.HALF_UP));
        out.put("commissionRate", rate);
        out.put("commissionAmount", commission);
        out.put("sellerPayoutAmount", payout);
        out.put("sellerTier", sellerTier);
        out.put("payoutHoldDays", PAYOUT_HOLD_DAYS);
        out.put("requiresProofOfLifeBeforeShipping", true);
        out.put("requiresArrivalProofBeforeRelease", true);
        return out;
    }

    private boolean isVendorEligibleForPublicFeed(OfficialVendor vendor) {
        if (vendor == null || !Boolean.TRUE.equals(vendor.getEnabled())
                || !Boolean.TRUE.equals(vendor.getListingImportEnabled())) {
            return false;
        }
        PartnerProgramTier tier = vendor.getPartnerProgramTier();
        return tier != null && STRATEGIC_PARTNER_FEED_TIERS.contains(tier);
    }

    private List<Map<String, Object>> relatedPeerListings(UUID sellerUserId, UUID excludeId) {
        return marketplaceListingRepository.findTop100BySellerUserIdOrderByCreatedAtDesc(sellerUserId).stream()
                .filter(x -> !x.getId().equals(excludeId) && "active".equalsIgnoreCase(x.getStatus()))
                .limit(8)
                .map(this::mapListing)
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> relatedPartnerListings(UUID vendorId, UUID excludeId, OfficialVendor vendor) {
        return partnerListingRepository.findByOfficialVendorId(vendorId).stream()
                .filter(p -> p.getStatus() == PartnerListingStatus.ACTIVE && !p.getId().equals(excludeId))
                .sorted(Comparator.comparing(PartnerListing::getLastSyncedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(8)
                .map(p -> mapPartnerListing(p, vendor))
                .collect(Collectors.toList());
    }

    private Map<String, Object> buildSellerPreview(UUID sellerUserId) {
        Map<String, Object> out = new LinkedHashMap<>();
        User u = userRepository.findById(sellerUserId).orElse(null);
        if (u == null) {
            return out;
        }
        Double avgRaw = sellerReviewRepository.avgRatingBySellerUserId(sellerUserId);
        double avg = avgRaw == null ? 0d : Math.round(avgRaw * 10.0) / 10.0;
        long reviewsCount = sellerReviewRepository.countBySellerUserId(sellerUserId);
        out.put("userId", u.getId());
        out.put("displayName", u.getDisplayName() == null || u.getDisplayName().isBlank() ? u.getEmail() : u.getDisplayName());
        out.put("handle", u.getPublicHandle() == null ? "" : u.getPublicHandle());
        out.put("profilePhoto", u.getProfilePhoto() == null ? "" : u.getProfilePhoto());
        out.put("ratingAvg", avg);
        out.put("reviewsCount", reviewsCount);
        return out;
    }

    private List<String> buildImageGallery(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        String u = raw.trim();
        if (u.contains("picsum.photos/seed/")) {
            String hi = u.replaceFirst("/[0-9]+/[0-9]+(\\?.*)?$", "/1200/800$1");
            if (!hi.equals(u)) {
                List<String> urls = new ArrayList<>();
                urls.add(hi);
                urls.add(u);
                return urls;
            }
        }
        return List.of(u);
    }

    private List<Map<String, Object>> peerPublicListings(String q, String status,
                                                         String categoryNorm,
                                                         String filterCountry, String filterState, String filterCity,
                                                         String nearCountryNorm, String nearStateNorm, String nearCityNorm,
                                                         String listingOriginNorm, Boolean hasRegulatoryRefs,
                                                         String sellerTier, Boolean verifiedOnly, Boolean boostedOnly,
                                                         Boolean hasImage, BigDecimal minPrice, BigDecimal maxPrice) {
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
        return byTitle.stream()
                .collect(Collectors.toMap(MarketplaceListing::getId, m -> m, (a, b) -> a, LinkedHashMap::new))
                .values()
                .stream()
                .filter(m -> filterCountry == null || normalizeFilter(m.getCountry()).equals(filterCountry))
                .filter(m -> filterState == null || normalizeFilter(m.getState()).equals(filterState))
                .filter(m -> filterCity == null || normalizeFilter(m.getCity()).equals(filterCity))
                .filter(m -> matchesListingCategoryFilter(m, categoryNorm))
                .filter(m -> matchesListingOriginFilter(m, listingOriginNorm))
                .filter(m -> matchesRegulatoryRefsFilter(m, hasRegulatoryRefs))
                .filter(m -> matchesSellerTierFilter(m, sellerTier))
                .filter(m -> matchesVerifiedFilter(m, verifiedOnly))
                .filter(m -> matchesBoostedFilter(m, boostedOnly))
                .filter(m -> matchesHasImageFilter(m, hasImage))
                .filter(m -> matchesPriceRange(m, minPrice, maxPrice))
                .sorted((a, b) -> {
                    boolean ab = isListingBoostedNow(a);
                    boolean bb = isListingBoostedNow(b);
                    if (ab != bb) {
                        return ab ? -1 : 1;
                    }
                    return Integer.compare(
                            proximityScore(b, nearCountryNorm, nearStateNorm, nearCityNorm),
                            proximityScore(a, nearCountryNorm, nearStateNorm, nearCityNorm)
                    );
                })
                .limit(100)
                .map(this::mapListing)
                .collect(Collectors.toList());
    }

    private static boolean matchesListingOriginFilter(MarketplaceListing m, String listingOriginNorm) {
        if (listingOriginNorm == null) {
            return true;
        }
        boolean wild = m.isWildCaught();
        if ("wild_caught".equals(listingOriginNorm)) {
            return wild;
        }
        if ("captive_bred".equals(listingOriginNorm)) {
            return !wild;
        }
        return true;
    }

    private static boolean matchesRegulatoryRefsFilter(MarketplaceListing m, Boolean hasRegulatoryRefs) {
        if (hasRegulatoryRefs == null) {
            return true;
        }
        boolean hasRefs = m.getRegulatoryPermitRefs() != null && !m.getRegulatoryPermitRefs().isBlank();
        return hasRegulatoryRefs ? hasRefs : !hasRefs;
    }

    private boolean matchesSellerTierFilter(MarketplaceListing m, String sellerTier) {
        String norm = normalizeFilter(sellerTier);
        if (norm == null) return true;
        User seller = userRepository.findById(m.getSellerUserId()).orElse(null);
        String tier = sellerProgramTierKey(seller);
        return norm.equals(tier);
    }

    private boolean matchesVerifiedFilter(MarketplaceListing m, Boolean verifiedOnly) {
        if (!Boolean.TRUE.equals(verifiedOnly)) return true;
        User seller = userRepository.findById(m.getSellerUserId()).orElse(null);
        return seller != null && Boolean.TRUE.equals(seller.getVerifiedBreeder());
    }

    private boolean matchesBoostedFilter(MarketplaceListing m, Boolean boostedOnly) {
        if (!Boolean.TRUE.equals(boostedOnly)) return true;
        return isListingBoostedNow(m);
    }

    private static boolean matchesHasImageFilter(MarketplaceListing m, Boolean hasImage) {
        if (hasImage == null) return true;
        boolean image = m.getImageUrl() != null && !m.getImageUrl().isBlank();
        return hasImage ? image : !image;
    }

    private static boolean matchesPriceRange(MarketplaceListing m, BigDecimal minPrice, BigDecimal maxPrice) {
        if (minPrice == null && maxPrice == null) return true;
        if (m.getPriceAmount() == null) return false;
        if (minPrice != null && m.getPriceAmount().compareTo(minPrice) < 0) return false;
        return maxPrice == null || m.getPriceAmount().compareTo(maxPrice) <= 0;
    }

    private static String normalizeListingOriginFilter(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String v = raw.trim().toLowerCase();
        if ("wild".equals(v) || "wild_caught".equals(v)) {
            return "wild_caught";
        }
        if ("captive".equals(v) || "captive_bred".equals(v)) {
            return "captive_bred";
        }
        return null;
    }

    private static boolean matchesListingCategoryFilter(MarketplaceListing m, String categoryNorm) {
        if (categoryNorm == null) {
            return true;
        }
        String rowCategory = MarketplaceListingCategories.normalizeOrDefault(m.getListingCategory());
        return categoryNorm.equals(rowCategory);
    }

    private static boolean matchesPartnerListingCategoryFilter(PartnerListing p, String categoryNorm) {
        if (categoryNorm == null) {
            return true;
        }
        String rowCategory = MarketplaceListingCategories.normalizeOrDefault(p.getListingCategory());
        return categoryNorm.equals(rowCategory);
    }

    private List<Map<String, Object>> partnerPublicListings(String q, String categoryNorm,
                                                            String filterCountry, String filterState, String filterCity,
                                                            String nearCountryNorm, String nearStateNorm, String nearCityNorm) {
        String queryNorm = normalizeFilter(q);
        Map<UUID, OfficialVendor> eligibleVendorById = officialVendorRepository
                .findByPartnerProgramTierInAndListingImportEnabledTrueAndEnabledTrueOrderByInfluenceScoreDesc(
                        STRATEGIC_PARTNER_FEED_TIERS)
                .stream()
                .collect(Collectors.toMap(OfficialVendor::getId, v -> v));

        return partnerListingRepository.findTop200ByStatusOrderByLastSyncedAtDesc(PartnerListingStatus.ACTIVE)
                .stream()
                .filter(p -> eligibleVendorById.containsKey(p.getOfficialVendorId()))
                .filter(p -> matchesPartnerListingCategoryFilter(p, categoryNorm))
                .filter(p -> queryNorm == null || partnerMatchesQuery(p, queryNorm))
                .filter(p -> filterCountry == null || filterCountry.equals(normalizeFilter(p.getCountry())))
                .filter(p -> filterState == null || filterState.equals(normalizeFilter(p.getState())))
                .filter(p -> filterCity == null || filterCity.equals(normalizeFilter(p.getCity())))
                .sorted(Comparator
                        .comparingInt((PartnerListing p) -> partnerProximityScore(p, nearCountryNorm, nearStateNorm, nearCityNorm))
                        .reversed()
                        .thenComparing(PartnerListing::getLastSyncedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(Math.max(1, partnerFeedHardCap))
                .map(p -> mapPartnerListing(p, eligibleVendorById.get(p.getOfficialVendorId())))
                .collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> addReview(UUID sellerUserId, UUID reviewerUserId, UUID listingId, Integer rating, String comment) {
        if (sellerUserId.equals(reviewerUserId)) {
            throw new IllegalArgumentException("No puedes calificarte a ti mismo");
        }
        if (listingId == null) {
            throw new IllegalArgumentException("Debes calificar desde el chat de un listing");
        }
        if (rating == null || rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating invalido");
        }
        userRepository.findById(sellerUserId).orElseThrow(() -> new NotFoundException("Seller no encontrado"));
        if (sellerReviewRepository.existsBySellerUserIdAndReviewerUserId(sellerUserId, reviewerUserId)) {
            throw new IllegalArgumentException("Ya dejaste una review a este seller");
        }
        assertMarketplaceReviewEligibility(sellerUserId, reviewerUserId, listingId);
        SellerReview review = new SellerReview();
        review.setSellerUserId(sellerUserId);
        review.setReviewerUserId(reviewerUserId);
        review.setListingId(listingId);
        review.setRating(rating.shortValue());
        review.setComment(cleanText(comment, 500));
        return mapReview(sellerReviewRepository.save(review));
    }

    private void assertMarketplaceReviewEligibility(UUID sellerUserId, UUID reviewerUserId, UUID listingId) {
        UUID[] pair = orderedPair(sellerUserId, reviewerUserId);
        UUID low = pair[0];
        UUID high = pair[1];
        UUID threadId = chatThreadRepository.findByUserLowAndUserHighAndListingId(low, high, listingId)
                .orElseThrow(() -> new IllegalArgumentException("Solo puedes reseñar después de conversar en el chat del listing"))
                .getId();
        long totalMessages = chatMessageRepository.countByThreadId(threadId);
        long sellerMessages = chatMessageRepository.countByThreadIdAndSenderUserId(threadId, sellerUserId);
        long reviewerMessages = chatMessageRepository.countByThreadIdAndSenderUserId(threadId, reviewerUserId);
        if (totalMessages < MIN_MESSAGES_TO_ENABLE_REVIEW
                || sellerMessages < MIN_MESSAGES_PER_PARTICIPANT
                || reviewerMessages < MIN_MESSAGES_PER_PARTICIPANT) {
            throw new IllegalArgumentException("La reseña se habilita tras al menos 6 mensajes y participación de ambas partes");
        }
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> sellerReviews(UUID sellerUserId) {
        return sellerReviewRepository.findTop50BySellerUserIdOrderByCreatedAtDesc(sellerUserId)
                .stream().map(this::mapReview).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> publicSellerProfile(UUID sellerUserId) {
        User user = userRepository.findById(sellerUserId).orElseThrow(() -> new NotFoundException("Keeper no encontrado"));
        String profileVisibility = normalizeCommunityProfileVisibility(user.getCommunityProfileVisibility());
        boolean collectionPublic = "public_full".equals(profileVisibility);
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
        List<Map<String, Object>> publicCollection = collectionPublic
                ? tarantulaRepository.findTop24ByUserIdAndIsPublicTrueOrderByCreatedAtDesc(sellerUserId)
                        .stream()
                        .map(t -> {
                            Map<String, Object> row = new LinkedHashMap<>();
                            row.put("id", t.getId());
                            row.put("name", t.getName());
                            row.put("shortId", t.getShortId());
                            row.put("profilePhoto", t.getProfilePhoto() == null ? "" : t.getProfilePhoto());
                            row.put("stage", t.getStage() == null ? "" : t.getStage());
                            row.put("sex", t.getSex() == null ? "" : t.getSex());
                            row.put("speciesName", t.getSpecies() == null ? "" : (t.getSpecies().getScientificName() == null ? "" : t.getSpecies().getScientificName()));
                            row.put("spoodCount", tarantulaSpoodRepository.countByTarantulaId(t.getId()));
                            return row;
                        })
                        .collect(Collectors.toList())
                : List.of();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("userId", user.getId());
        out.put("displayName", user.getDisplayName() == null || user.getDisplayName().isBlank() ? user.getEmail() : user.getDisplayName());
        out.put("profile", mapUserProfile(user));
        out.put("badges", computeBadges(sellerUserId));
        out.put("badgesProgress", computeBadgeProgress(sellerUserId));
        out.put("reputation", computeReputation(sellerUserId));
        out.put("ratingAvg", avg);
        out.put("reviewsCount", reviewsCount);
        out.put("storefrontMetrics", computeStorefrontMetrics(sellerUserId, reviewsCount));
        out.put("activeListings", activeListings);
        out.put("collectionPublic", collectionPublic);
        out.put("communityProfileVisibility", profileVisibility);
        out.put("publicCollection", publicCollection);
        out.put("publicCollectionCount", publicCollection.size());
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> publicStorefrontByHandle(String handle) {
        String normalized = PublicHandleRules.normalize(handle);
        if (normalized == null || normalized.isBlank()) {
            throw new NotFoundException("Storefront no encontrado");
        }
        User user = userRepository.findByPublicHandleIgnoreCase(normalized)
                .orElseThrow(() -> new NotFoundException("Storefront no encontrado"));
        if (user.getPublicHandle() == null || user.getPublicHandle().isBlank()) {
            throw new NotFoundException("Storefront no encontrado");
        }
        Map<String, Object> seller = publicSellerProfile(user.getId());
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("storefrontHandle", user.getPublicHandle());
        out.put("storefrontUrl", "/shop/" + user.getPublicHandle());
        out.put("seller", seller);
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
    public Map<String, String> uploadListingImage(UUID userId, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Imagen requerida");
        }
        String path = fileStorageService.saveFile(file, "listings/" + userId);
        return Map.of("imageUrl", path);
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
        String sellerLabel = seller == null ? "Keeper"
                : (seller.getDisplayName() == null || seller.getDisplayName().isBlank()
                ? seller.getEmail() : seller.getDisplayName());
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", l.getId());
        out.put("sellerUserId", l.getSellerUserId());
        out.put("sellerName", sellerLabel);
        out.put("sellerDisplayName", sellerLabel);
        out.put("sellerProfilePhoto", seller == null || seller.getProfilePhoto() == null ? "" : seller.getProfilePhoto());
        out.put("sellerHandle", seller == null || seller.getPublicHandle() == null ? "" : seller.getPublicHandle());
        out.put("sellerVerifiedBreeder", seller != null && Boolean.TRUE.equals(seller.getVerifiedBreeder()));
        out.put("sellerProgramTier", sellerProgramTierKey(seller));
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
        out.put("boostedUntil", l.getBoostedUntil());
        out.put("boosted", isListingBoostedNow(l));
        out.put("wildCaught", l.isWildCaught());
        out.put("captureOriginCountryIso", l.getCaptureOriginCountryIso() == null ? "" : l.getCaptureOriginCountryIso());
        out.put("regulatoryPermitRefs", l.getRegulatoryPermitRefs() == null ? "" : l.getRegulatoryPermitRefs());
        out.put("sellerTradeDisclosureAcceptedAt", l.getSellerTradeDisclosureAcceptedAt());
        out.put("listingCategory", MarketplaceListingCategories.normalizeOrDefault(l.getListingCategory()));
        out.put("source", "peer");
        out.put("isPartner", false);
        out.put("badgeLabel", null);
        out.put("canonicalUrl", null);
        out.put("officialVendor", null);
        return out;
    }

    private Map<String, Object> resolveSellerProgram(User seller) {
        String tier = sellerProgramTierKey(seller);
        int activeListingLimit;
        boolean canRequestBoost;
        if ("vendor".equals(tier)) {
            activeListingLimit = VENDOR_ACTIVE_LISTING_LIMIT;
            canRequestBoost = true;
        } else if ("pro".equals(tier)) {
            activeListingLimit = PRO_ACTIVE_LISTING_LIMIT;
            canRequestBoost = true;
        } else {
            activeListingLimit = FREE_ACTIVE_LISTING_LIMIT;
            canRequestBoost = false;
        }
        boolean tradeCertificationRequired = !"community".equals(tier);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("tier", tier);
        out.put("activeListingLimit", activeListingLimit);
        out.put("canRequestBoost", canRequestBoost);
        out.put("reviewedVendor", seller != null && Boolean.TRUE.equals(seller.getVerifiedBreeder()));
        out.put("proPlan", seller != null && UserPlan.PRO.equals(seller.getPlan()));
        out.put("tradeCertificationRequired", tradeCertificationRequired);
        out.put("allowedListingCategories", allowedListingCategoriesForTier(tier));
        return out;
    }

    private static List<String> allowedListingCategoriesForTier(String tier) {
        if ("community".equals(tier)) {
            return List.of(
                    MarketplaceListingCategories.TARANTULAS,
                    MarketplaceListingCategories.BREEDING_PROJECTS);
        }
        return MarketplaceListingCategories.publicBrowseOrder();
    }

    private BigDecimal commissionRateBySellerTier(String sellerTier) {
        if ("vendor".equals(sellerTier)) return COMMISSION_RATE_VENDOR;
        if ("pro".equals(sellerTier)) return COMMISSION_RATE_PRO;
        return COMMISSION_RATE_COMMUNITY;
    }

    private String sellerProgramTierKey(User seller) {
        if (seller == null) return "community";
        if (Boolean.TRUE.equals(seller.getVerifiedBreeder())) return "vendor";
        if (UserPlan.PRO.equals(seller.getPlan())) return "pro";
        return "community";
    }

    private Map<String, Object> mapPartnerListing(PartnerListing listing, OfficialVendor vendor) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", listing.getId());
        out.put("sellerUserId", null);
        out.put("sellerName", vendor == null ? "Strategic partner" : vendor.getName());
        out.put("sellerHandle", "");
        out.put("title", listing.getTitle());
        out.put("description", listing.getDescription() == null ? "" : listing.getDescription());
        out.put("speciesName", listing.getSpeciesNormalized() == null ? (listing.getSpeciesNameRaw() == null ? "" : listing.getSpeciesNameRaw()) : listing.getSpeciesNormalized());
        out.put("stage", "");
        out.put("sex", "");
        out.put("priceAmount", listing.getPriceAmount());
        out.put("currency", listing.getCurrency());
        out.put("status", listing.getStatus().name().toLowerCase());
        out.put("city", listing.getCity() == null ? "" : listing.getCity());
        out.put("state", listing.getState() == null ? "" : listing.getState());
        out.put("country", listing.getCountry() == null ? "" : listing.getCountry());
        out.put("imageUrl", listing.getImageUrl() == null ? "" : listing.getImageUrl());
        out.put("pedigreeRef", "");
        out.put("createdAt", listing.getCreatedAt());
        out.put("boostedUntil", null);
        out.put("boosted", true);
        out.put("source", "partner");
        out.put("isPartner", true);
        out.put("partnerProgramTier", vendor != null && vendor.getPartnerProgramTier() != null
                ? vendor.getPartnerProgramTier().name() : null);
        out.put("badgeLabel", vendor == null || vendor.getBadge() == null ? "Official partner" : vendor.getBadge());
        out.put("canonicalUrl", listing.getProductCanonicalUrl());
        if (vendor == null) {
            out.put("officialVendor", null);
        } else {
            Map<String, Object> vendorMeta = new LinkedHashMap<>();
            vendorMeta.put("id", vendor.getId());
            vendorMeta.put("slug", vendor.getSlug());
            vendorMeta.put("name", vendor.getName());
            vendorMeta.put("websiteUrl", vendor.getWebsiteUrl());
            vendorMeta.put("partnerProgramTier", vendor.getPartnerProgramTier() == null ? null : vendor.getPartnerProgramTier().name());
            out.put("officialVendor", vendorMeta);
        }
        out.put("availability", listing.getAvailability() == null ? "unknown" : listing.getAvailability().name().toLowerCase());
        out.put("stockQuantity", listing.getStockQuantity());
        out.put("lastSyncedAt", listing.getLastSyncedAt());
        out.put("listingCategory", MarketplaceListingCategories.normalizeOrDefault(listing.getListingCategory()));
        return out;
    }

    private boolean isListingBoostedNow(MarketplaceListing m) {
        return m.getBoostedUntil() != null && m.getBoostedUntil().isAfter(Instant.now());
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
        out.put("verifiedBreeder", Boolean.TRUE.equals(p.getVerifiedBreeder()));
        out.put("verifiedBreederAt", p.getVerifiedBreederAt());
        out.put("storefrontName", p.getStorefrontName() == null ? "" : p.getStorefrontName());
        out.put("storefrontTagline", p.getStorefrontTagline() == null ? "" : p.getStorefrontTagline());
        out.put("storefrontShippingPolicy", p.getStorefrontShippingPolicy() == null ? "" : p.getStorefrontShippingPolicy());
        out.put("storefrontLagPolicy", p.getStorefrontLagPolicy() == null ? "" : p.getStorefrontLagPolicy());
        out.put("country", p.getProfileCountry() == null ? "" : p.getProfileCountry());
        out.put("state", p.getProfileState() == null ? "" : p.getProfileState());
        out.put("city", p.getProfileCity() == null ? "" : p.getProfileCity());
        out.put("profilePhoto", p.getProfilePhoto() == null ? "" : p.getProfilePhoto());
        out.put("searchVisible", p.getSearchVisible() == null || p.getSearchVisible());
        out.put("communityProfileVisibility", normalizeCommunityProfileVisibility(p.getCommunityProfileVisibility()));
        return out;
    }

    private Map<String, Object> computeStorefrontMetrics(UUID sellerUserId, long reviewsCount) {
        long totalListings = marketplaceListingRepository.countBySellerUserId(sellerUserId);
        long activeListings = marketplaceListingRepository.countBySellerUserIdAndStatusIgnoreCase(sellerUserId, "active");
        long soldListings = marketplaceListingRepository.countBySellerUserIdAndStatusIgnoreCase(sellerUserId, "sold");
        long listingThreads = chatThreadRepository.countListingThreadsForSeller(sellerUserId);
        long repliedThreads = chatThreadRepository.countListingThreadsWithSellerReply(sellerUserId);
        long responseRatePct = listingThreads <= 0 ? 0L : Math.round((repliedThreads * 100.0d) / listingThreads);

        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("totalListings", totalListings);
        metrics.put("activeListings", activeListings);
        metrics.put("soldListings", soldListings);
        metrics.put("reviewsCount", reviewsCount);
        metrics.put("listingThreads", listingThreads);
        metrics.put("repliedThreads", repliedThreads);
        metrics.put("responseRatePct", Math.max(0L, Math.min(100L, responseRatePct)));
        return metrics;
    }

    private String normalizeCommunityProfileVisibility(String raw) {
        if (raw == null || raw.isBlank()) {
            return "preview_only";
        }
        String v = raw.trim().toLowerCase();
        if (!v.equals("public_full") && !v.equals("preview_only") && !v.equals("private")) {
            throw new IllegalArgumentException("Visibilidad de perfil invalida");
        }
        return v;
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
        if (total >= 10) badges.add(Map.of("key", "collection_10", "label", "Collection 10+"));
        if (total >= 25) badges.add(Map.of("key", "collection_25", "label", "Collection 25+"));
        if (species >= 5) badges.add(Map.of("key", "species_5", "label", "Species diversity 5+"));
        if (species >= 12) badges.add(Map.of("key", "species_12", "label", "Species diversity 12+"));
        if (events >= 30) badges.add(Map.of("key", "logger_30", "label", "Active logbook (30+ events)"));
        if (events >= 100) badges.add(Map.of("key", "logger_100", "label", "Logbook master (100+ events)"));
        if (qrPrints >= 1) badges.add(Map.of("key", "qr_printed", "label", "Labeled terrarium (printed QR)"));
        if (qrPrints >= 10) badges.add(Map.of("key", "qr_printed_10", "label", "QR labeler pro (10+ prints)"));
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
        out.put("collectionNext", progressMetric(total, 10, 25, "Collection 10+", "Collection 25+", "collection_10", "collection_25"));
        out.put("speciesNext", progressMetric(species, 5, 12, "Species diversity 5+", "Species diversity 12+", "species_5", "species_12"));
        out.put("eventsNext", progressMetric(events, 30, 100, "Active logbook", "Logbook master", "logger_30", "logger_100"));
        out.put("qrNext", progressMetric(qrPrints, 1, 10, "Printed QR", "QR labeler pro", "qr_printed", "qr_printed_10"));
        return out;
    }

    private Map<String, Object> progressMetric(long value, int tier1, int tier2,
                                               String label1, String label2,
                                               String key1, String key2) {
        Map<String, Object> m = new LinkedHashMap<>();
        if (value < tier1) {
            m.put("current", value);
            m.put("target", tier1);
            m.put("nextLabel", label1);
            m.put("nextKey", key1);
            return m;
        }
        if (value < tier2) {
            m.put("current", value);
            m.put("target", tier2);
            m.put("nextLabel", label2);
            m.put("nextKey", key2);
            return m;
        }
        m.put("current", value);
        m.put("target", value);
        m.put("nextLabel", "Max");
        m.put("nextKey", "max");
        return m;
    }

    private Map<String, Object> computeReputation(UUID userId) {
        KeeperRankCalculator.KeeperRankSnapshot snap = keeperRankCalculator.compute(userId);
        Map<String, Object> out = new HashMap<>();
        out.put("score", snap.progressPercent());
        out.put("tier", snap.rankKey());
        out.put("nextTier", snap.nextTierKey());
        out.put("remainingPercent", snap.remainingPercent());
        out.put("nextTierTarget", snap.remainingPercent());
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

    private int partnerProximityScore(PartnerListing listing, String country, String state, String city) {
        int score = 0;
        String lCountry = normalizeFilter(listing.getCountry());
        String lState = normalizeFilter(listing.getState());
        String lCity = normalizeFilter(listing.getCity());
        if (country != null && country.equals(lCountry)) score += 4;
        if (state != null && state.equals(lState)) score += 7;
        if (city != null && city.equals(lCity)) score += 10;
        return score;
    }

    private boolean partnerMatchesQuery(PartnerListing listing, String queryNorm) {
        return containsNormalized(listing.getTitle(), queryNorm)
                || containsNormalized(listing.getDescription(), queryNorm)
                || containsNormalized(listing.getSpeciesNameRaw(), queryNorm)
                || containsNormalized(listing.getSpeciesNormalized(), queryNorm);
    }

    private boolean containsNormalized(String value, String queryNorm) {
        String normalized = normalizeFilter(value);
        return normalized != null && normalized.contains(queryNorm);
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

    private static void validateWildCaughtOrigin(boolean wildCaught, String isoNormalized) {
        if (!wildCaught) {
            return;
        }
        if (isoNormalized == null || !ISO_COUNTRY.matcher(isoNormalized).matches()) {
            throw new IllegalArgumentException("Para ejemplares de origen silvestre indica pais de origen valido (codigo ISO de 2 letras)");
        }
    }

    /** @return uppercase ISO-3166-1 alpha-2 or null if absent/blank */
    private static String normalizeIsoCountry(String raw) {
        if (raw == null) {
            return null;
        }
        String t = raw.trim().toUpperCase();
        if (t.isEmpty()) {
            return null;
        }
        return t.length() > 2 ? t.substring(0, 2) : t;
    }

    private String cleanText(String value, int maxLen) {
        if (value == null) return null;
        String out = value.trim().replaceAll("\\s+", " ");
        if (out.isEmpty()) return null;
        return out.length() > maxLen ? out.substring(0, maxLen) : out;
    }

    private UUID[] orderedPair(UUID a, UUID b) {
        String sa = a.toString();
        String sb = b.toString();
        if (sa.compareTo(sb) < 0) {
            return new UUID[]{a, b};
        }
        return new UUID[]{b, a};
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
