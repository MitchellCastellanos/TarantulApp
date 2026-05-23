package com.tarantulapp.controller;

import com.tarantulapp.marketplace.MarketplaceListingCategories;
import com.tarantulapp.service.ListingEventService;
import com.tarantulapp.service.MarketplaceService;
import com.tarantulapp.service.OfficialVendorService;
import com.tarantulapp.service.PartnerCartHandoffService;
import com.tarantulapp.service.PartnerListingImageProxyService;
import com.tarantulapp.service.TopVendorService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/public/marketplace")
public class PublicMarketplaceController {

    private final MarketplaceService marketplaceService;
    private final OfficialVendorService officialVendorService;
    private final PartnerCartHandoffService partnerCartHandoffService;
    private final PartnerListingImageProxyService partnerListingImageProxyService;
    private final ListingEventService listingEventService;
    private final TopVendorService topVendorService;
    private final boolean futurePaidStorefrontEnabled;
    private final boolean futurePaidBadgesEnabled;
    private final boolean strategicPartnerBootstrapMode;

    record PartnerCartHandoffLine(
            @NotBlank String externalProductId,
            Integer quantity,
            String title,
            String canonicalUrl
    ) {}

    record PartnerCartHandoffRequest(
            @NotBlank String vendorSlug,
            List<PartnerCartHandoffLine> lines
    ) {}

    public PublicMarketplaceController(MarketplaceService marketplaceService,
                                       OfficialVendorService officialVendorService,
                                       PartnerCartHandoffService partnerCartHandoffService,
                                       PartnerListingImageProxyService partnerListingImageProxyService,
                                       ListingEventService listingEventService,
                                       TopVendorService topVendorService,
                                       @Value("${app.marketplace.future-paid-storefront-enabled:false}") boolean futurePaidStorefrontEnabled,
                                       @Value("${app.marketplace.future-paid-badges-enabled:false}") boolean futurePaidBadgesEnabled,
                                       @Value("${app.marketplace.strategic-bootstrap-mode:true}") boolean strategicPartnerBootstrapMode) {
        this.marketplaceService = marketplaceService;
        this.officialVendorService = officialVendorService;
        this.partnerCartHandoffService = partnerCartHandoffService;
        this.partnerListingImageProxyService = partnerListingImageProxyService;
        this.listingEventService = listingEventService;
        this.topVendorService = topVendorService;
        this.futurePaidStorefrontEnabled = futurePaidStorefrontEnabled;
        this.futurePaidBadgesEnabled = futurePaidBadgesEnabled;
        this.strategicPartnerBootstrapMode = strategicPartnerBootstrapMode;
    }

    record OfficialVendorLeadRequest(
            @NotBlank String businessName,
            String contactName,
            @NotBlank String contactEmail,
            String websiteUrl,
            String country,
            String state,
            String city,
            String shippingScope,
            String note
    ) {}

    @GetMapping("/listings/{listingId}")
    public ResponseEntity<Map<String, Object>> publicListingDetail(@PathVariable UUID listingId) {
        return ResponseEntity.ok(marketplaceService.publicListingDetail(listingId));
    }

    @GetMapping("/listings")
    public ResponseEntity<List<Map<String, Object>>> publicListings(@RequestParam(required = false) String q,
                                                                    @RequestParam(required = false) String status,
                                                                    @RequestParam(required = false) String country,
                                                                    @RequestParam(required = false) String state,
                                                                    @RequestParam(required = false) String city,
                                                                    @RequestParam(required = false) String nearCountry,
                                                                    @RequestParam(required = false) String nearState,
                                                                    @RequestParam(required = false) String nearCity,
                                                                    @RequestParam(required = false) String listingCategory,
                                                                    @RequestParam(required = false) String listingOrigin,
                                                                    @RequestParam(required = false) Boolean hasRegulatoryRefs,
                                                                    @RequestParam(required = false) String sellerTier,
                                                                    @RequestParam(required = false) Boolean verifiedOnly,
                                                                    @RequestParam(required = false) Boolean boostedOnly,
                                                                    @RequestParam(required = false) Boolean hasImage,
                                                                    @RequestParam(required = false) BigDecimal minPrice,
                                                                    @RequestParam(required = false) BigDecimal maxPrice,
                                                                    @RequestParam(required = false) String shipsToCountry) {
        return ResponseEntity.ok(marketplaceService.publicListings(
                q, status, country, state, city, nearCountry, nearState, nearCity, listingCategory, listingOrigin,
                hasRegulatoryRefs, sellerTier, verifiedOnly, boostedOnly, hasImage, minPrice, maxPrice, shipsToCountry
        ));
    }

    @GetMapping("/official-vendors")
    public ResponseEntity<List<Map<String, Object>>> officialVendors(@RequestParam(required = false) String q,
                                                                     @RequestParam(required = false) String country,
                                                                     @RequestParam(required = false) String state,
                                                                     @RequestParam(required = false) String city,
                                                                     @RequestParam(required = false) String nearCountry,
                                                                     @RequestParam(required = false) String nearState,
                                                                     @RequestParam(required = false) String nearCity) {
        return ResponseEntity.ok(officialVendorService.listOfficialVendors(
                q, country, state, city, nearCountry, nearState, nearCity
        ));
    }

    @GetMapping("/verified-vendors")
    public ResponseEntity<List<Map<String, Object>>> verifiedVendors(
            @RequestParam(defaultValue = "12") int limit) {
        return ResponseEntity.ok(marketplaceService.listVerifiedVendors(limit));
    }

    @GetMapping("/top-vendors")
    public ResponseEntity<List<Map<String, Object>>> topVendors(
            @RequestParam(defaultValue = "3") int limit) {
        return ResponseEntity.ok(topVendorService.getLiveTopVendors(limit));
    }

    @PostMapping("/official-vendors/lead")
    public ResponseEntity<Map<String, Object>> submitOfficialVendorLead(@Valid @RequestBody OfficialVendorLeadRequest req) {
        return ResponseEntity.ok(officialVendorService.submitVendorLead(
                req.businessName(),
                req.contactName(),
                req.contactEmail(),
                req.websiteUrl(),
                req.country(),
                req.state(),
                req.city(),
                req.shippingScope(),
                req.note()
        ));
    }

    @GetMapping("/keepers/{sellerUserId}")
    public ResponseEntity<Map<String, Object>> sellerProfile(@PathVariable UUID sellerUserId) {
        return ResponseEntity.ok(marketplaceService.publicSellerProfile(sellerUserId));
    }

    @GetMapping("/storefront/{handle}")
    public ResponseEntity<Map<String, Object>> storefrontByHandle(@PathVariable String handle) {
        return ResponseEntity.ok(marketplaceService.publicStorefrontByHandle(handle));
    }

    @GetMapping("/keepers/{sellerUserId}/reviews")
    public ResponseEntity<List<Map<String, Object>>> sellerReviews(@PathVariable UUID sellerUserId) {
        return ResponseEntity.ok(marketplaceService.sellerReviews(sellerUserId));
    }

    @GetMapping("/listing-boost-offer")
    public ResponseEntity<Map<String, Object>> listingBoostOffer() {
        return ResponseEntity.ok(Map.of("available", marketplaceService.isListingBoostOffered()));
    }

    @GetMapping("/deal-quote/{listingId}")
    public ResponseEntity<Map<String, Object>> dealQuote(@PathVariable UUID listingId,
                                                         @RequestParam(required = false) BigDecimal subtotal) {
        return ResponseEntity.ok(marketplaceService.dealQuote(listingId, subtotal));
    }

    @GetMapping("/partner-catalog")
    public ResponseEntity<Map<String, Object>> partnerCatalog(
            @RequestParam String vendorSlug,
            @RequestParam(required = false) String listingCategory,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Boolean promotedOnly) {
        return ResponseEntity.ok(marketplaceService.publicPartnerCatalog(vendorSlug, listingCategory, q, promotedOnly));
    }

    @GetMapping("/partner-listing-image")
    public ResponseEntity<byte[]> partnerListingImage(@RequestParam String url) {
        return partnerListingImageProxyService.fetchImage(url);
    }

    @PostMapping("/partner-cart/handoff")
    public ResponseEntity<Map<String, Object>> partnerCartHandoff(@Valid @RequestBody PartnerCartHandoffRequest req) {
        List<PartnerCartHandoffService.CartLine> lines = req.lines() == null
                ? List.of()
                : req.lines().stream()
                .map(l -> new PartnerCartHandoffService.CartLine(
                        l.externalProductId(), l.quantity(), l.title(), l.canonicalUrl()))
                .toList();
        return ResponseEntity.ok(partnerCartHandoffService.buildHandoff(req.vendorSlug(), lines));
    }

    record ListingEventRequest(
            @NotBlank String kind,
            String anonSessionId,
            String country,
            String referrerHost
    ) {}

    @PostMapping("/listings/{listingId}/events")
    public ResponseEntity<Map<String, Object>> recordListingEvent(@PathVariable UUID listingId,
                                                                   @Valid @RequestBody ListingEventRequest req) {
        boolean accepted = listingEventService.recordEvent(
                listingId,
                req.kind(),
                req.anonSessionId(),
                req.country(),
                req.referrerHost()
        );
        return ResponseEntity.ok(Map.of("accepted", accepted));
    }

    @GetMapping("/program-flags")
    public ResponseEntity<Map<String, Object>> programFlags() {
        return ResponseEntity.ok(Map.of(
                "futurePaidStorefrontEnabled", futurePaidStorefrontEnabled,
                "futurePaidBadgesEnabled", futurePaidBadgesEnabled,
                "strategicPartnerBootstrapMode", strategicPartnerBootstrapMode,
                "sellerListingTradeCertificationRequired", false,
                "communityActiveListingLimit", 5,
                "communityAllowedListingCategories", List.of(
                        MarketplaceListingCategories.TARANTULAS,
                        MarketplaceListingCategories.BREEDING_PROJECTS),
                "browseListingCategories", MarketplaceListingCategories.publicBrowseOrder(),
                "defaultBrowseCategory", MarketplaceListingCategories.DEFAULT
        ));
    }
}
