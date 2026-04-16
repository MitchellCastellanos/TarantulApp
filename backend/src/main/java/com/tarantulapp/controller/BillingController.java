package com.tarantulapp.controller;

import com.tarantulapp.entity.User;
import com.tarantulapp.entity.UserPlan;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/billing")
public class BillingController {

    private final UserRepository userRepository;
    private final SecurityHelper securityHelper;

    @Value("${stripe.secret-key:}")
    private String stripeSecretKey;

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
        boolean checkoutEnabled = stripeSecretKey != null && !stripeSecretKey.isBlank();

        return ResponseEntity.ok(Map.of(
                "plan", plan.name(),
                "checkoutEnabled", checkoutEnabled
        ));
    }

    @PostMapping("/checkout")
    public ResponseEntity<Map<String, Object>> createCheckoutSession() {
        boolean checkoutEnabled = stripeSecretKey != null && !stripeSecretKey.isBlank();
        if (!checkoutEnabled) {
            return ResponseEntity.ok(Map.of(
                    "checkoutEnabled", false,
                    "url", ""
            ));
        }
        // Stripe integration goes here when STRIPE_SECRET_KEY is configured
        return ResponseEntity.ok(Map.of(
                "checkoutEnabled", false,
                "url", ""
        ));
    }
}
