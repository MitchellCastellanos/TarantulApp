package com.tarantulapp.controller;

import com.tarantulapp.service.OfficialVendorService;
import com.tarantulapp.service.PartnerCheckoutService;
import com.tarantulapp.service.StripeConnectService;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/me/partner")
public class MePartnerController {

    private final OfficialVendorService officialVendorService;
    private final PartnerCheckoutService partnerCheckoutService;
    private final StripeConnectService stripeConnectService;
    private final SecurityHelper securityHelper;

    public MePartnerController(OfficialVendorService officialVendorService,
                              PartnerCheckoutService partnerCheckoutService,
                              StripeConnectService stripeConnectService,
                              SecurityHelper securityHelper) {
        this.officialVendorService = officialVendorService;
        this.partnerCheckoutService = partnerCheckoutService;
        this.stripeConnectService = stripeConnectService;
        this.securityHelper = securityHelper;
    }

    @GetMapping("/hub")
    public ResponseEntity<Map<String, Object>> partnerHub() {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(officialVendorService.mePartnerHub(userId));
    }

    record CheckoutModeRequest(String mode) {}
    record ShippingProfileRequest(Map<String, Object> shippingProfile) {}
    record FeatureRequestBody(String requestType, String message, Map<String, Object> payload) {}

    /** Partner self-service: choose whether checkout happens on their website or in the TarantulApp cart. */
    @PutMapping("/checkout-mode")
    public ResponseEntity<Map<String, Object>> setCheckoutMode(@RequestBody CheckoutModeRequest req) {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(officialVendorService.mePartnerSetCheckoutMode(
                userId, req == null ? null : req.mode()));
    }

    @PutMapping("/shipping-profile")
    public ResponseEntity<Map<String, Object>> updateShippingProfile(@RequestBody ShippingProfileRequest req) {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(officialVendorService.mePartnerUpdateShippingProfile(
                userId, req == null ? null : req.shippingProfile()));
    }

    @PostMapping("/feature-requests")
    public ResponseEntity<Map<String, Object>> createFeatureRequest(@RequestBody FeatureRequestBody req) {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(officialVendorService.mePartnerCreateFeatureRequest(
                userId,
                req == null ? null : req.requestType(),
                req == null ? null : req.message(),
                req == null ? null : req.payload()));
    }

    /** Recent in-app TarantulApp orders for the partner. */
    @GetMapping("/orders")
    public ResponseEntity<List<Map<String, Object>>> orders() {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(partnerCheckoutService.recentOrdersForUser(userId));
    }

    /** Start Stripe Connect onboarding so in-app payouts can route to the partner's own account. */
    @PostMapping("/stripe-connect/onboard")
    public ResponseEntity<Map<String, Object>> startStripeConnect() {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(stripeConnectService.startOnboardingForUser(userId));
    }
}
