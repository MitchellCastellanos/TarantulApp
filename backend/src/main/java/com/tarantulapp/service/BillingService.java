package com.tarantulapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tarantulapp.dto.BillingStatusResponse;
import com.tarantulapp.dto.CheckoutSessionResponse;
import com.tarantulapp.entity.Subscription;
import com.tarantulapp.entity.User;
import com.tarantulapp.entity.UserPlan;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.SubscriptionRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

@Service
public class BillingService {

    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${stripe.secret-key:}")
    private String stripeSecretKey;

    @Value("${stripe.webhook-secret:}")
    private String stripeWebhookSecret;

    @Value("${stripe.price-id:}")
    private String stripePriceId;

    @Value("${app.base-url:http://localhost:5173}")
    private String appBaseUrl;

    public BillingService(UserRepository userRepository,
                          SubscriptionRepository subscriptionRepository,
                          ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public BillingStatusResponse getStatus(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));

        Optional<Subscription> sub = subscriptionRepository.findFirstByUserIdOrderByCreatedAtDesc(userId);

        BillingStatusResponse response = new BillingStatusResponse();
        response.setPlan((user.getPlan() != null ? user.getPlan() : UserPlan.FREE).name());
        response.setCheckoutEnabled(isCheckoutConfigured());
        sub.ifPresent(s -> {
            response.setStatus(s.getStatus());
            response.setProvider(s.getProvider());
            response.setCurrentPeriodEnd(s.getCurrentPeriodEnd());
            response.setCancelAtPeriodEnd(s.getCancelAtPeriodEnd());
        });
        return response;
    }

    public CheckoutSessionResponse createCheckoutSession(UUID userId, String userEmail) {
        if (!isCheckoutConfigured()) {
            throw new IllegalArgumentException("Stripe no está configurado en el backend");
        }

        String successUrl = appBaseUrl + "/pro?checkout=success";
        String cancelUrl = appBaseUrl + "/pro?checkout=cancel";

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("mode", "subscription");
        body.add("success_url", successUrl);
        body.add("cancel_url", cancelUrl);
        body.add("line_items[0][price]", stripePriceId);
        body.add("line_items[0][quantity]", "1");
        body.add("client_reference_id", userId.toString());
        body.add("customer_email", userEmail);
        body.add("metadata[userId]", userId.toString());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setBasicAuth(stripeSecretKey, "");

        HttpEntity<MultiValueMap<String, String>> req = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(
                "https://api.stripe.com/v1/checkout/sessions",
                req,
                String.class
        );

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new IllegalArgumentException("No se pudo crear la sesión de checkout en Stripe");
        }

        try {
            JsonNode json = objectMapper.readTree(response.getBody());
            String url = json.path("url").asText("");
            if (url.isBlank()) {
                throw new IllegalArgumentException("Stripe no devolvió URL de checkout");
            }
            return new CheckoutSessionResponse(url);
        } catch (Exception e) {
            throw new IllegalArgumentException("Respuesta inválida de Stripe");
        }
    }

    @Transactional
    public void handleStripeWebhook(String payload, String signatureHeader) {
        if (stripeWebhookSecret == null || stripeWebhookSecret.isBlank()) {
            throw new IllegalArgumentException("Webhook secret no configurado");
        }
        if (!verifyStripeSignature(payload, signatureHeader, stripeWebhookSecret)) {
            throw new IllegalArgumentException("Firma de webhook inválida");
        }

        try {
            JsonNode event = objectMapper.readTree(payload);
            String type = event.path("type").asText("");
            JsonNode object = event.path("data").path("object");

            if ("checkout.session.completed".equals(type)) {
                upsertFromCheckoutCompleted(object);
                return;
            }
            if ("customer.subscription.created".equals(type)
                    || "customer.subscription.updated".equals(type)
                    || "customer.subscription.deleted".equals(type)) {
                upsertFromSubscriptionObject(object);
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Webhook inválido");
        }
    }

    private void upsertFromCheckoutCompleted(JsonNode checkout) {
        String userIdRaw = checkout.path("client_reference_id").asText("");
        if (userIdRaw.isBlank()) {
            userIdRaw = checkout.path("metadata").path("userId").asText("");
        }
        String subscriptionId = checkout.path("subscription").asText("");
        String customerId = checkout.path("customer").asText("");

        if (userIdRaw.isBlank() || subscriptionId.isBlank()) return;

        UUID userId = UUID.fromString(userIdRaw);
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        Subscription sub = subscriptionRepository.findByProviderSubscriptionId(subscriptionId)
                .orElseGet(Subscription::new);
        sub.setUserId(userId);
        sub.setProvider("stripe");
        sub.setProviderCustomerId(customerId.isBlank() ? null : customerId);
        sub.setProviderSubscriptionId(subscriptionId);
        sub.setProviderPriceId(stripePriceId);
        sub.setStatus("active");
        sub.setCancelAtPeriodEnd(false);
        subscriptionRepository.save(sub);

        user.setPlan(UserPlan.PRO);
        userRepository.save(user);
    }

    private void upsertFromSubscriptionObject(JsonNode subscriptionObj) {
        String subscriptionId = subscriptionObj.path("id").asText("");
        if (subscriptionId.isBlank()) return;

        Subscription sub = subscriptionRepository.findByProviderSubscriptionId(subscriptionId).orElse(null);
        if (sub == null) return;

        String status = subscriptionObj.path("status").asText(sub.getStatus());
        boolean cancelAtPeriodEnd = subscriptionObj.path("cancel_at_period_end").asBoolean(false);
        long currentPeriodEndEpoch = subscriptionObj.path("current_period_end").asLong(0L);
        String priceId = subscriptionObj.path("items").path("data").path(0).path("price").path("id").asText(sub.getProviderPriceId());

        sub.setStatus(status);
        sub.setCancelAtPeriodEnd(cancelAtPeriodEnd);
        if (currentPeriodEndEpoch > 0) {
            sub.setCurrentPeriodEnd(LocalDateTime.ofInstant(Instant.ofEpochSecond(currentPeriodEndEpoch), ZoneOffset.UTC));
        }
        sub.setProviderPriceId(priceId);
        subscriptionRepository.save(sub);

        User user = userRepository.findById(sub.getUserId()).orElse(null);
        if (user == null) return;
        if (isActiveStripeStatus(status)) {
            user.setPlan(UserPlan.PRO);
        } else {
            user.setPlan(UserPlan.FREE);
            // Tras cancelar Pro: no aplicar "prueba vencida" por fecha; el modo lectura por >6 tarántulas lo gestiona PlanAccessService.
            user.setTrialEndsAt(null);
        }
        userRepository.save(user);
    }

    private boolean isActiveStripeStatus(String status) {
        return "active".equals(status) || "trialing".equals(status) || "past_due".equals(status);
    }

    private boolean isCheckoutConfigured() {
        return stripeSecretKey != null && !stripeSecretKey.isBlank()
                && stripePriceId != null && !stripePriceId.isBlank();
    }

    private boolean verifyStripeSignature(String payload, String signatureHeader, String webhookSecret) {
        if (signatureHeader == null || signatureHeader.isBlank()) return false;

        String timestamp = null;
        String v1 = null;
        for (String part : signatureHeader.split(",")) {
            String[] kv = part.split("=", 2);
            if (kv.length != 2) continue;
            if ("t".equals(kv[0])) timestamp = kv[1];
            if ("v1".equals(kv[0])) v1 = kv[1];
        }
        if (timestamp == null || v1 == null) return false;

        String signedPayload = timestamp + "." + payload;
        String expected = hmacSha256Hex(webhookSecret, signedPayload);
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), v1.getBytes(StandardCharsets.UTF_8));
    }

    private String hmacSha256Hex(String secret, String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalArgumentException("No se pudo validar firma del webhook");
        }
    }
}

