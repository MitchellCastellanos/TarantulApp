package com.tarantulapp.controller;

import com.stripe.Stripe;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import com.tarantulapp.entity.User;
import com.tarantulapp.entity.UserPlan;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.service.BillingService;
import com.tarantulapp.util.SecurityHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/billing")
public class BillingController {

    private static final Logger log = LoggerFactory.getLogger(BillingController.class);

    private final UserRepository userRepository;
    private final SecurityHelper securityHelper;
    private final BillingService billingService;

    @Value("${stripe.secret-key:}")
    private String stripeSecretKey;

    @Value("${stripe.webhook-secret:}")
    private String stripeWebhookSecret;

    @Value("${stripe.price-id-monthly:}")
    private String priceIdMonthly;

    @Value("${stripe.price-id-yearly:}")
    private String priceIdYearly;

    /** Region-specific Stripe Price IDs (Products dashboard). Fallback: US → legacy {@link #priceIdMonthly} / {@link #priceIdYearly}. */
    @Value("${stripe.price-id-monthly-us:}")
    private String priceIdMonthlyUs;
    @Value("${stripe.price-id-yearly-us:}")
    private String priceIdYearlyUs;
    @Value("${stripe.price-id-monthly-ca:}")
    private String priceIdMonthlyCa;
    @Value("${stripe.price-id-yearly-ca:}")
    private String priceIdYearlyCa;
    @Value("${stripe.price-id-monthly-mx:}")
    private String priceIdMonthlyMx;
    @Value("${stripe.price-id-yearly-mx:}")
    private String priceIdYearlyMx;
    @Value("${stripe.price-id-monthly-co:}")
    private String priceIdMonthlyCo;
    @Value("${stripe.price-id-yearly-co:}")
    private String priceIdYearlyCo;

    /** Vendor / Business — regional Stripe Price IDs. Blank when the Vendor products are not yet created in Stripe. */
    @Value("${stripe.price-id-vendor-monthly-us:}")
    private String vendorPriceIdMonthlyUs;
    @Value("${stripe.price-id-vendor-yearly-us:}")
    private String vendorPriceIdYearlyUs;
    @Value("${stripe.price-id-vendor-monthly-ca:}")
    private String vendorPriceIdMonthlyCa;
    @Value("${stripe.price-id-vendor-yearly-ca:}")
    private String vendorPriceIdYearlyCa;
    @Value("${stripe.price-id-vendor-monthly-mx:}")
    private String vendorPriceIdMonthlyMx;
    @Value("${stripe.price-id-vendor-yearly-mx:}")
    private String vendorPriceIdYearlyMx;
    @Value("${stripe.price-id-vendor-monthly-co:}")
    private String vendorPriceIdMonthlyCo;
    @Value("${stripe.price-id-vendor-yearly-co:}")
    private String vendorPriceIdYearlyCo;

    @Value("${app.base-url:http://localhost:5173}")
    private String baseUrl;

    public BillingController(UserRepository userRepository, SecurityHelper securityHelper,
                             BillingService billingService) {
        this.userRepository = userRepository;
        this.securityHelper = securityHelper;
        this.billingService = billingService;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMyBilling() {
        UUID userId = securityHelper.getCurrentUserId();
        Map<String, Object> payload = new LinkedHashMap<>(billingService.getBillingMe(userId));
        payload.put("androidBillingEnabled", billingService.isGooglePlayEnabled());
        payload.put("androidBillingMode", billingService.getGooglePlayMode());
        return ResponseEntity.ok(payload);
    }

    @PostMapping("/portal")
    public ResponseEntity<Map<String, Object>> createPortalSession() {
        UUID userId = securityHelper.getCurrentUserId();
        try {
            String url = billingService.createPortalSession(userId);
            return ResponseEntity.ok(Map.of("url", url));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/checkout")
    public ResponseEntity<Map<String, Object>> createCheckoutSession(
            @RequestBody(required = false) Map<String, String> body) {

        if (!isStripeConfigured()) {
            return ResponseEntity.ok(Map.of("checkoutEnabled", false, "url", ""));
        }

        UUID userId = securityHelper.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        String interval = body != null ? body.getOrDefault("interval", "month") : "month";
        String regionRaw = body != null ? body.get("region") : null;
        String tier = normalizeBillingTier(body != null ? body.get("tier") : null);
        String priceId = resolveStripePriceId(interval, regionRaw, tier);

        if (priceId == null || priceId.isBlank()) {
            return ResponseEntity.ok(Map.of("checkoutEnabled", false, "url", ""));
        }

        try {
            Stripe.apiKey = stripeSecretKey;

            SessionCreateParams params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                    .setCustomerEmail(user.getEmail())
                    .setClientReferenceId(userId.toString())
                    .addLineItem(SessionCreateParams.LineItem.builder()
                            .setPrice(priceId)
                            .setQuantity(1L)
                            .build())
                    .setSuccessUrl(baseUrl + "/pro?checkout=success&session_id={CHECKOUT_SESSION_ID}")
                    .setCancelUrl(baseUrl + "/pro?checkout=cancel")
                    .putMetadata("userId", userId.toString())
                    .putMetadata("billingRegion", normalizeBillingRegion(regionRaw))
                    .putMetadata("billingTier", tier)
                    .build();

            Session session = Session.create(params);
            log.info("Stripe session created. successUrl={} sessionUrl={}", baseUrl + "/pro?checkout=success", session.getUrl());
            return ResponseEntity.ok(Map.of(
                    "checkoutEnabled", true,
                    "url", session.getUrl()
            ));
        } catch (Exception e) {
            log.error("Stripe checkout error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Could not create checkout session"));
        }
    }

    @PostMapping("/verify-session")
    public ResponseEntity<Map<String, Object>> verifySession(
            @RequestBody Map<String, String> body) {

        String sessionId = body != null ? body.get("sessionId") : null;
        if (sessionId == null || sessionId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing sessionId"));
        }

        if (!isStripeConfigured()) {
            return ResponseEntity.ok(Map.of("plan", "FREE", "verified", false));
        }

        UUID userId = securityHelper.getCurrentUserId();

        try {
            Stripe.apiKey = stripeSecretKey;
            Session session = Session.retrieve(sessionId);

            String metaUserId = session.getMetadata() != null ? session.getMetadata().get("userId") : null;
            if (!userId.toString().equals(metaUserId)) {
                log.warn("Session {} userId mismatch: expected {} got {}", sessionId, userId, metaUserId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Session does not belong to this user"));
            }

            if ("paid".equals(session.getPaymentStatus())) {
                userRepository.findById(userId).ifPresent(user -> {
                    user.setPlan(UserPlan.PRO);
                    userRepository.save(user);
                    log.info("Verified and upgraded user {} to PRO via session {}", userId, sessionId);
                });
                return ResponseEntity.ok(Map.of("plan", "PRO", "verified", true));
            }

            return ResponseEntity.ok(Map.of("plan", "FREE", "verified", false));
        } catch (Exception e) {
            log.error("Error verifying Stripe session {}: {}", sessionId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Could not verify session"));
        }
    }

    @PostMapping("/google-play/verify")
    public ResponseEntity<Map<String, Object>> verifyGooglePlayPurchase(
            @RequestBody(required = false) Map<String, String> body) {
        UUID userId = securityHelper.getCurrentUserId();
        String purchaseToken = body != null ? body.getOrDefault("purchaseToken", "") : "";
        String productId = body != null ? body.getOrDefault("productId", "") : "";
        try {
            Map<String, Object> result = billingService.verifyGooglePlaySubscription(userId, productId, purchaseToken);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> webhook(
            @RequestBody byte[] payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        if (stripeWebhookSecret == null || stripeWebhookSecret.isBlank()) {
            return ResponseEntity.badRequest().body("Webhook secret not configured");
        }

        try {
            billingService.handleStripeWebhook(new String(payload), sigHeader);
            return ResponseEntity.ok("ok");
        } catch (IllegalArgumentException e) {
            log.warn("Stripe webhook rejected: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    private boolean isStripeConfigured() {
        return stripeSecretKey != null && !stripeSecretKey.isBlank();
    }

    private static String firstNonBlank(String... candidates) {
        if (candidates == null) {
            return "";
        }
        for (String s : candidates) {
            if (s != null && !s.isBlank()) {
                return s.trim();
            }
        }
        return "";
    }

    /**
     * Pick Stripe Price id for checkout. {@code region}: US, CA, MX, CO (case-insensitive).
     * {@code tier}: {@code pro} (default) or {@code vendor}. Vendor falls back to US Vendor only — Vendor
     * billing is review-gated, so we do not silently downgrade to the Pro price when the Vendor product is missing.
     */
    private String resolveStripePriceId(String interval, String region, String tier) {
        boolean yearly = "year".equalsIgnoreCase(String.valueOf(interval));
        String r = normalizeBillingRegion(region);
        if ("vendor".equalsIgnoreCase(String.valueOf(tier))) {
            String vUs = yearly ? vendorPriceIdYearlyUs : vendorPriceIdMonthlyUs;
            String vCa = yearly ? vendorPriceIdYearlyCa : vendorPriceIdMonthlyCa;
            String vMx = yearly ? vendorPriceIdYearlyMx : vendorPriceIdMonthlyMx;
            String vCo = yearly ? vendorPriceIdYearlyCo : vendorPriceIdMonthlyCo;
            return switch (r) {
                case "CA" -> firstNonBlank(vCa, vUs);
                case "MX" -> firstNonBlank(vMx, vUs);
                case "CO" -> firstNonBlank(vCo, vUs);
                default -> firstNonBlank(vUs);
            };
        }
        String def = yearly ? priceIdYearly : priceIdMonthly;
        String us = yearly ? priceIdYearlyUs : priceIdMonthlyUs;
        String ca = yearly ? priceIdYearlyCa : priceIdMonthlyCa;
        String mx = yearly ? priceIdYearlyMx : priceIdMonthlyMx;
        String co = yearly ? priceIdYearlyCo : priceIdMonthlyCo;
        return switch (r) {
            case "CA" -> firstNonBlank(ca, us, def);
            case "MX" -> firstNonBlank(mx, us, def);
            case "CO" -> firstNonBlank(co, us, def);
            default -> firstNonBlank(us, def);
        };
    }

    private static String normalizeBillingTier(String tier) {
        if (tier == null || tier.isBlank()) {
            return "pro";
        }
        String u = tier.trim().toLowerCase(Locale.ROOT);
        return "vendor".equals(u) ? "vendor" : "pro";
    }

    private static String normalizeBillingRegion(String region) {
        if (region == null || region.isBlank()) {
            return "US";
        }
        String u = region.trim().toUpperCase(Locale.ROOT);
        return switch (u) {
            case "CA", "CAN", "CANADA" -> "CA";
            case "MX", "MEX", "MEXICO" -> "MX";
            case "CO", "COL", "COLOMBIA" -> "CO";
            default -> "US";
        };
    }
}
