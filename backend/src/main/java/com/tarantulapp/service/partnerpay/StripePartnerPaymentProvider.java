package com.tarantulapp.service.partnerpay;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

/**
 * Live Stripe Checkout for the in-app partner cart (beta, Canada).
 *
 * <p>Reuses the same Stripe account + secret key as subscription billing, via
 * the lightweight REST form API used elsewhere in {@code BillingService}.
 *
 * <ul>
 *   <li><b>platform</b> payout — funds settle to the TarantulApp Stripe account
 *       (correct for owner-operated stores like Montreal Spider Co).</li>
 *   <li><b>connect</b> payout — a destination charge routes funds to the
 *       partner's connected account and takes our commission as an application
 *       fee. Requires the partner to have completed Stripe Connect onboarding;
 *       until then we return {@code PAYOUT_NOT_READY} so we never hold money we
 *       can't pay out.</li>
 * </ul>
 */
@Component
public class StripePartnerPaymentProvider implements PartnerPaymentProvider {

    private static final Logger log = LoggerFactory.getLogger(StripePartnerPaymentProvider.class);

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${stripe.secret-key:}")
    private String stripeSecretKey;

    public StripePartnerPaymentProvider(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public String key() {
        return "stripe";
    }

    @Override
    public String displayName() {
        return "Stripe";
    }

    @Override
    public boolean live() {
        return true;
    }

    @Override
    public boolean configured() {
        return stripeSecretKey != null && !stripeSecretKey.isBlank();
    }

    @Override
    public PartnerCheckoutResult createCheckout(PartnerCheckoutContext ctx) {
        if (!configured()) {
            return new PartnerCheckoutResult(PartnerCheckoutResult.Status.PROVIDER_NOT_CONFIGURED, key(), null,
                    "Stripe is not configured on this environment.");
        }
        boolean connect = "connect".equalsIgnoreCase(ctx.payoutMode());
        if (connect && (ctx.connectAccountId() == null || ctx.connectAccountId().isBlank())) {
            return new PartnerCheckoutResult(PartnerCheckoutResult.Status.PAYOUT_NOT_READY, key(), null,
                    "Partner has not finished Stripe Connect onboarding, so payouts aren't ready yet.");
        }

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("mode", "payment");
        body.add("success_url", ctx.successUrl());
        body.add("cancel_url", ctx.cancelUrl());
        body.add("line_items[0][price_data][currency]", ctx.currency().toLowerCase());
        body.add("line_items[0][price_data][unit_amount]", String.valueOf(ctx.amountCents()));
        body.add("line_items[0][price_data][product_data][name]", ctx.description());
        body.add("line_items[0][quantity]", "1");
        if (ctx.buyerEmail() != null && !ctx.buyerEmail().isBlank()) {
            body.add("customer_email", ctx.buyerEmail());
        }
        body.add("metadata[purpose]", "partner_cart_order");
        body.add("metadata[orderId]", ctx.orderId().toString());
        // Destination charge: route funds to the partner and keep our commission as the application fee.
        if (connect) {
            body.add("payment_intent_data[transfer_data][destination]", ctx.connectAccountId());
            if (ctx.applicationFeeCents() > 0) {
                body.add("payment_intent_data[application_fee_amount]", String.valueOf(ctx.applicationFeeCents()));
            }
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setBasicAuth(stripeSecretKey, "");
        HttpEntity<MultiValueMap<String, String>> req = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    "https://api.stripe.com/v1/checkout/sessions", req, String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return new PartnerCheckoutResult(PartnerCheckoutResult.Status.FAILED, key(), null,
                        "Stripe checkout session could not be created.");
            }
            JsonNode json = objectMapper.readTree(response.getBody());
            String url = json.path("url").asText("");
            if (url.isBlank()) {
                return new PartnerCheckoutResult(PartnerCheckoutResult.Status.FAILED, key(), null,
                        "Stripe did not return a checkout URL.");
            }
            return PartnerCheckoutResult.ready(key(), url);
        } catch (Exception e) {
            log.warn("Stripe partner checkout failed for order {}: {}", ctx.orderId(), e.getMessage());
            return new PartnerCheckoutResult(PartnerCheckoutResult.Status.FAILED, key(), null,
                    "Stripe checkout failed.");
        }
    }
}
