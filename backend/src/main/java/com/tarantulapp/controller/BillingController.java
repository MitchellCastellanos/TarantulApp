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
        String priceId = "year".equals(interval) ? priceIdYearly : priceIdMonthly;

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
}
