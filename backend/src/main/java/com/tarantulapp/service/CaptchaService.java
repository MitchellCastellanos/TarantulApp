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
 * Server-side verification of hCaptcha tokens.
 * <p>
 * The frontend renders an hCaptcha widget and sends the resulting token alongside
 * registration / password-reset payloads. This service hits hCaptcha's
 * {@code /siteverify} endpoint (or Google reCAPTCHA-compatible endpoints) and rejects
 * the request when the token is missing, expired, or fails the score.
 * <p>
 * No-op mode: when {@code app.captcha.secret} is empty (typical for local dev and CI)
 * the service returns success unconditionally so existing flows keep working without
 * forcing every developer to set up hCaptcha. Production deployments must set the
 * secret env var or registration/password reset will reject every request.
 */
@Service
public class CaptchaService {

    private static final Logger log = LoggerFactory.getLogger(CaptchaService.class);

    private final RestTemplate restTemplate;
    private final String secret;
    private final String verifyUrl;
    private final boolean enabled;

    public CaptchaService(RestTemplate restTemplate,
                          @Value("${app.captcha.secret:}") String secret,
                          @Value("${app.captcha.verify-url:https://hcaptcha.com/siteverify}") String verifyUrl,
                          @Value("${app.captcha.enabled:}") String enabledOverride) {
        this.restTemplate = restTemplate;
        this.secret = secret == null ? "" : secret.trim();
        this.verifyUrl = verifyUrl;
        // Explicit override wins; otherwise enabled iff a secret is configured.
        if (enabledOverride != null && !enabledOverride.isBlank()) {
            this.enabled = Boolean.parseBoolean(enabledOverride.trim());
        } else {
            this.enabled = !this.secret.isEmpty();
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    /**
     * Throws {@link IllegalArgumentException} when verification fails so the
     * existing {@code GlobalExceptionHandler} maps it to HTTP 400.
     */
    public void verifyOrThrow(String token, String remoteIp, String context) {
        if (!enabled) {
            return;
        }
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("captcha_required");
        }

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("secret", secret);
        form.add("response", token);
        if (remoteIp != null && !remoteIp.isBlank()) {
            form.add("remoteip", remoteIp);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(form, headers);

        Map<?, ?> body;
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(verifyUrl, entity, Map.class);
            body = response.getBody();
        } catch (RestClientException ex) {
            log.warn("captcha_verify_unreachable context={} err={}", context, ex.getMessage());
            // Fail closed: a flapping captcha provider is preferable to letting bots through.
            throw new IllegalArgumentException("captcha_unavailable");
        }

        boolean success = body != null && Boolean.TRUE.equals(body.get("success"));
        if (!success) {
            Object errorCodes = body != null ? body.get("error-codes") : null;
            log.warn("captcha_verify_failed context={} errors={}", context, errorCodes);
            throw new IllegalArgumentException("captcha_invalid");
        }
    }
}
