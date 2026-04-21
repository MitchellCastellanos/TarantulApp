package com.tarantulapp.controller;

import com.tarantulapp.service.MarketplaceService;
import com.tarantulapp.service.OfficialVendorService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
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

@RestController
@RequestMapping("/api/public/marketplace")
public class PublicMarketplaceController {

    private final MarketplaceService marketplaceService;
    private final OfficialVendorService officialVendorService;

    public PublicMarketplaceController(MarketplaceService marketplaceService, OfficialVendorService officialVendorService) {
        this.marketplaceService = marketplaceService;
        this.officialVendorService = officialVendorService;
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

    @GetMapping("/listings")
    public ResponseEntity<List<Map<String, Object>>> publicListings(@RequestParam(required = false) String q,
                                                                    @RequestParam(required = false) String status,
                                                                    @RequestParam(required = false) String country,
                                                                    @RequestParam(required = false) String state,
                                                                    @RequestParam(required = false) String city,
                                                                    @RequestParam(required = false) String nearCountry,
                                                                    @RequestParam(required = false) String nearState,
                                                                    @RequestParam(required = false) String nearCity) {
        return ResponseEntity.ok(marketplaceService.publicListings(
                q, status, country, state, city, nearCountry, nearState, nearCity
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

    @GetMapping("/keepers/{sellerUserId}/reviews")
    public ResponseEntity<List<Map<String, Object>>> sellerReviews(@PathVariable UUID sellerUserId) {
        return ResponseEntity.ok(marketplaceService.sellerReviews(sellerUserId));
    }
}
