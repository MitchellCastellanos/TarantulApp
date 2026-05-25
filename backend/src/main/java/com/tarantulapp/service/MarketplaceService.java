package com.tarantulapp.service;

import com.tarantulapp.entity.ChatThread;
import com.tarantulapp.entity.MarketplaceListing;
import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.PartnerListing;
import com.tarantulapp.entity.PartnerListingStatus;
import com.tarantulapp.entity.PartnerProgramTier;
import com.tarantulapp.entity.SellerReview;
import com.tarantulapp.entity.User;
import com.tarantulapp.entity.UserPlan;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.ListingEventRepository;
import com.tarantulapp.repository.MarketplaceListingRepository;
import com.tarantulapp.repository.OfficialVendorRepository;
import com.tarantulapp.repository.PartnerListingRepository;
import com.tarantulapp.repository.SellerReviewRepository;
import com.tarantulapp.repository.SexIdCaseVoteRepository;
import com.tarantulapp.repository.TarantulaSpoodRepository;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.repository.FeedingLogRepository;
import com.tarantulapp.repository.MoltLogRepository;
import com.tarantulapp.repository.BehaviorLogRepository;
import com.tarantulapp.repository.ChatMessageRepository;
import com.tarantulapp.repository.ChatThreadRepository;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.service.vendors.PartnerListingTarantulaFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Comparator;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
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

    private static final long MIN_MESSAGES_TO_ENABLE_REVIEW = 6L;
    private static final long MIN_MESSAGES_PER_PARTICIPANT = 2L;

    /** Official vendors whose partner listings appear in the public marketplace feed. */
    private static final List<PartnerProgramTier> STRATEGIC_PARTNER_FEED_TIERS = List.of(
            PartnerProgramTier.FOUNDING_PARTNER,
            PartnerProgramTier.OFFICIAL_PARTNER,
            PartnerProgramTier.STRATEGIC_FOUNDER,
            PartnerProgramTier.STRATEGIC_PARTNER);
    private final MarketplaceListingRepository marketplaceListingRepository;
    private final ListingEventRepository listingEventRepository;
    private final PartnerListingRepository partnerListingRepository;
    private final OfficialVendorRepository officialVendorRepository;
    private final SellerReviewRepository sellerReviewRepository;
    private final TarantulaSpoodRepository tarantulaSpoodRepository;
    private final UserRepository userRepository;
    private final TarantulaRepository tarantulaRepository;
    private final FeedingLogRepository feedingLogRepository;
    private final MoltLogRepository moltLogRepository;
    private final BehaviorLogRepository behaviorLogRepository;
    private final SexIdCaseVoteRepository sexIdCaseVoteRepository;
    private final ChatThreadRepository chatThreadRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final FileStorageService fileStorageService;
    private final BillingService billingService;
    private final VendorBoostCreditService vendorBoostCreditService;
    private final KeeperRankCalculator keeperRankCalculator;
    private final SpeciesWatchService speciesWatchService;
    private final NotificationService notificationService;
    @Value("${app.marketplace.partner-feed.hard-cap:500}")
    private int partnerFeedHardCap = 500;
    @Value("${app.marketplace.strategic-bootstrap-mode:true}")
    private boolean strategicBootstrapMode = true;
    @Value("${app.marketplace.public-listings.max:300}")
    private int publicListingsMax = 300;
    @Value("${app.marketplace.partner-feed.share.bootstrap-under-10:0.60}")
    private double partnerShareBootstrapUnder10 = 0.60d;
    @Value("${app.marketplace.partner-feed.share.warm-under-25:0.40}")
    private double partnerShareWarmUnder25 = 0.40d;
    @Value("${app.marketplace.partner-feed.share.growth-under-60:0.25}")
    private double partnerShareGrowthUnder60 = 0.25d;
    @Value("${app.marketplace.partner-feed.share.steady-60-plus:0.15}")
    private double partnerShareSteady60Plus = 0.15d;

    public MarketplaceService(MarketplaceListingRepository marketplaceListingRepository,
                              ListingEventRepository listingEventRepository,
                              PartnerListingRepository partnerListingRepository,
                              OfficialVendorRepository officialVendorRepository,
                              SellerReviewRepository sellerReviewRepository,
                              TarantulaSpoodRepository tarantulaSpoodRepository,
                              UserRepository userRepository,
                              TarantulaRepository tarantulaRepository,
                              FeedingLogRepository feedingLogRepository,
                              MoltLogRepository moltLogRepository,
                              BehaviorLogRepository behaviorLogRepository,
                              SexIdCaseVoteRepository sexIdCaseVoteRepository,
                              ChatThreadRepository chatThreadRepository,
                              ChatMessageRepository chatMessageRepository,
                              FileStorageService fileStorageService,
                              BillingService billingService,
                              VendorBoostCreditService vendorBoostCreditService,
                              KeeperRankCalculator keeperRankCalculator,
                              SpeciesWatchService speciesWatchService,
                              NotificationService notificationService) {
        this.marketplaceListingRepository = marketplaceListingRepository;
        this.listingEventRepository = listingEventRepository;
        this.partnerListingRepository = partnerListingRepository;
        this.officialVendorRepository = officialVendorRepository;
        this.sellerReviewRepository = sellerReviewRepository;
        this.tarantulaSpoodRepository = tarantulaSpoodRepository;
        this.userRepository = userRepository;
        this.tarantulaRepository = tarantulaRepository;
        this.feedingLogRepository = feedingLogRepository;
        this.moltLogRepository = moltLogRepository;
        this.behaviorLogRepository = behaviorLogRepository;
        this.sexIdCaseVoteRepository = sexIdCaseVoteRepository;
        this.chatThreadRepository = chatThreadRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.fileStorageService = fileStorageService;
        this.billingService = billingService;
        this.vendorBoostCreditService = vendorBoostCreditService;
        this.keeperRankCalculator = keeperRankCalculator;
        this.speciesWatchService = speciesWatchService;
        this.notificationService = notificationService;
    }

    @Transactional
    public Map<String, Object> upsertMyProfile(UUID userId, String displayName, String handle, String bio, String location,
                                               String featuredCollection, String contactWhatsapp,
                                               String contactInstagram, String country, String state, String city,
                                               Boolean searchVisible, String communityProfileVisibility,
                                               String storefrontName, String storefrontTagline,
                                               String storefrontShippingPolicy, String storefrontLagPolicy,
                                               java.util.List<String> shipsTo) {
        User profile = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        String previousVisibility = normalizeCommunityProfileVisibility(profile.getCommunityProfileVisibility());
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
        String newVisibility = communityProfileVisibility == null
                ? previousVisibility
                : normalizeCommunityProfileVisibility(communityProfileVisibility);
        profile.setCommunityProfileVisibility(newVisibility);
        boolean collectionPublic = "public_full".equals(newVisibility);
        profile.setDefaultTarantulaPublic(collectionPublic);
        if (communityProfileVisibility != null && !newVisibility.equals(previousVisibility)) {
            tarantulaRepository.setVisibilityByUserId(userId, collectionPublic);
        }
        profile.setStorefrontName(cleanText(storefrontName, 120));
        profile.setStorefrontTagline(cleanText(storefrontTagline, 180));
        profile.setStorefrontShippingPolicy(cleanText(storefrontShippingPolicy, 1000));
        profile.setStorefrontLagPolicy(cleanText(storefrontLagPolicy, 1000));
        profile.setShipsTo(normalizeShipsToCsv(shipsTo));
        return mapUserProfile(userRepository.save(profile));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMyProfile(UUID userId) {
        User profile = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        Map<String, Object> out = mapUserProfile(profile);
        CollectionFlavorStats flavor = computeCollectionFlavorStats(userId);
        out.put("badges", computeBadges(userId, flavor));
        out.put("badgesProgress", computeBadgeProgress(userId, flavor));
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

        // Fire-and-forget wishlist alerts to species watchers (runs on pushExecutor).
        try {
            String priceLabel = listing.getPriceAmount() == null
                    ? null
                    : listing.getPriceAmount().toPlainString() + (listing.getCurrency() == null ? "" : " " + listing.getCurrency());
            speciesWatchService.notifyWatchersAsync(
                    listing.getSpeciesName(),
                    listing.getId(),
                    userId,
                    listing.getTitle(),
                    priceLabel);
        } catch (RuntimeException ignored) {
            // Wishlist alerts are best-effort; never break listing creation.
        }

        Map<String, Object> out = mapListing(listing);
        out.put("listingBoostAvailable", billingService.isListingBoostCheckoutAvailable());
        out.put("sellerProgram", sellerProgram);
        if (requestListingBoost) {
            if (vendorBoostCreditService.consumeForListing(userId, listing.getId())) {
                out = mapListing(marketplaceListingRepository.findById(listing.getId()).orElse(listing));
                out.put("listingBoostAvailable", billingService.isListingBoostCheckoutAvailable());
                out.put("sellerProgram", sellerProgram);
                out.put("boostAppliedViaCredit", true);
            } else if (billingService.isListingBoostCheckoutAvailable()) {
                try {
                    String url = billingService.createListingBoostCheckoutSession(userId, seller.getEmail(), listing.getId());
                    out.put("boostCheckoutUrl", url);
                } catch (Exception ignored) {
                    // Listing is still published; boost checkout can be retried later if we add that flow.
                }
            } else {
                throw new IllegalArgumentException("No tienes créditos de boost disponibles y el checkout no está configurado.");
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
        MarketplaceListing saved = marketplaceListingRepository.save(listing);
        if ("sold".equalsIgnoreCase(next)) {
            notifyReviewRequestsForListing(saved);
        }
        return mapListing(saved);
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
                                                    BigDecimal minPrice, BigDecimal maxPrice,
                                                    String shipsToCountry) {
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
        final String shipsToCountryNorm = normalizeFilter(shipsToCountry) == null
                ? null
                : shipsToCountry.trim().toUpperCase(java.util.Locale.ROOT);
        List<Map<String, Object>> peer = peerPublicListings(
                q, status, categoryNorm, filterCountry, filterState, filterCity, nearCountryNorm, nearStateNorm, nearCityNorm,
                listingOriginNorm, hasRegulatoryRefs, sellerTier, verifiedOnly, boostedOnly, hasImage, minPrice, maxPrice,
                shipsToCountryNorm
        );
        int partnerCap = dynamicPartnerCap(peer.size(), partner.size());
        List<Map<String, Object>> out = new ArrayList<>(partnerCap + peer.size());
        out.addAll(partner.stream().limit(partnerCap).collect(Collectors.toList()));
        out.addAll(peer);
        int max = Math.max(50, publicListingsMax);
        List<Map<String, Object>> limited = out.stream().limit(max).collect(Collectors.toList());
        enrichListingsWithViewCounts(limited);
        return limited;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listVerifiedVendors(int limit) {
        int cap = Math.min(Math.max(limit, 1), 24);
        return userRepository.findVerifiedBreedersForAdmin(PageRequest.of(0, cap)).stream()
                .map(u -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("userId", u.getId());
                    row.put("handle", u.getPublicHandle() == null ? "" : u.getPublicHandle());
                    row.put("storefrontName", u.getStorefrontName() == null ? "" : u.getStorefrontName());
                    row.put("displayName", u.getDisplayName() == null ? "" : u.getDisplayName());
                    row.put("profilePhoto", u.getProfilePhoto() == null ? "" : u.getProfilePhoto());
                    row.put("activeListingCount",
                            marketplaceListingRepository.countBySellerUserIdAndStatusIgnoreCase(u.getId(), "active"));
                    return row;
                })
                .collect(Collectors.toList());
    }

    public record SpeciesMarketplaceSeoSection(long activeListingCount, List<Map<String, Object>> recentListings) {}

    /** Active peer + partner listings for a species SEO snapshot (read-only aggregate). */
    @Transactional(readOnly = true)
    public SpeciesMarketplaceSeoSection speciesListingsForSeo(String scientificName, Integer speciesId) {
        String name = scientificName == null ? "" : scientificName.trim();
        if (name.isEmpty()) {
            return new SpeciesMarketplaceSeoSection(0, List.of());
        }
        long peerCount = marketplaceListingRepository.countByStatusIgnoreCaseAndSpeciesNameIgnoreCase("active", name);
        long partnerCount = partnerListingRepository.countActiveForSpecies(PartnerListingStatus.ACTIVE, speciesId, name);
        long total = peerCount + partnerCount;

        Map<UUID, OfficialVendor> eligibleVendors = officialVendorRepository
                .findByPartnerProgramTierInAndListingImportEnabledTrueAndEnabledTrueOrderByInfluenceScoreDesc(
                        STRATEGIC_PARTNER_FEED_TIERS)
                .stream()
                .collect(Collectors.toMap(OfficialVendor::getId, v -> v, (a, b) -> a, LinkedHashMap::new));

        List<Map<String, Object>> peerRows = marketplaceListingRepository
                .findTop20ByStatusIgnoreCaseAndSpeciesNameIgnoreCaseOrderByCreatedAtDesc("active", name)
                .stream()
                .map(this::mapListing)
                .collect(Collectors.toList());

        List<Map<String, Object>> partnerRows = partnerListingRepository
                .findRecentActiveForSpecies(PartnerListingStatus.ACTIVE, speciesId, name)
                .stream()
                .filter(p -> eligibleVendors.containsKey(p.getOfficialVendorId()))
                .filter(p -> {
                    OfficialVendor v = eligibleVendors.get(p.getOfficialVendorId());
                    return PartnerListingTarantulaFilter.isAllowedMonarchListing(
                            p.getTitle(), p.getDescription(), p.getListingCategory(),
                            v == null ? null : v.getSlug());
                })
                .limit(20)
                .map(p -> mapPartnerListing(p, eligibleVendors.get(p.getOfficialVendorId())))
                .collect(Collectors.toList());

        List<Map<String, Object>> merged = new ArrayList<>(peerRows.size() + partnerRows.size());
        merged.addAll(peerRows);
        merged.addAll(partnerRows);
        merged.sort((a, b) -> {
            Instant ia = listingRowInstant(a);
            Instant ib = listingRowInstant(b);
            if (ia == null && ib == null) return 0;
            if (ia == null) return 1;
            if (ib == null) return -1;
            return ib.compareTo(ia);
        });
        return new SpeciesMarketplaceSeoSection(total, merged.stream().limit(10).collect(Collectors.toList()));
    }

    private static Instant listingRowInstant(Map<String, Object> row) {
        Object v = row.get("createdAt");
        if (v instanceof Instant i) {
            return i;
        }
        if (v != null) {
            try {
                return Instant.parse(v.toString());
            } catch (Exception ignored) {
                return null;
            }
        }
        return null;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> publicPartnerCatalog(String vendorSlug,
                                                    String listingCategory,
                                                    String q,
                                                    Boolean promotedOnly) {
        OfficialVendor vendor = officialVendorRepository.findBySlug(vendorSlug)
                .orElseThrow(() -> new NotFoundException("Partner no encontrado"));
        if (!isVendorEligibleForPublicFeed(vendor)) {
            throw new NotFoundException("Partner no disponible");
        }
        final String categoryNorm = listingCategory == null || listingCategory.isBlank()
                || "all".equalsIgnoreCase(listingCategory.trim())
                ? null
                : MarketplaceListingCategories.normalizeOrDefault(listingCategory);
        final String queryNorm = normalizeFilter(q);

        List<PartnerListing> allActive = partnerListingRepository
                .findByOfficialVendorIdAndStatusInOrderByPromotedDescLastSyncedAtDesc(
                        vendor.getId(), List.of(PartnerListingStatus.ACTIVE));

        long catalogTotal = allActive.stream()
                .filter(p -> PartnerListingTarantulaFilter.isAllowedMonarchListing(
                        p.getTitle(), p.getDescription(), p.getListingCategory(), vendor.getSlug()))
                .count();

        List<Map<String, Object>> items = allActive.stream()
                .filter(p -> categoryNorm == null || matchesPartnerListingCategoryFilter(p, categoryNorm))
                .filter(p -> queryNorm == null || partnerMatchesQuery(p, queryNorm))
                .filter(p -> promotedOnly == null || !promotedOnly || Boolean.TRUE.equals(p.getPromoted()))
                .filter(p -> PartnerListingTarantulaFilter.isAllowedMonarchListing(
                        p.getTitle(), p.getDescription(), p.getListingCategory(), vendor.getSlug()))
                .map(p -> mapPartnerListing(p, vendor))
                .collect(Collectors.toList());
        enrichListingsWithViewCounts(items);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("vendor", mapOfficialVendorSummary(vendor));
        out.put("items", items);
        out.put("total", items.size());
        out.put("catalogTotal", catalogTotal);
        out.put("promotedCount", items.stream().filter(i -> Boolean.TRUE.equals(i.get("promoted"))).count());
        return out;
    }

    private void enrichListingsWithViewCounts(List<Map<String, Object>> listings) {
        if (listings == null || listings.isEmpty()) {
            return;
        }
        List<UUID> ids = listings.stream()
                .map(m -> m.get("id"))
                .filter(UUID.class::isInstance)
                .map(UUID.class::cast)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (ids.isEmpty()) {
            return;
        }
        Map<UUID, Long> viewCounts = new HashMap<>();
        List<Object[]> rows = listingEventRepository.aggregateByListingAndKindSince(ids, Instant.EPOCH);
        if (rows != null) {
            for (Object[] row : rows) {
                if (row == null || row.length < 3 || !(row[0] instanceof UUID listingId)) {
                    continue;
                }
                if (!"view".equals(String.valueOf(row[1]))) {
                    continue;
                }
                viewCounts.put(listingId, ((Number) row[2]).longValue());
            }
        }
        for (Map<String, Object> listing : listings) {
            Object idObj = listing.get("id");
            UUID id = idObj instanceof UUID u ? u : null;
            listing.put("viewCount", id == null ? 0L : viewCounts.getOrDefault(id, 0L));
        }
    }

    private Map<String, Object> mapOfficialVendorSummary(OfficialVendor vendor) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", vendor.getId());
        out.put("slug", vendor.getSlug());
        out.put("name", vendor.getName());
        out.put("websiteUrl", vendor.getWebsiteUrl());
        out.put("country", vendor.getCountry());
        out.put("state", vendor.getState() == null ? "" : vendor.getState());
        out.put("city", vendor.getCity() == null ? "" : vendor.getCity());
        out.put("note", vendor.getNote() == null ? "" : vendor.getNote());
        out.put("badge", vendor.getBadge() == null ? "" : vendor.getBadge());
        out.put("shipsToCountries", splitVendorCountries(vendor.getShipsToCountries()));
        out.put("partnerProgramTier", vendor.getPartnerProgramTier() == null ? null : vendor.getPartnerProgramTier().name());
        out.put("isFoundingPartner", vendor.getPartnerProgramTier() != null && vendor.getPartnerProgramTier().isFoundingPartner());
        out.put("partnerTier", partnerTierKey(vendor.getPartnerProgramTier()));
        out.put("nationalShipping", Boolean.TRUE.equals(vendor.getNationalShipping()));
        out.put("listingImportEnabled", Boolean.TRUE.equals(vendor.getListingImportEnabled()));
        out.put("storefrontPath", vendor.getSlug() == null ? null : "/partner/" + vendor.getSlug());
        return out;
    }

    private List<String> splitVendorCountries(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toList());
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
        if (strategicBootstrapMode && peerCount < 30) {
            return Math.min(hardCap, partnerAvailable);
        }
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

    /**
     * Quote for listing price / agreed subtotal. TarantulApp does not custody peer-to-peer payments today;
     * platform sale fees are via vendor subscription tiers, not per-checkout commission. Values here stay
     * aligned with that model (no deducted commission; optional Connect-style holds are roadmap-only).
     */
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
        BigDecimal normalized = subtotal.setScale(2, RoundingMode.HALF_UP);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("listingId", listing.getId());
        out.put("currency", listing.getCurrency());
        out.put("subtotal", normalized);
        out.put("commissionRate", BigDecimal.ZERO);
        out.put("commissionAmount", BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        out.put("sellerPayoutAmount", normalized);
        out.put("sellerTier", sellerTier);
        out.put("payoutHoldDays", 0);
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
        return tier != null && tier.isOfficialPartner() && STRATEGIC_PARTNER_FEED_TIERS.contains(tier);
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
        Map<String, Object> responseStats = computeResponseStats(sellerUserId);
        out.put("avgResponseHours", responseStats.get("avgResponseHours"));
        out.put("responseBadge", responseStats.get("responseBadge"));
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
                                                         Boolean hasImage, BigDecimal minPrice, BigDecimal maxPrice,
                                                         String shipsToCountryNorm) {
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
        java.util.Collection<MarketplaceListing> deduped = byTitle.stream()
                .collect(Collectors.toMap(MarketplaceListing::getId, m -> m, (a, b) -> a, LinkedHashMap::new))
                .values();
        final java.util.Map<UUID, String> sellerShipsTo;
        if (shipsToCountryNorm == null) {
            sellerShipsTo = java.util.Map.of();
        } else {
            java.util.Set<UUID> sellerIds = deduped.stream()
                    .map(MarketplaceListing::getSellerUserId)
                    .filter(java.util.Objects::nonNull)
                    .collect(Collectors.toSet());
            sellerShipsTo = userRepository.findAllById(sellerIds).stream()
                    .collect(Collectors.toMap(User::getId, u -> u.getShipsTo() == null ? "" : u.getShipsTo(), (a, b) -> a));
        }
        return deduped.stream()
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
                .filter(m -> shipsToCountryNorm == null
                        || shipsToCountryAllowed(sellerShipsTo.get(m.getSellerUserId()), shipsToCountryNorm))
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

        return partnerListingRepository.findTop3000ByStatusOrderByPromotedDescLastSyncedAtDesc(PartnerListingStatus.ACTIVE)
                .stream()
                .filter(p -> eligibleVendorById.containsKey(p.getOfficialVendorId()))
                .filter(p -> {
                    OfficialVendor v = eligibleVendorById.get(p.getOfficialVendorId());
                    return PartnerListingTarantulaFilter.isAllowedMonarchListing(
                            p.getTitle(), p.getDescription(), p.getListingCategory(),
                            v == null ? null : v.getSlug());
                })
                .filter(p -> matchesPartnerListingCategoryFilter(p, categoryNorm))
                .filter(p -> queryNorm == null || partnerMatchesQuery(p, queryNorm))
                .filter(p -> filterCountry == null || filterCountry.equals(normalizeFilter(p.getCountry())))
                .filter(p -> filterState == null || filterState.equals(normalizeFilter(p.getState())))
                .filter(p -> filterCity == null || filterCity.equals(normalizeFilter(p.getCity())))
                .sorted(Comparator
                        .comparing((PartnerListing p) -> Boolean.TRUE.equals(p.getPromoted())).reversed()
                        .thenComparingInt((PartnerListing p) -> founderBoost(eligibleVendorById.get(p.getOfficialVendorId()))).reversed()
                        .thenComparingInt((PartnerListing p) -> partnerProximityScore(p, nearCountryNorm, nearStateNorm, nearCityNorm)).reversed()
                        .thenComparing(PartnerListing::getLastSyncedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(Math.max(1, partnerFeedHardCap))
                .map(p -> mapPartnerListing(p, eligibleVendorById.get(p.getOfficialVendorId())))
                .collect(Collectors.toList());
    }

    private int founderBoost(OfficialVendor vendor) {
        if (vendor != null && vendor.getPartnerProgramTier() != null && vendor.getPartnerProgramTier().isFoundingPartner()) {
            return 25;
        }
        return 0;
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
        UUID threadId = resolveEligibleThreadId(sellerUserId, reviewerUserId, listingId);
        if (sellerReviewRepository.existsByChatThreadId(threadId)) {
            throw new IllegalArgumentException("Ya dejaste una review para esta conversacion");
        }
        SellerReview review = new SellerReview();
        review.setSellerUserId(sellerUserId);
        review.setReviewerUserId(reviewerUserId);
        review.setListingId(listingId);
        review.setChatThreadId(threadId);
        review.setRating(rating.shortValue());
        review.setComment(cleanText(comment, 500));
        return mapReview(sellerReviewRepository.save(review));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getReviewEligibility(UUID reviewerUserId, UUID listingId) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("eligible", false);
        if (reviewerUserId == null || listingId == null) {
            return out;
        }
        MarketplaceListing listing = marketplaceListingRepository.findById(listingId).orElse(null);
        if (listing == null || listing.getSellerUserId().equals(reviewerUserId)) {
            return out;
        }
        try {
            UUID threadId = resolveEligibleThreadId(listing.getSellerUserId(), reviewerUserId, listingId);
            if (sellerReviewRepository.existsByChatThreadId(threadId)) {
                out.put("alreadyReviewed", true);
                out.put("threadId", threadId);
                return out;
            }
            out.put("eligible", true);
            out.put("threadId", threadId);
            out.put("sellerUserId", listing.getSellerUserId());
            out.put("listingId", listingId);
            return out;
        } catch (IllegalArgumentException e) {
            return out;
        }
    }

    private UUID resolveEligibleThreadId(UUID sellerUserId, UUID reviewerUserId, UUID listingId) {
        UUID[] pair = orderedPair(sellerUserId, reviewerUserId);
        UUID threadId = chatThreadRepository.findByUserLowAndUserHighAndListingId(pair[0], pair[1], listingId)
                .orElseThrow(() -> new IllegalArgumentException("Solo puedes reseñar después de conversar en el chat del listing"))
                .getId();
        assertThreadEligibleForReview(threadId, sellerUserId, reviewerUserId);
        return threadId;
    }

    private void assertThreadEligibleForReview(UUID threadId, UUID sellerUserId, UUID reviewerUserId) {
        long totalMessages = chatMessageRepository.countByThreadId(threadId);
        long sellerMessages = chatMessageRepository.countByThreadIdAndSenderUserId(threadId, sellerUserId);
        long reviewerMessages = chatMessageRepository.countByThreadIdAndSenderUserId(threadId, reviewerUserId);
        if (totalMessages < MIN_MESSAGES_TO_ENABLE_REVIEW
                || sellerMessages < MIN_MESSAGES_PER_PARTICIPANT
                || reviewerMessages < MIN_MESSAGES_PER_PARTICIPANT) {
            throw new IllegalArgumentException("La reseña se habilita tras al menos 6 mensajes y participación de ambas partes");
        }
    }

    private void notifyReviewRequestsForListing(MarketplaceListing listing) {
        UUID sellerId = listing.getSellerUserId();
        for (ChatThread thread : chatThreadRepository.findByListingId(listing.getId())) {
            UUID buyerId = sellerId.equals(thread.getUserLow()) ? thread.getUserHigh() : thread.getUserLow();
            if (buyerId.equals(sellerId)) {
                continue;
            }
            try {
                assertThreadEligibleForReview(thread.getId(), sellerId, buyerId);
            } catch (IllegalArgumentException e) {
                continue;
            }
            if (sellerReviewRepository.existsByChatThreadId(thread.getId())) {
                continue;
            }
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("listingId", listing.getId().toString());
            data.put("threadId", thread.getId().toString());
            data.put("sellerUserId", sellerId.toString());
            notificationService.create(
                    buyerId,
                    sellerId,
                    "REVIEW_REQUESTED",
                    "Deja una reseña",
                    "¿Cómo fue tu experiencia con este vendedor?",
                    data);
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
        CollectionFlavorStats flavor = computeCollectionFlavorStats(sellerUserId);
        out.put("badges", computeBadges(sellerUserId, flavor));
        out.put("badgesProgress", computeBadgeProgress(sellerUserId, flavor));
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
        CollectionFlavorStats flavor = computeCollectionFlavorStats(userId);
        out.put("badges", computeBadges(userId, flavor));
        out.put("badgesProgress", computeBadgeProgress(userId, flavor));
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
        out.put("sellerStorefrontVerified", seller != null && seller.getStorefrontVerifiedAt() != null);
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
        out.put("vendorBoostCreditsAvailable", vendorBoostCreditService.countAvailable(seller != null ? seller.getId() : null));
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

    private String sellerProgramTierKey(User seller) {
        if (seller == null) return "community";
        if (Boolean.TRUE.equals(seller.getVerifiedBreeder())) return "vendor";
        if (UserPlan.PRO.equals(seller.getPlan())) return "pro";
        return "community";
    }

    private static String partnerTierKey(PartnerProgramTier tier) {
        if (tier == null) return null;
        return tier.isFoundingPartner() ? "founding" : "official";
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
        boolean founding = vendor != null && vendor.getPartnerProgramTier() != null && vendor.getPartnerProgramTier().isFoundingPartner();
        out.put("isFoundingPartner", founding);
        out.put("partnerTier", partnerTierKey(vendor == null ? null : vendor.getPartnerProgramTier()));
        out.put("badgeLabel", vendor == null || vendor.getBadge() == null
                ? (founding ? "Founding partner" : "Official partner")
                : vendor.getBadge());
        out.put("partnerExternalId", listing.getExternalId());
        out.put("promoted", Boolean.TRUE.equals(listing.getPromoted()));
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
            vendorMeta.put("partnerTier", partnerTierKey(vendor.getPartnerProgramTier()));
            vendorMeta.put("isFoundingPartner", founding);
            vendorMeta.put("listingImportEnabled", Boolean.TRUE.equals(vendor.getListingImportEnabled()));
            vendorMeta.put("enabled", Boolean.TRUE.equals(vendor.getEnabled()));
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
        out.put("storefrontVerified", p.getStorefrontVerifiedAt() != null);
        out.put("storefrontVerifiedAt", p.getStorefrontVerifiedAt());
        out.put("storefrontName", p.getStorefrontName() == null ? "" : p.getStorefrontName());
        out.put("storefrontTagline", p.getStorefrontTagline() == null ? "" : p.getStorefrontTagline());
        out.put("storefrontShippingPolicy", p.getStorefrontShippingPolicy() == null ? "" : p.getStorefrontShippingPolicy());
        out.put("storefrontLagPolicy", p.getStorefrontLagPolicy() == null ? "" : p.getStorefrontLagPolicy());
        out.put("country", p.getProfileCountry() == null ? "" : p.getProfileCountry());
        out.put("state", p.getProfileState() == null ? "" : p.getProfileState());
        out.put("city", p.getProfileCity() == null ? "" : p.getProfileCity());
        out.put("shipsTo", parseShipsToList(p.getShipsTo()));
        out.put("profilePhoto", p.getProfilePhoto() == null ? "" : p.getProfilePhoto());
        out.put("searchVisible", p.getSearchVisible() == null || p.getSearchVisible());
        out.put("communityProfileVisibility", normalizeCommunityProfileVisibility(p.getCommunityProfileVisibility()));
        out.put("defaultTarantulaPublic", Boolean.TRUE.equals(p.getDefaultTarantulaPublic()));
        Map<String, Object> responseStats = computeResponseStats(p.getId());
        out.put("avgResponseHours", responseStats.get("avgResponseHours"));
        out.put("responseBadge", responseStats.get("responseBadge"));
        return out;
    }

    private Map<String, Object> computeResponseStats(UUID sellerUserId) {
        Double avg = chatMessageRepository.avgSellerResponseHoursLast60d(sellerUserId);
        Map<String, Object> out = new LinkedHashMap<>();
        if (avg == null || avg.isNaN() || avg <= 0) {
            out.put("avgResponseHours", null);
            out.put("responseBadge", null);
            return out;
        }
        double rounded = Math.round(avg * 10.0) / 10.0;
        out.put("avgResponseHours", rounded);
        out.put("responseBadge", responseBadgeForHours(avg));
        return out;
    }

    private static String responseBadgeForHours(double hours) {
        if (hours < 2) return "under_2h";
        if (hours < 24) return "under_24h";
        if (hours < 72) return "under_72h";
        return null;
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
        Map<String, Object> responseStats = computeResponseStats(sellerUserId);
        metrics.put("avgResponseHours", responseStats.get("avgResponseHours"));
        metrics.put("responseBadge", responseStats.get("responseBadge"));
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

    private static Map<String, Object> badgeRow(String key, String label, String tier) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("key", key);
        m.put("label", label);
        m.put("tier", tier);
        return m;
    }

    private List<Map<String, Object>> computeBadges(UUID userId, CollectionFlavorStats f) {
        long aliveTotal = tarantulaRepository.countByUserIdAndDeceasedAtIsNull(userId);
        long totalEver = tarantulaRepository.countByUserId(userId);
        long speciesAlive = tarantulaRepository.countDistinctSpeciesAliveByUserId(userId);
        long feeding = feedingLogRepository.countByOwnerUserId(userId);
        long molts = moltLogRepository.countByOwnerUserId(userId);
        long behavior = behaviorLogRepository.countByOwnerUserId(userId);
        long events = feeding + molts + behavior;
        int qrPrints = userRepository.findById(userId).map(u -> u.getQrPrintExports() == null ? 0 : u.getQrPrintExports()).orElse(0);
        long listings = marketplaceListingRepository.countBySellerUserId(userId);
        long reviews = sellerReviewRepository.countBySellerUserId(userId);
        long sexVotes = sexIdCaseVoteRepository.countByVoterUserId(userId);

        List<Map<String, Object>> badges = new ArrayList<>();
        if (totalEver >= 1) {
            badges.add(badgeRow("starter_keeper", "Starter keeper", "core"));
        }
        if (aliveTotal >= 5) {
            badges.add(badgeRow("collection_5", "Growing collection (5+ living)", "core"));
        }
        if (aliveTotal >= 10) {
            badges.add(badgeRow("collection_10", "Collection 10+ (living)", "core"));
        }
        if (aliveTotal >= 25) {
            badges.add(badgeRow("collection_25", "Serious collection (25+ living)", "notable"));
        }
        if (aliveTotal >= 50) {
            badges.add(badgeRow("collection_50", "Colossus keeper (50+ living)", "elite"));
        }
        if (speciesAlive >= 3) {
            badges.add(badgeRow("species_3", "Species explorer (3+)", "core"));
        }
        if (speciesAlive >= 5) {
            badges.add(badgeRow("species_5", "Species diversity 5+", "notable"));
        }
        if (speciesAlive >= 12) {
            badges.add(badgeRow("species_12", "Species diversity 12+", "notable"));
        }
        if (speciesAlive >= 20) {
            badges.add(badgeRow("species_20", "Taxonomy buff (20+ species)", "elite"));
        }
        if (events >= 30) {
            badges.add(badgeRow("logger_30", "Active logbook (30+ events)", "core"));
        }
        if (events >= 100) {
            badges.add(badgeRow("logger_100", "Dedicated logger (100+ events)", "notable"));
        }
        if (events >= 300) {
            badges.add(badgeRow("logger_300", "Chronicler (300+ events)", "elite"));
        }
        if (molts >= 10) {
            badges.add(badgeRow("molt_10", "Molt tracker (10+ molts logged)", "core"));
        }
        if (molts >= 40) {
            badges.add(badgeRow("molt_40", "Shedding scholar (40+ molts)", "notable"));
        }
        if (molts >= 100) {
            badges.add(badgeRow("molt_100", "Instar archivist (100+ molts)", "elite"));
        }
        if (feeding >= 25) {
            badges.add(badgeRow("feed_25", "Feeding routine (25+ feeds)", "core"));
        }
        if (feeding >= 100) {
            badges.add(badgeRow("feed_100", "Consistent feeder (100+ feeds)", "notable"));
        }
        if (feeding >= 300) {
            badges.add(badgeRow("feed_300", "Power feeder (300+ feeds)", "elite"));
        }
        if (qrPrints >= 1) {
            badges.add(badgeRow("qr_printed", "Labeled terrarium (printed QR)", "core"));
        }
        if (qrPrints >= 10) {
            badges.add(badgeRow("qr_printed_10", "QR labeler pro (10+ prints)", "notable"));
        }
        if (qrPrints >= 25) {
            badges.add(badgeRow("qr_printed_25", "QR print factory (25+ prints)", "elite"));
        }
        if (listings >= 1) {
            badges.add(badgeRow("seller_listed_1", "Marketplace debut", "core"));
        }
        if (listings >= 5) {
            badges.add(badgeRow("seller_listed_5", "Active seller (5+ listings)", "notable"));
        }
        if (listings >= 15) {
            badges.add(badgeRow("seller_listed_15", "Marketplace regular (15+ listings)", "elite"));
        }
        if (reviews >= 1) {
            badges.add(badgeRow("seller_reviewed_1", "Trusted review", "core"));
        }
        if (reviews >= 5) {
            badges.add(badgeRow("seller_reviewed_5", "Community-rated seller (5+ reviews)", "notable"));
        }
        if (sexVotes >= 10) {
            badges.add(badgeRow("sex_poll_10", "Sex-ID contributor", "core"));
        }
        if (sexVotes >= 50) {
            badges.add(badgeRow("sex_poll_50", "Crowd wisdom (50+ votes)", "notable"));
        }
        if (f.maxSpeciesInOneGenus() >= 2) {
            badges.add(badgeRow("genus_lineup_2", "Genus fan (2+ species, same genus)", "core"));
        }
        if (f.maxSpeciesInOneGenus() >= 4) {
            badges.add(badgeRow("genus_lineup_4", "Genus collector (4+ species, one genus)", "notable"));
        }
        if (f.maxSpeciesInOneGenus() >= 6) {
            badges.add(badgeRow("genus_lineup_6", "Genus deep cut (6+ species, one genus)", "elite"));
        }
        if (f.distinctGenera() >= 4) {
            badges.add(badgeRow("genera_breadth_4", "Multi-genus roster (4+ genera)", "core"));
        }
        if (f.distinctGenera() >= 8) {
            badges.add(badgeRow("genera_breadth_8", "Broad genera spread (8+ genera)", "notable"));
        }
        if (f.distinctGenera() >= 12) {
            badges.add(badgeRow("genera_breadth_12", "Taxonomic wanderer (12+ genera)", "elite"));
        }
        if (f.oldWorldAlive() >= 1 && f.newWorldAlive() >= 1) {
            badges.add(badgeRow("worlds_bridge", "Old World × New World mix", "notable"));
        }
        if (f.oldWorldAlive() >= 5) {
            badges.add(badgeRow("old_world_line_5", "Old World line-up (5+)", "core"));
        }
        if (f.oldWorldAlive() >= 12) {
            badges.add(badgeRow("old_world_line_12", "Old World heavy (12+)", "notable"));
        }
        if (f.newWorldAlive() >= 5) {
            badges.add(badgeRow("new_world_line_5", "New World line-up (5+)", "core"));
        }
        if (f.newWorldAlive() >= 12) {
            badges.add(badgeRow("new_world_line_12", "New World heavy (12+)", "notable"));
        }
        if (f.distinctHabitatTypes() >= 2) {
            badges.add(badgeRow("habitat_duo", "Habitat mix (2 eco-types)", "core"));
        }
        if (f.distinctHabitatTypes() >= 3) {
            badges.add(badgeRow("habitat_trio", "Habitat trifecta (3 eco-types)", "notable"));
        }
        if (f.slingAlive() >= 5) {
            badges.add(badgeRow("sling_den_5", "Sling colony (5+ slings)", "core"));
        }
        if (f.slingAlive() >= 12) {
            badges.add(badgeRow("sling_den_12", "Sling nursery (12+ slings)", "notable"));
        }
        if (f.slingAlive() >= 25) {
            badges.add(badgeRow("sling_den_25", "Sling factory (25+ slings)", "elite"));
        }
        if (f.size12Plus() >= 2) {
            badges.add(badgeRow("giants_row_2", "Big spiders corner (2+ at 12 cm+)", "core"));
        }
        if (f.size12Plus() >= 5) {
            badges.add(badgeRow("giants_row_5", "Heavyweight row (5+ at 12 cm+)", "notable"));
        }
        if (f.size16Plus() >= 1) {
            badges.add(badgeRow("heavyweight_1", "True heavyweight (16 cm+ logged)", "notable"));
        }
        if (f.size16Plus() >= 3) {
            badges.add(badgeRow("heavyweight_3", "Heavyweight squad (3× 16 cm+)", "elite"));
        }
        if (f.tenureDays() >= 365) {
            badges.add(badgeRow("tenure_1y", "1+ year caring for current crew", "core"));
        }
        if (f.tenureDays() >= 1095) {
            badges.add(badgeRow("tenure_3y", "3+ years of keeper patience", "notable"));
        }
        if (f.tenureDays() >= 1825) {
            badges.add(badgeRow("tenure_5y", "5+ years — seasoned keeper", "elite"));
        }
        return badges;
    }

    private Map<String, Object> computeBadgeProgress(UUID userId, CollectionFlavorStats f) {
        long aliveTotal = tarantulaRepository.countByUserIdAndDeceasedAtIsNull(userId);
        long speciesAlive = tarantulaRepository.countDistinctSpeciesAliveByUserId(userId);
        long feeding = feedingLogRepository.countByOwnerUserId(userId);
        long molts = moltLogRepository.countByOwnerUserId(userId);
        long behavior = behaviorLogRepository.countByOwnerUserId(userId);
        long events = feeding + molts + behavior;
        int qrPrints = userRepository.findById(userId).map(u -> u.getQrPrintExports() == null ? 0 : u.getQrPrintExports()).orElse(0);
        long listings = marketplaceListingRepository.countBySellerUserId(userId);
        long reviews = sellerReviewRepository.countBySellerUserId(userId);
        long sexVotes = sexIdCaseVoteRepository.countByVoterUserId(userId);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("collectionNext", progressMetricTiers(aliveTotal, new int[]{5, 10, 25, 50},
                new String[]{"Growing collection (5+ living)", "Collection 10+ (living)", "Serious collection (25+ living)", "Colossus keeper (50+ living)"},
                new String[]{"collection_5", "collection_10", "collection_25", "collection_50"}));
        out.put("speciesNext", progressMetricTiers(speciesAlive, new int[]{3, 5, 12, 20},
                new String[]{"Species explorer (3+)", "Species diversity 5+", "Species diversity 12+", "Taxonomy buff (20+ species)"},
                new String[]{"species_3", "species_5", "species_12", "species_20"}));
        out.put("eventsNext", progressMetricTiers(events, new int[]{30, 100, 300},
                new String[]{"Active logbook (30+ events)", "Dedicated logger (100+ events)", "Chronicler (300+ events)"},
                new String[]{"logger_30", "logger_100", "logger_300"}));
        out.put("moltNext", progressMetricTiers(molts, new int[]{10, 40, 100},
                new String[]{"Molt tracker (10+ molts logged)", "Shedding scholar (40+ molts)", "Instar archivist (100+ molts)"},
                new String[]{"molt_10", "molt_40", "molt_100"}));
        out.put("feedNext", progressMetricTiers(feeding, new int[]{25, 100, 300},
                new String[]{"Feeding routine (25+ feeds)", "Consistent feeder (100+ feeds)", "Power feeder (300+ feeds)"},
                new String[]{"feed_25", "feed_100", "feed_300"}));
        out.put("qrNext", progressMetricTiers(qrPrints, new int[]{1, 10, 25},
                new String[]{"Labeled terrarium (printed QR)", "QR labeler pro (10+ prints)", "QR print factory (25+ prints)"},
                new String[]{"qr_printed", "qr_printed_10", "qr_printed_25"}));
        out.put("sellerNext", progressMetricTiers(listings, new int[]{1, 5, 15},
                new String[]{"Marketplace debut", "Active seller (5+ listings)", "Marketplace regular (15+ listings)"},
                new String[]{"seller_listed_1", "seller_listed_5", "seller_listed_15"}));
        out.put("reviewNext", progressMetricTiers(reviews, new int[]{1, 5},
                new String[]{"Trusted review", "Community-rated seller (5+ reviews)"},
                new String[]{"seller_reviewed_1", "seller_reviewed_5"}));
        out.put("sexPollNext", progressMetricTiers(sexVotes, new int[]{10, 50},
                new String[]{"Sex-ID contributor", "Crowd wisdom (50+ votes)"},
                new String[]{"sex_poll_10", "sex_poll_50"}));
        out.put("genusDepthNext", progressMetricTiers(f.maxSpeciesInOneGenus(), new int[]{2, 4, 6},
                new String[]{"Genus fan (2+ species, same genus)", "Genus collector (4+ species, one genus)", "Genus deep cut (6+ species, one genus)"},
                new String[]{"genus_lineup_2", "genus_lineup_4", "genus_lineup_6"}));
        out.put("generaBreadthNext", progressMetricTiers(f.distinctGenera(), new int[]{4, 8, 12},
                new String[]{"Multi-genus roster (4+ genera)", "Broad genera spread (8+ genera)", "Taxonomic wanderer (12+ genera)"},
                new String[]{"genera_breadth_4", "genera_breadth_8", "genera_breadth_12"}));
        out.put("habitatMixNext", progressMetricTiers(f.distinctHabitatTypes(), new int[]{2, 3},
                new String[]{"Habitat mix (2 eco-types)", "Habitat trifecta (3 eco-types)"},
                new String[]{"habitat_duo", "habitat_trio"}));
        out.put("slingDenNext", progressMetricTiers(f.slingAlive(), new int[]{5, 12, 25},
                new String[]{"Sling colony (5+ slings)", "Sling nursery (12+ slings)", "Sling factory (25+ slings)"},
                new String[]{"sling_den_5", "sling_den_12", "sling_den_25"}));
        out.put("giantsRowNext", progressMetricTiers(f.size12Plus(), new int[]{2, 5},
                new String[]{"Big spiders corner (2+ at 12 cm+)", "Heavyweight row (5+ at 12 cm+)"},
                new String[]{"giants_row_2", "giants_row_5"}));
        out.put("heavyweightNext", progressMetricTiers(f.size16Plus(), new int[]{1, 3},
                new String[]{"True heavyweight (16 cm+ logged)", "Heavyweight squad (3× 16 cm+)"},
                new String[]{"heavyweight_1", "heavyweight_3"}));
        out.put("tenureNext", progressMetricTiers(f.tenureDays(), new int[]{365, 1095, 1825},
                new String[]{"1+ year caring for current crew", "3+ years of keeper patience", "5+ years — seasoned keeper"},
                new String[]{"tenure_1y", "tenure_3y", "tenure_5y"}));
        out.put("oldWorldNext", progressMetricTiers(f.oldWorldAlive(), new int[]{5, 12},
                new String[]{"Old World line-up (5+)", "Old World heavy (12+)"},
                new String[]{"old_world_line_5", "old_world_line_12"}));
        out.put("newWorldNext", progressMetricTiers(f.newWorldAlive(), new int[]{5, 12},
                new String[]{"New World line-up (5+)", "New World heavy (12+)"},
                new String[]{"new_world_line_5", "new_world_line_12"}));
        return out;
    }

    private static Map<String, Object> progressMetricTiers(long value, int[] tiers, String[] labels, String[] keys) {
        if (tiers.length != labels.length || tiers.length != keys.length || tiers.length == 0) {
            throw new IllegalArgumentException("progressMetricTiers: array length mismatch");
        }
        for (int i = 0; i < tiers.length; i++) {
            if (value < tiers[i]) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("current", value);
                m.put("target", tiers[i]);
                m.put("nextLabel", labels[i]);
                m.put("nextKey", keys[i]);
                return m;
            }
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("current", value);
        m.put("target", value);
        m.put("nextLabel", "Badge track complete");
        m.put("nextKey", "badge_track_complete");
        return m;
    }

    private Map<String, Object> computeReputation(UUID userId) {
        KeeperRankCalculator.KeeperRankDetail detail = keeperRankCalculator.computeDetail(userId);
        KeeperRankCalculator.KeeperRankSnapshot snap = detail.snapshot();
        List<Map<String, Object>> axes = detail.axes();
        Map<String, Object> out = new HashMap<>();
        out.put("score", snap.progressPercent());
        out.put("tier", snap.rankKey());
        out.put("nextTier", snap.nextTierKey());
        out.put("remainingPercent", snap.remainingPercent());
        out.put("nextTierTarget", snap.remainingPercent());
        out.put("axes", axes);
        out.put("weakestAxisKey", KeeperRankCalculator.weakestAxisKey(axes));
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
        out.put("chatThreadId", r.getChatThreadId());
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

    /** Normalizes a ships-to list into a CSV of upper-case ISO codes (dedup, max 64 entries, max 512 chars). */
    static String normalizeShipsToCsv(java.util.List<String> shipsTo) {
        if (shipsTo == null || shipsTo.isEmpty()) return null;
        java.util.LinkedHashSet<String> seen = new java.util.LinkedHashSet<>();
        for (String raw : shipsTo) {
            if (raw == null) continue;
            String code = raw.trim().toUpperCase(java.util.Locale.ROOT);
            if (code.isEmpty() || code.length() > 6) continue;
            if (!code.matches("[A-Z]{2,3}")) continue;
            seen.add(code);
            if (seen.size() >= 64) break;
        }
        if (seen.isEmpty()) return null;
        String csv = String.join(",", seen);
        return csv.length() > 512 ? csv.substring(0, 512) : csv;
    }

    /** Parses a CSV ships-to string into a list of upper-case ISO codes; null/empty → empty list. */
    static java.util.List<String> parseShipsToList(String csv) {
        if (csv == null || csv.isBlank()) return java.util.List.of();
        java.util.List<String> out = new java.util.ArrayList<>();
        for (String part : csv.split(",")) {
            String code = part == null ? "" : part.trim().toUpperCase(java.util.Locale.ROOT);
            if (!code.isEmpty()) out.add(code);
        }
        return out;
    }

    /** True if the seller's ships-to list is unset (treat as "shows in all queries") or includes the country. */
    static boolean shipsToCountryAllowed(String shipsToCsv, String country) {
        if (country == null || country.isBlank()) return true;
        java.util.List<String> list = parseShipsToList(shipsToCsv);
        if (list.isEmpty()) return true;
        String want = country.trim().toUpperCase(java.util.Locale.ROOT);
        return list.contains(want);
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

    private record CollectionFlavorStats(
            int maxSpeciesInOneGenus,
            int distinctGenera,
            int distinctHabitatTypes,
            long oldWorldAlive,
            long newWorldAlive,
            long slingAlive,
            long size12Plus,
            long size16Plus,
            long tenureDays) {
    }

    private CollectionFlavorStats computeCollectionFlavorStats(UUID userId) {
        List<String> names = tarantulaRepository.findAliveScientificNamesByUserId(userId);
        int maxGenus = maxDistinctSpeciesPerGenus(names);
        int genera = distinctGeneraCount(names);
        List<String> habitats = tarantulaRepository.findDistinctAliveHabitatTypesLowerByUserId(userId);
        int habN = habitats == null ? 0 : (int) habitats.stream().filter(h -> h != null && !h.isBlank()).count();
        long ow = 0L;
        long nw = 0L;
        List<Object[]> worldRows = tarantulaRepository.countAliveByHobbyWorld(userId);
        if (worldRows != null) {
            for (Object[] row : worldRows) {
                if (row == null || row.length < 2 || row[0] == null) {
                    continue;
                }
                String k = String.valueOf(row[0]).toLowerCase(Locale.ROOT).trim();
                long c = ((Number) row[1]).longValue();
                if ("old_world".equals(k)) {
                    ow = c;
                } else if ("new_world".equals(k)) {
                    nw = c;
                }
            }
        }
        long slings = tarantulaRepository.countAliveSlingsByUserId(userId);
        long g12 = tarantulaRepository.countAliveAtLeastSizeCm(userId, new BigDecimal("12"));
        long g16 = tarantulaRepository.countAliveAtLeastSizeCm(userId, new BigDecimal("16"));
        long tenure = tenureDaysOldestAlive(tarantulaRepository.findAlivePurchaseDateAndCreatedAt(userId));
        return new CollectionFlavorStats(maxGenus, genera, habN, ow, nw, slings, g12, g16, tenure);
    }

    private static int maxDistinctSpeciesPerGenus(List<String> scientificNames) {
        if (scientificNames == null || scientificNames.isEmpty()) {
            return 0;
        }
        Map<String, Set<String>> byGenus = new HashMap<>();
        for (String raw : scientificNames) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            String t = raw.trim();
            int sp = t.indexOf(' ');
            String genus = (sp > 0 ? t.substring(0, sp) : t).toLowerCase(Locale.ROOT);
            byGenus.computeIfAbsent(genus, k -> new HashSet<>()).add(t.toLowerCase(Locale.ROOT));
        }
        return byGenus.values().stream().mapToInt(Set::size).max().orElse(0);
    }

    private static int distinctGeneraCount(List<String> scientificNames) {
        if (scientificNames == null || scientificNames.isEmpty()) {
            return 0;
        }
        Set<String> genera = new HashSet<>();
        for (String raw : scientificNames) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            String t = raw.trim();
            int sp = t.indexOf(' ');
            String genus = (sp > 0 ? t.substring(0, sp) : t).toLowerCase(Locale.ROOT);
            genera.add(genus);
        }
        return genera.size();
    }

    private static long tenureDaysOldestAlive(List<Object[]> rows) {
        if (rows == null || rows.isEmpty()) {
            return 0L;
        }
        LocalDate today = LocalDate.now();
        LocalDate earliest = null;
        for (Object[] row : rows) {
            if (row == null || row.length < 2) {
                continue;
            }
            LocalDate pd = (LocalDate) row[0];
            LocalDateTime cat = (LocalDateTime) row[1];
            LocalDate anchor = pd != null ? pd : (cat != null ? cat.toLocalDate() : null);
            if (anchor == null) {
                continue;
            }
            if (earliest == null || anchor.isBefore(earliest)) {
                earliest = anchor;
            }
        }
        if (earliest == null) {
            return 0L;
        }
        return Math.max(0L, ChronoUnit.DAYS.between(earliest, today));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> publicMarketplaceStats() {
        long peerActive = marketplaceListingRepository.countByStatusIgnoreCase("active");
        long partnerActive = partnerListingRepository.countByStatus(PartnerListingStatus.ACTIVE);
        long strategicVendors = officialVendorRepository.findByEnabledTrueOrderByInfluenceScoreDescNameAsc().stream()
                .filter(v -> v.getPartnerProgramTier() != null
                        && STRATEGIC_PARTNER_FEED_TIERS.contains(v.getPartnerProgramTier()))
                .count();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("peerActiveListings", peerActive);
        out.put("partnerActiveListings", partnerActive);
        out.put("totalActiveListings", peerActive + partnerActive);
        out.put("strategicPartnerVendorCount", strategicVendors);
        long displayPartner = partnerActive >= 400 ? 400 : partnerActive;
        out.put("partnerListingsDisplayCount", displayPartner);
        out.put("partnerListingsDisplayPlus", partnerActive >= 400);
        return out;
    }
}
