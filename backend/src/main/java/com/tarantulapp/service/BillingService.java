package com.tarantulapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.billingportal.Session;
import com.stripe.net.Webhook;
import com.stripe.param.billingportal.SessionCreateParams;
import com.tarantulapp.dto.BillingStatusResponse;
import com.tarantulapp.dto.CheckoutSessionResponse;
import com.tarantulapp.entity.BillingEmailEvent;
import com.tarantulapp.entity.MarketplaceListing;
import com.tarantulapp.entity.ProcessedWebhookEvent;
import com.tarantulapp.entity.Subscription;
import com.tarantulapp.entity.User;
import com.tarantulapp.entity.UserPlan;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.BillingEmailEventRepository;
import com.tarantulapp.repository.MarketplaceListingRepository;
import com.tarantulapp.repository.ProcessedWebhookEventRepository;
import com.tarantulapp.repository.SubscriptionRepository;
import com.tarantulapp.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.security.access.AccessDeniedException;

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

    private static final Logger log = LoggerFactory.getLogger(BillingService.class);

    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final ObjectMapper objectMapper;
    private final PlanAccessService planAccessService;
    private final EmailService emailService;
    private final BillingEmailEventRepository billingEmailEventRepository;
    private final AdminAccessService adminAccessService;
    private final MarketplaceListingRepository marketplaceListingRepository;
    private final ProcessedWebhookEventRepository processedWebhookEventRepository;
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

    @Value("${billing.google-play.enabled:false}")
    private boolean googlePlayEnabled;

    @Value("${billing.google-play.mode:stub}")
    private String googlePlayMode;

    @Value("${billing.google-play.allow-test-tokens:true}")
    private boolean googlePlayAllowTestTokens;

    @Value("${billing.google-play.package-name:}")
    private String googlePlayPackageName;

    @Value("${billing.google-play.subscription-product-id:}")
    private String googlePlaySubscriptionProductId;

    /**
     * When true and the deploy looks like production, refuse Play Billing verification while
     * the provider is still in {@code stub} mode. Prevents the `enabled=true + mode=stub`
     * misconfiguration from auto-upgrading any caller to PRO with a {@code test_*} token.
     */
    @Value("${billing.google-play.production-stub-guard:true}")
    private boolean googlePlayProductionStubGuard;

    /** Falls back to {@code spring.profiles.active} so existing deployments keep working. */
    @Value("${app.environment:${spring.profiles.active:development}}")
    private String appEnvironment;

    public BillingService(UserRepository userRepository,
                          SubscriptionRepository subscriptionRepository,
                          ObjectMapper objectMapper,
                          PlanAccessService planAccessService,
                          EmailService emailService,
                          BillingEmailEventRepository billingEmailEventRepository,
                          AdminAccessService adminAccessService,
                          MarketplaceListingRepository marketplaceListingRepository,
                          ProcessedWebhookEventRepository processedWebhookEventRepository) {
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.objectMapper = objectMapper;
        this.planAccessService = planAccessService;
        this.emailService = emailService;
        this.billingEmailEventRepository = billingEmailEventRepository;
        this.adminAccessService = adminAccessService;
        this.marketplaceListingRepository = marketplaceListingRepository;
        this.processedWebhookEventRepository = processedWebhookEventRepository;
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
        body.put("isBetaTester", Boolean.TRUE.equals(user.getIsBetaTester()));

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

        // constructEvent verifies the v1 signature AND enforces a 5-minute timestamp tolerance,
        // so a captured payload cannot be replayed indefinitely. Both checks were previously DIY.
        Event event;
        try {
            event = Webhook.constructEvent(payload, signatureHeader, stripeWebhookSecret);
        } catch (SignatureVerificationException e) {
            throw new IllegalArgumentException("Firma de webhook inválida");
        }

        String eventId = event.getId();
        String type = event.getType() == null ? "" : event.getType();

        if (eventId == null || eventId.isBlank()) {
            log.warn("Stripe webhook missing event id; type={}", type);
        } else {
            if (processedWebhookEventRepository.existsById(eventId)) {
                log.debug("Stripe webhook duplicate event_id={} type={}", eventId, type);
                return;
            }
            ProcessedWebhookEvent record = new ProcessedWebhookEvent();
            record.setEventId(eventId);
            record.setSource("stripe");
            record.setEventType(type);
            try {
                processedWebhookEventRepository.saveAndFlush(record);
            } catch (DataIntegrityViolationException dup) {
                // Concurrent delivery beat us to the insert: ack and skip.
                log.debug("Stripe webhook race-duplicate event_id={} type={}", eventId, type);
                return;
            }
        }

        try {
            JsonNode payloadNode = objectMapper.readTree(payload);
            JsonNode object = payloadNode.path("data").path("object");

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
            // Rolls back both the side effects and the idempotency row, so Stripe can retry.
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

    @Transactional
    public Map<String, Object> verifyGooglePlaySubscription(UUID userId, String productId, String purchaseToken) {
        if (!googlePlayEnabled) {
            throw new IllegalArgumentException("GOOGLE_PLAY_BILLING_DISABLED");
        }
        if (purchaseToken == null || purchaseToken.isBlank()) {
            throw new IllegalArgumentException("GOOGLE_PLAY_PURCHASE_TOKEN_REQUIRED");
        }

        String trimmedToken = purchaseToken.trim();
        String resolvedProductId = (productId == null || productId.isBlank())
                ? googlePlaySubscriptionProductId
                : productId.trim();

        if (resolvedProductId == null || resolvedProductId.isBlank()) {
            throw new IllegalArgumentException("GOOGLE_PLAY_PRODUCT_ID_REQUIRED");
        }
        if (googlePlayPackageName == null || googlePlayPackageName.isBlank()) {
            throw new IllegalArgumentException("GOOGLE_PLAY_PACKAGE_NAME_REQUIRED");
        }

        boolean acceptedInStub = false;
        if ("stub".equalsIgnoreCase(googlePlayMode)) {
            // Production safety net: a stub-mode deployment in prod would let any caller
            // upgrade themselves to PRO with a `test_*` token. Refuse unless explicitly opted out.
            if (googlePlayProductionStubGuard && isProductionEnvironment()) {
                log.error("Refusing Google Play stub verification in production environment={} mode={} (set PLAY_BILLING_PRODUCTION_STUB_GUARD=false to override)",
                        appEnvironment, googlePlayMode);
                throw new IllegalArgumentException("GOOGLE_PLAY_STUB_DISABLED_IN_PRODUCTION");
            }
            boolean looksTestToken = trimmedToken.startsWith("test_")
                    || trimmedToken.startsWith("sandbox_")
                    || trimmedToken.startsWith("fake_");
            if (googlePlayAllowTestTokens && looksTestToken) {
                acceptedInStub = true;
            } else {
                throw new IllegalArgumentException("GOOGLE_PLAY_STUB_TOKEN_REJECTED");
            }
        } else {
            throw new IllegalArgumentException("GOOGLE_PLAY_REAL_MODE_NOT_IMPLEMENTED");
        }

        if (!acceptedInStub) {
            throw new IllegalArgumentException("GOOGLE_PLAY_VERIFICATION_FAILED");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        boolean wasPro = UserPlan.PRO.equals(user.getPlan());

        Subscription sub = subscriptionRepository.findByProviderSubscriptionId(trimmedToken)
                .orElseGet(Subscription::new);
        sub.setUserId(userId);
        sub.setProvider("google_play");
        sub.setProviderCustomerId(null);
        sub.setProviderSubscriptionId(trimmedToken);
        sub.setProviderPriceId(resolvedProductId);
        sub.setStatus("active");
        sub.setCancelAtPeriodEnd(false);
        sub.setCurrentPeriodEnd(LocalDateTime.now().plusDays(30));
        subscriptionRepository.save(sub);

        user.setPlan(UserPlan.PRO);
        userRepository.save(user);
        if (!wasPro) {
            emailService.sendProActivated(user.getEmail(), user.getDisplayName());
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("verified", true);
        response.put("provider", "google_play");
        response.put("mode", googlePlayMode);
        response.put("productId", resolvedProductId);
        response.put("plan", "PRO");
        response.put("currentPeriodEnd", sub.getCurrentPeriodEnd());
        return response;
    }

    public boolean isGooglePlayEnabled() {
        return googlePlayEnabled;
    }

    public String getGooglePlayMode() {
        return googlePlayMode;
    }

    private boolean isProductionEnvironment() {
        if (appEnvironment == null) return false;
        String e = appEnvironment.toLowerCase().trim();
        // Matches "production", "prod", "prd" — not "preprod" by accident:
        return e.equals("prod") || e.equals("prd") || e.equals("production")
                || e.startsWith("prod,") || e.startsWith("production,");
    }
}

