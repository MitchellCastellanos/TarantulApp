package com.tarantulapp.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

/**
 * Centralised place for application-level counters exported via {@code /actuator/prometheus}.
 * Keeping the meter names here means alerts and dashboards have one source of truth and we
 * don't accidentally fork the naming convention across services.
 *
 * Wire dashboards on these names: {@code auth_login_success_total},
 * {@code auth_login_failure_total}, {@code billing_webhook_processed_total} (with {@code provider}
 * tag), {@code ratelimit_blocked_total} (with {@code filter} tag).
 */
@Component
public class AppMetrics {

    private final Counter authLoginSuccess;
    private final Counter authLoginFailure;
    private final Counter authRegisterSuccess;
    private final MeterRegistry registry;

    public AppMetrics(MeterRegistry registry) {
        this.registry = registry;
        this.authLoginSuccess = Counter.builder("auth.login.success")
                .description("Successful logins (email/password and Google OAuth)")
                .register(registry);
        this.authLoginFailure = Counter.builder("auth.login.failure")
                .description("Failed login attempts (invalid credentials, locked, etc.)")
                .register(registry);
        this.authRegisterSuccess = Counter.builder("auth.register.success")
                .description("Successful new account registrations")
                .register(registry);
    }

    public void loginSuccess() { authLoginSuccess.increment(); }
    public void loginFailure() { authLoginFailure.increment(); }
    public void registerSuccess() { authRegisterSuccess.increment(); }

    public void billingWebhookProcessed(String provider, String eventType) {
        Counter.builder("billing.webhook.processed")
                .tag("provider", provider == null ? "unknown" : provider)
                .tag("event_type", eventType == null ? "unknown" : eventType)
                .register(registry)
                .increment();
    }

    public void rateLimitBlocked(String filter) {
        Counter.builder("ratelimit.blocked")
                .tag("filter", filter == null ? "unknown" : filter)
                .register(registry)
                .increment();
    }
}
