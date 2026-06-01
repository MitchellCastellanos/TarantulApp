package com.tarantulapp.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Thin client over Twilio Verify's REST API. We use Verify (not raw SMS) so Twilio owns the OTP
 * lifecycle — code generation, expiry, retry and per-number rate limiting — keeping this integration
 * "solo para esto": phone ownership checks, no marketing messaging.
 * <p>
 * No-op mode: when {@code app.twilio.account-sid}/{@code auth-token}/{@code verify-service-sid} are
 * not all set (local dev, CI) the service does not call Twilio. {@link #startVerification(String)}
 * becomes a logged no-op and {@link #checkCode(String, String)} accepts the configured dev test code
 * ({@code app.twilio.dev-test-code}, default {@code 123456}) so the flow stays exercisable offline.
 */
@Service
public class TwilioVerifyService {

    private static final Logger log = LoggerFactory.getLogger(TwilioVerifyService.class);
    private static final String BASE_URL = "https://verify.twilio.com/v2/Services";

    private final RestTemplate restTemplate;
    private final String accountSid;
    private final String authToken;
    private final String verifyServiceSid;
    private final String devTestCode;
    private final boolean enabled;

    public TwilioVerifyService(RestTemplate restTemplate,
                               @Value("${app.twilio.account-sid:}") String accountSid,
                               @Value("${app.twilio.auth-token:}") String authToken,
                               @Value("${app.twilio.verify-service-sid:}") String verifyServiceSid,
                               @Value("${app.twilio.dev-test-code:123456}") String devTestCode) {
        this.restTemplate = restTemplate;
        this.accountSid = accountSid == null ? "" : accountSid.trim();
        this.authToken = authToken == null ? "" : authToken.trim();
        this.verifyServiceSid = verifyServiceSid == null ? "" : verifyServiceSid.trim();
        this.devTestCode = devTestCode == null || devTestCode.isBlank() ? "123456" : devTestCode.trim();
        this.enabled = !this.accountSid.isEmpty() && !this.authToken.isEmpty() && !this.verifyServiceSid.isEmpty();
        if (!this.enabled) {
            log.info("TwilioVerifyService running in no-op mode (credentials not configured).");
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    /** Sends an SMS verification code to {@code phoneE164}. Throws {@link IllegalArgumentException} on failure. */
    public void startVerification(String phoneE164) {
        if (!enabled) {
            log.info("Twilio no-op: pretend-sent verification to {} (dev test code is configured).", phoneE164);
            return;
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("To", phoneE164);
        form.add("Channel", "sms");
        Map<?, ?> body = post("/" + verifyServiceSid + "/Verifications", form, "start");
        String status = body == null ? null : String.valueOf(body.get("status"));
        if (!"pending".equals(status)) {
            log.warn("twilio_verify_start_unexpected status={} to={}", status, phoneE164);
            throw new IllegalArgumentException("phone_verify_send_failed");
        }
    }

    /** @return true when {@code code} matches the pending verification for {@code phoneE164}. */
    public boolean checkCode(String phoneE164, String code) {
        if (!enabled) {
            return devTestCode.equals(code == null ? null : code.trim());
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("To", phoneE164);
        form.add("Code", code);
        Map<?, ?> body = post("/" + verifyServiceSid + "/VerificationCheck", form, "check");
        String status = body == null ? null : String.valueOf(body.get("status"));
        return "approved".equals(status);
    }

    private Map<?, ?> post(String path, MultiValueMap<String, String> form, String context) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setBasicAuth(accountSid, authToken);
        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(form, headers);
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(BASE_URL + path, entity, Map.class);
            return response.getBody();
        } catch (RestClientException ex) {
            log.warn("twilio_verify_unreachable context={} err={}", context, ex.getMessage());
            throw new IllegalArgumentException("phone_verify_unavailable");
        }
    }
}
