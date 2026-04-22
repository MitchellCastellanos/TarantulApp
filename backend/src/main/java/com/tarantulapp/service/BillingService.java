package com.tarantulapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stripe.Stripe;
import com.stripe.model.billingportal.Session;
import com.stripe.param.billingportal.SessionCreateParams;
import com.tarantulapp.dto.BillingStatusResponse;
import com.tarantulapp.dto.CheckoutSessionResponse;
import com.tarantulapp.entity.BillingEmailEvent;
import com.tarantulapp.entity.MarketplaceListing;
import com.tarantulapp.entity.Subscription;
import com.tarantulapp.entity.User;
import com.tarantulapp.entity.UserPlan;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.BillingEmailEventRepository;
import com.tarantulapp.repository.MarketplaceListingRepository;
import com.tarantulapp.repository.SubscriptionRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.security.access.AccessDeniedException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class BillingService {

    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final ObjectMapper objectMapper;
    private final PlanAccessService planAccessService;
    private final EmailService emailService;
    private final BillingEmailEventRepository billingEmailEventRepository;
    private final AdminAccessService adminAccessService;
    private final MarketplaceListingRepository marketplaceListingRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    /** One-time payment price for marketplace listing boost ($2); optional. */
    @Value("${stripe.price-id-listing-boost:}")
    private String listingBoostPriceId;

    @Value("${stripe.secret-key:}")
    private String stripeSecretKey;

    @Value("${stripe.webhook-secret:}")
    private String stripeWebhookSecret;

    /** @deprecated Prefer monthly/yearly price IDs; kept for legacy checkout/webhook. */
    @Value("${stripe.price-id:}")
    private String stripePriceId;

    @Value("${stripe.price-id-monthly:}")
    private String priceIdMonthly;

    @Value("${stripe.price-id-yearly:}")
    private String priceIdYearly;

    @Value("${app.base-url:http://localhost:5173}")
    private String appBaseUrl;

    public BillingService(UserRepository userRepository,
                          SubscriptionRepository subscriptionRepository,
                          ObjectMapper objectMapper,
                          PlanAccessService planAccessService,
                          EmailService emailService,
                          BillingEmailEventRepository billingEmailEventRepository,
                          AdminAccessService adminAccessService,
                          MarketplaceListingRepository marketplaceListingRepository) {
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.objectMapper = objectMapper;
        this.planAccessService = planAccessService;
        this.emailService = emailService;
        this.billingEmailEventRepository = billingEmailEventRepository;
        this.adminAccessService = adminAccessService;
        this.marketplaceListingRepository = marketplaceListingRepository;
    }

    @Transactional(readOnly = true)
    public BillingStatusResponse getStatus(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));

        Optional<Subscription> sub = subscriptionRepository.findFirstByUserIdOrderByCreatedAtDesc(userId);

        BillingStatusResponse response = new BillingStatusResponse();
        response.setPlan((user.getPlan() != null ? user.getPlan() : UserPlan.FREE).name());
        response.setCheckoutEnabled(isCheckoutAvailable());
        sub.ifPresent(s -> {
            response.setStatus(s.getStatus());
            response.setProvider(s.getProvider());
            response.setCurrentPeriodEnd(s.getCurrentPeriodEnd());
            response.setCancelAtPeriodEnd(s.getCancelAtPeriodEnd());
        });
        return response;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getBillingMe(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));

        Map<String, Object> body = new LinkedHashMap<>();
        UserPlan plan = user.getPlan() != null ? user.getPlan() : UserPlan.FREE;
        body.put("plan", plan.name());
        body.put("checkoutEnabled", isCheckoutAvailable());
        body.put("trialEndsAt", user.getTrialEndsAt());
        body.put("readOnly", planAccessService.isReadOnly(user));
        body.put("inTrial", planAccessService.isTrialActive(user));
        body.put("overFreeLimit", planAccessService.isOverFreeTierLimit(user));
        body.put("strictReadOnly", planAccessService.isStrictReadOnly(user));
        body.put("admin", adminAccessService.isAdminEmail(user.getEmail()));

        Optional<Subscription> optSub = subscriptionRepository.findFirstByUserIdOrderByCreatedAtDesc(userId);
        if (optSub.isPresent()) {
            Subscription s = optSub.get();
            body.put("subscriptionStatus", s.getStatus());
            body.put("subscriptionProvider", s.getProvider());
            body.put("currentPeriodEnd", s.getCurrentPeriodEnd());
            body.put("cancelAtPeriodEnd", s.getCancelAtPeriodEnd());
            boolean portalOk = stripeSecretKey != null && !stripeSecretKey.isBlank()
                    && s.getProviderCustomerId() != null && !s.getProviderCustomerId().isBlank();
            body.put("portalAvailable", portalOk);
        } else {
            body.put("subscriptionStatus", null);
            body.put("subscriptionProvider", null);
            body.put("currentPeriodEnd", null);
            body.put("cancelAtPeriodEnd", null);
            body.put("portalAvailable", false);
        }
        return body;
    }

    public String createPortalSession(UUID userId) {
        if (stripeSecretKey == null || stripeSecretKey.isBlank()) {
            throw new IllegalArgumentException("STRIPE_NOT_CONFIGURED");
        }
        Subscription sub = subscriptionRepository.findFirstByUserIdOrderByCreatedAtDesc(userId).orElse(null);
        if (sub == null || sub.getProviderCustomerId() == null || sub.getProviderCustomerId().isBlank()) {
            throw new IllegalArgumentException("NO_STRIPE_CUSTOMER");
        }
        Stripe.apiKey = stripeSecretKey;
        try {
            SessionCreateParams params = SessionCreateParams.builder()
                    .setCustomer(sub.getProviderCustomerId())
                    .setReturnUrl(appBaseUrl + "/account")
                    .build();
            Session session = Session.create(params);
            return session.getUrl();
        } catch (Exception e) {
            throw new IllegalArgumentException("PORTAL_FAILED");
        }
    }

    public CheckoutSessionResponse createCheckoutSession(UUID userId, String userEmail) {
        if (!isCheckoutAvailable()) {
            throw new IllegalArgumentException("Stripe no está configurado en el backend");
        }

        String successUrl = appBaseUrl + "/pro?checkout=success";
        String cancelUrl = appBaseUrl + "/pro?checkout=cancel";

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("mode", "subscription");
        body.add("success_url", successUrl);
        body.add("cancel_url", cancelUrl);
        String price = effectivePriceId();
        if (price.isBlank()) {
            throw new IllegalArgumentException("Stripe no tiene price id configurado");
        }
        body.add("line_items[0][price]", price);
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

    public boolean isListingBoostCheckoutAvailable() {
        return stripeSecretKey != null && !stripeSecretKey.isBlank()
                && listingBoostPriceId != null && !listingBoostPriceId.isBlank();
    }

    public String createListingBoostCheckoutSession(UUID userId, String userEmail, UUID listingId) {
        if (!isListingBoostCheckoutAvailable()) {
            throw new IllegalArgumentException("LISTING_BOOST_NOT_CONFIGURED");
        }
        MarketplaceListing listing = marketplaceListingRepository.findById(listingId)
                .orElseThrow(() -> new NotFoundException("Listing no encontrado"));
        if (!listing.getSellerUserId().equals(userId)) {
            throw new AccessDeniedException("Not your listing");
        }
        String successUrl = appBaseUrl + "/marketplace?listingBoost=success&session_id={CHECKOUT_SESSION_ID}";
        String cancelUrl = appBaseUrl + "/marketplace?listingBoost=cancel";
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("mode", "payment");
        body.add("success_url", successUrl);
        body.add("cancel_url", cancelUrl);
        body.add("line_items[0][price]", listingBoostPriceId);
        body.add("line_items[0][quantity]", "1");
        body.add("client_reference_id", userId.toString());
        if (userEmail != null && !userEmail.isBlank()) {
            body.add("customer_email", userEmail);
        }
        body.add("metadata[purpose]", "listing_boost");
        body.add("metadata[userId]", userId.toString());
        body.add("metadata[listingId]", listingId.toString());
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
            throw new IllegalArgumentException("No se pudo crear la sesión de boost en Stripe");
        }
        try {
            JsonNode json = objectMapper.readTree(response.getBody());
            String url = json.path("url").asText("");
            if (url.isBlank()) {
                throw new IllegalArgumentException("Stripe no devolvió URL de checkout");
            }
            return url;
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
            if ("invoice.paid".equals(type)) {
                handleInvoicePaid(object);
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
        String mode = checkout.path("mode").asText("subscription");
        if ("payment".equals(mode)) {
            String purpose = checkout.path("metadata").path("purpose").asText("");
            if ("listing_boost".equals(purpose)) {
                String listingIdRaw = checkout.path("metadata").path("listingId").asText("");
                String userIdRaw = checkout.path("metadata").path("userId").asText("");
                if (!listingIdRaw.isBlank() && !userIdRaw.isBlank()) {
                    applyListingBoostAfterPayment(
                            UUID.fromString(listingIdRaw),
                            UUID.fromString(userIdRaw),
                            checkout
                    );
                }
            }
            return;
        }

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
        boolean wasPro = UserPlan.PRO.equals(user.getPlan());

        Subscription sub = subscriptionRepository.findByProviderSubscriptionId(subscriptionId)
                .orElseGet(Subscription::new);
        sub.setUserId(userId);
        sub.setProvider("stripe");
        sub.setProviderCustomerId(customerId.isBlank() ? null : customerId);
        sub.setProviderSubscriptionId(subscriptionId);
        String pid = effectivePriceId();
        sub.setProviderPriceId(pid.isBlank() ? null : pid);
        sub.setStatus("active");
        sub.setCancelAtPeriodEnd(false);
        subscriptionRepository.save(sub);

        user.setPlan(UserPlan.PRO);
        userRepository.save(user);
        if (!wasPro) {
            emailService.sendProActivated(user.getEmail(), user.getDisplayName());
        }
        long amountTotal = checkout.path("amount_total").asLong(0L);
        String currency = checkout.path("currency").asText("usd");
        String sessionId = checkout.path("id").asText("");
        if (amountTotal > 0 && !sessionId.isBlank()) {
            sendPaymentReceiptOnce(
                    user,
                    "PAYMENT_RECEIPT_CHECKOUT:" + sessionId,
                    amountTotal,
                    currency,
                    ""
            );
        }
    }

    private void applyListingBoostAfterPayment(UUID listingId, UUID userId, JsonNode checkout) {
        MarketplaceListing l = marketplaceListingRepository.findById(listingId).orElse(null);
        if (l == null) return;
        if (!l.getSellerUserId().equals(userId)) return;
        Instant now = Instant.now();
        Instant start = l.getBoostedUntil() != null && l.getBoostedUntil().isAfter(now) ? l.getBoostedUntil() : now;
        l.setBoostedUntil(start.plus(7, ChronoUnit.DAYS));
        marketplaceListingRepository.save(l);
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        long amountTotal = checkout.path("amount_total").asLong(0L);
        String currency = checkout.path("currency").asText("usd");
        String sessionId = checkout.path("id").asText("");
        if (amountTotal > 0 && !sessionId.isBlank()) {
            sendPaymentReceiptOnce(
                    user,
                    "PAYMENT_RECEIPT_LISTING_BOOST:" + sessionId,
                    amountTotal,
                    currency,
                    ""
            );
        }
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
        boolean wasPro = UserPlan.PRO.equals(user.getPlan());
        if (isActiveStripeStatus(status)) {
            user.setPlan(UserPlan.PRO);
            if (!wasPro) {
                emailService.sendProActivated(user.getEmail(), user.getDisplayName());
            }
        } else {
            user.setPlan(UserPlan.FREE);
            // Tras cancelar Pro: no aplicar "prueba vencida" por fecha; el modo lectura por >6 tarántulas lo gestiona PlanAccessService.
            user.setTrialEndsAt(null);
            if (wasPro) {
                String dedupeKey = "PRO_EXPIRED:" + sub.getProviderSubscriptionId() + ":" + status + ":" + sub.getCurrentPeriodEnd();
                sendProExpiredOnce(user, dedupeKey);
            }
        }
        userRepository.save(user);
    }

    private void handleInvoicePaid(JsonNode invoiceObj) {
        String invoiceId = invoiceObj.path("id").asText("");
        String subscriptionId = invoiceObj.path("subscription").asText("");
        String customerId = invoiceObj.path("customer").asText("");
        long amountPaid = invoiceObj.path("amount_paid").asLong(0L);
        String currency = invoiceObj.path("currency").asText("usd");
        String hostedInvoiceUrl = invoiceObj.path("hosted_invoice_url").asText("");

        if (invoiceId.isBlank() || amountPaid <= 0) return;

        Subscription sub = null;
        if (!subscriptionId.isBlank()) {
            sub = subscriptionRepository.findByProviderSubscriptionId(subscriptionId).orElse(null);
        }
        if (sub == null && !customerId.isBlank()) {
            sub = subscriptionRepository.findFirstByProviderCustomerIdOrderByCreatedAtDesc(customerId).orElse(null);
        }
        if (sub == null) return;

        User user = userRepository.findById(sub.getUserId()).orElse(null);
        if (user == null) return;

        sendPaymentReceiptOnce(user, "PAYMENT_RECEIPT_INVOICE:" + invoiceId, amountPaid, currency, hostedInvoiceUrl);
    }

    private void sendProExpiredOnce(User user, String eventKey) {
        if (billingEmailEventRepository.existsByEventKey(eventKey)) return;
        emailService.sendProExpired(user.getEmail(), user.getDisplayName());
        persistBillingEmailEvent(user.getId(), eventKey);
    }

    private void sendPaymentReceiptOnce(User user, String eventKey, long amountCents, String currency, String receiptUrl) {
        if (billingEmailEventRepository.existsByEventKey(eventKey)) return;
        emailService.sendPaymentReceipt(user.getEmail(), user.getDisplayName(), amountCents, currency, receiptUrl);
        persistBillingEmailEvent(user.getId(), eventKey);
    }

    private void persistBillingEmailEvent(UUID userId, String eventKey) {
        try {
            BillingEmailEvent event = new BillingEmailEvent();
            event.setUserId(userId);
            event.setEventKey(eventKey);
            billingEmailEventRepository.save(event);
        } catch (DataIntegrityViolationException ignored) {
            // Duplicate by concurrent webhook delivery.
        }
    }

    private boolean isActiveStripeStatus(String status) {
        return "active".equals(status) || "trialing".equals(status) || "past_due".equals(status);
    }

    private boolean isCheckoutAvailable() {
        if (stripeSecretKey == null || stripeSecretKey.isBlank()) {
            return false;
        }
        return (stripePriceId != null && !stripePriceId.isBlank())
                || (priceIdMonthly != null && !priceIdMonthly.isBlank())
                || (priceIdYearly != null && !priceIdYearly.isBlank());
    }

    /** First non-blank legacy or monthly/yearly price id (webhook / legacy REST checkout). */
    private String effectivePriceId() {
        if (stripePriceId != null && !stripePriceId.isBlank()) {
            return stripePriceId;
        }
        if (priceIdMonthly != null && !priceIdMonthly.isBlank()) {
            return priceIdMonthly;
        }
        if (priceIdYearly != null && !priceIdYearly.isBlank()) {
            return priceIdYearly;
        }
        return "";
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

