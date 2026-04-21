package com.tarantulapp.controller;

import com.tarantulapp.service.MarketplaceService;
import com.tarantulapp.util.SecurityHelper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/marketplace")
public class MarketplaceController {

    private final MarketplaceService marketplaceService;
    private final SecurityHelper securityHelper;

    public MarketplaceController(MarketplaceService marketplaceService, SecurityHelper securityHelper) {
        this.marketplaceService = marketplaceService;
        this.securityHelper = securityHelper;
    }

    record CreateListingRequest(
            @NotBlank String title,
            String description,
            String speciesName,
            String stage,
            String sex,
            BigDecimal priceAmount,
            String currency,
            String city,
            String state,
            String country,
            String imageUrl,
            String pedigreeRef
    ) {}

    record UpdateListingStatusRequest(@NotBlank String status) {}

    record UpsertKeeperProfileRequest(
            String displayName,
            String handle,
            String bio,
            String location,
            String featuredCollection,
            String contactWhatsapp,
            String contactInstagram,
            String country,
            String state,
            String city
    ) {}

    record CreateReviewRequest(
            UUID listingId,
            @Min(1) @Max(5) Integer rating,
            String comment
    ) {}

    @PutMapping("/keeper-profile")
    public ResponseEntity<Map<String, Object>> upsertMyProfile(@Valid @RequestBody UpsertKeeperProfileRequest req) {
        return ResponseEntity.ok(marketplaceService.upsertMyProfile(
                securityHelper.getCurrentUserId(),
                req.displayName(),
                req.handle(),
                req.bio(),
                req.location(),
                req.featuredCollection(),
                req.contactWhatsapp(),
                req.contactInstagram(),
                req.country(),
                req.state(),
                req.city()
        ));
    }

    @GetMapping("/keeper-profile")
    public ResponseEntity<Map<String, Object>> getMyProfile() {
        return ResponseEntity.ok(marketplaceService.getMyProfile(securityHelper.getCurrentUserId()));
    }

    @PostMapping("/listings")
    public ResponseEntity<Map<String, Object>> createListing(@Valid @RequestBody CreateListingRequest req) {
        return ResponseEntity.ok(marketplaceService.createListing(
                securityHelper.getCurrentUserId(),
                req.title(),
                req.description(),
                req.speciesName(),
                req.stage(),
                req.sex(),
                req.priceAmount(),
                req.currency(),
                req.city(),
                req.state(),
                req.country(),
                req.imageUrl(),
                req.pedigreeRef()
        ));
    }

    @PostMapping("/engagement/qr-print")
    public ResponseEntity<Map<String, String>> registerQrPrint() {
        marketplaceService.registerQrPrintExport(securityHelper.getCurrentUserId());
        return ResponseEntity.ok(Map.of("message", "ok"));
    }

    @PostMapping(value = "/keeper-profile/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadProfilePhoto(@RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(marketplaceService.uploadProfilePhoto(securityHelper.getCurrentUserId(), file));
    }

    @GetMapping("/listings/me")
    public ResponseEntity<List<Map<String, Object>>> myListings() {
        return ResponseEntity.ok(marketplaceService.myListings(securityHelper.getCurrentUserId()));
    }

    @PatchMapping("/listings/{id}/status")
    public ResponseEntity<Map<String, Object>> updateListingStatus(@PathVariable UUID id,
                                                                   @Valid @RequestBody UpdateListingStatusRequest req) {
        return ResponseEntity.ok(marketplaceService.updateListingStatus(id, securityHelper.getCurrentUserId(), req.status()));
    }

    @PostMapping("/sellers/{sellerUserId}/reviews")
    public ResponseEntity<Map<String, Object>> addSellerReview(@PathVariable UUID sellerUserId,
                                                               @Valid @RequestBody CreateReviewRequest req) {
        return ResponseEntity.ok(marketplaceService.addReview(
                sellerUserId,
                securityHelper.getCurrentUserId(),
                req.listingId(),
                req.rating(),
                req.comment()
        ));
    }
}
