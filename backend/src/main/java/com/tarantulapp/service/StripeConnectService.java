package com.tarantulapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.OfficialVendorRepository;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.util.PartnerCheckoutConfig;
import com.tarantulapp.util.RegionPolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Stripe Connect onboarding for partners that want in-app payouts routed to
 * their own Stripe account (the {@code connect} payout mode). Creates an Express
 * connected account on demand, stores its id in the vendor {@code feedConfig},
 * and returns a hosted onboarding link.
 *
 * <p>Beta-gated to Canada partners. Requires Stripe Connect to be enabled on the
 * platform account; if it isn't, the Stripe API call fails and we surface a
 * clear error rather than pretending payouts are ready.
 */
@Service
public class StripeConnectService {

    private static final Logger log = LoggerFactory.getLogger(StripeConnectService.class);

    private final OfficialVendorRepository officialVendorRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${stripe.secret-key:}")
    private String stripeSecretKey;

    @Value("${app.base-url:http://localhost:5173}")
    private String appBaseUrl;

    public StripeConnectService(OfficialVendorRepository officialVendorRepository,
                                UserRepository userRepository,
                                RestTemplate restTemplate,
                                ObjectMapper objectMapper) {
        this.officialVendorRepository = officialVendorRepository;
        this.userRepository = userRepository;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    public boolean configured() {
        return stripeSecretKey != null && !stripeSecretKey.isBlank();
    }

    /** Resolves the caller's partner vendor, ensures a connected account, and returns an onboarding URL. */
    @Transactional
    public Map<String, Object> startOnboardingForUser(UUID userId) {
        OfficialVendor vendor = resolveVendor(userId);
        if (!RegionPolicy.isInAppCheckoutCountry(vendor.getCountry())) {
            throw new IllegalArgumentException("STRIPE_CONNECT_CANADA_ONLY");
        }
        if (!configured()) {
            throw new IllegalArgumentException("STRIPE_NOT_CONFIGURED");
        }
        String accountId = ensureConnectedAccount(vendor);
        String url = createAccountLink(accountId, vendor.getSlug());
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("accountId", accountId);
        out.put("onboardingUrl", url);
        return out;
    }

    private OfficialVendor resolveVendor(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        String handle = user.getPublicHandle();
        if (handle == null || handle.isBlank()) {
            throw new NotFoundException("Partner no encontrado");
        }
        return officialVendorRepository.findBySlug(handle.trim())
                .orElseThrow(() -> new NotFoundException("Partner no encontrado"));
    }

    private String ensureConnectedAccount(OfficialVendor vendor) {
        PartnerCheckoutConfig cfg = PartnerCheckoutConfig.fromVendor(vendor);
        if (cfg.stripeAccountId() != null && !cfg.stripeAccountId().isBlank()) {
            return cfg.stripeAccountId();
        }
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("type", "express");
        body.add("country", "CA");
        body.add("capabilities[transfers][requested]", "true");
        body.add("business_profile[name]", vendor.getName());
        JsonNode acct = stripePost("https://api.stripe.com/v1/accounts", body, "STRIPE_CONNECT_ACCOUNT_FAILED");
        String accountId = acct.path("id").asText("");
        if (accountId.isBlank()) {
            throw new IllegalArgumentException("STRIPE_CONNECT_ACCOUNT_FAILED");
        }
        persistAccountId(vendor, accountId);
        return accountId;
    }

    private String createAccountLink(String accountId, String slug) {
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("account", accountId);
        body.add("refresh_url", appBaseUrl + "/partner/hub?stripeConnect=refresh");
        body.add("return_url", appBaseUrl + "/partner/hub?stripeConnect=done");
        body.add("type", "account_onboarding");
        JsonNode link = stripePost("https://api.stripe.com/v1/account_links", body, "STRIPE_CONNECT_LINK_FAILED");
        String url = link.path("url").asText("");
        if (url.isBlank()) {
            throw new IllegalArgumentException("STRIPE_CONNECT_LINK_FAILED");
        }
        return url;
    }

    @SuppressWarnings("unchecked")
    private void persistAccountId(OfficialVendor vendor, String accountId) {
        Map<String, Object> feed = vendor.getFeedConfig() == null
                ? new LinkedHashMap<>()
                : new LinkedHashMap<>(vendor.getFeedConfig());
        Object inAppRaw = feed.get("inAppCheckout");
        Map<String, Object> inApp = inAppRaw instanceof Map
                ? new LinkedHashMap<>((Map<String, Object>) inAppRaw)
                : new LinkedHashMap<>();
        inApp.put("stripeAccountId", accountId);
        // Routing payouts to a connected account only makes sense in connect mode.
        inApp.putIfAbsent("payoutMode", "connect");
        feed.put("inAppCheckout", inApp);
        vendor.setFeedConfig(feed);
        officialVendorRepository.save(vendor);
    }

    private JsonNode stripePost(String url, MultiValueMap<String, String> body, String failureCode) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setBasicAuth(stripeSecretKey, "");
        HttpEntity<MultiValueMap<String, String>> req = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, req, String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new IllegalArgumentException(failureCode);
            }
            return objectMapper.readTree(response.getBody());
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Stripe Connect call to {} failed: {}", url, e.getMessage());
            throw new IllegalArgumentException(failureCode);
        }
    }
}
