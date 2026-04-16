package com.tarantulapp.controller;

import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import com.tarantulapp.entity.User;
import com.tarantulapp.entity.UserPlan;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.util.SecurityHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/billing")
public class BillingController {

    private static final Logger log = LoggerFactory.getLogger(BillingController.class);

    private final UserRepository userRepository;
    private final SecurityHelper securityHelper;

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

    public BillingController(UserRepository userRepository, SecurityHelper securityHelper) {
        this.userRepository = userRepository;
        this.securityHelper = securityHelper;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMyBilling() {
        UUID userId = securityHelper.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        UserPlan plan = user.getPlan() != null ? user.getPlan() : UserPlan.FREE;
        boolean checkoutEnabled = isStripeConfigured();

        return ResponseEntity.ok(Map.of(
                "plan", plan.name(),
                "checkoutEnabled", checkoutEnabled
        ));
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
                    .addLineItem(SessionCreateParams.LineItem.builder()
                            .setPrice(priceId)
                            .setQuantity(1L)
                            .build())
                    .setSuccessUrl(baseUrl + "/pro?checkout=success")
                    .setCancelUrl(baseUrl + "/pro?checkout=cancel")
                    .putMetadata("userId", userId.toString())
                    .build();

            Session session = Session.create(params);
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

    @PostMapping("/webhook")
    public ResponseEntity<String> webhook(
            @RequestBody byte[] payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        if (stripeWebhookSecret == null || stripeWebhookSecret.isBlank()) {
            return ResponseEntity.badRequest().body("Webhook secret not configured");
        }

        Event event;
        try {
            event = Webhook.constructEvent(new String(payload), sigHeader, stripeWebhookSecret);
        } catch (SignatureVerificationException e) {
            log.warn("Invalid Stripe webhook signature");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature");
        }

        switch (event.getType()) {
            case "checkout.session.completed" -> {
                StripeObject obj = event.getDataObjectDeserializer().getObject().orElse(null);
                if (obj instanceof Session session) {
                    String userId = session.getMetadata().get("userId");
                    if (userId != null) {
                        userRepository.findById(UUID.fromString(userId)).ifPresent(user -> {
                            user.setPlan(UserPlan.PRO);
                            userRepository.save(user);
                            log.info("Upgraded user {} to PRO", userId);
                        });
                    }
                }
            }
            case "customer.subscription.deleted" -> {
                // Downgrade — match by customer email via session metadata not available here.
                // Implement customer.subscription.deleted handling if needed using Stripe Customer ID.
                log.info("Subscription deleted event received");
            }
            default -> log.debug("Unhandled Stripe event: {}", event.getType());
        }

        return ResponseEntity.ok("ok");
    }

    private boolean isStripeConfigured() {
        return stripeSecretKey != null && !stripeSecretKey.isBlank();
    }
}
