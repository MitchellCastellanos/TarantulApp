package com.tarantulapp.controller;

import com.tarantulapp.service.AppAnalyticsService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

/**
 * Public ingestion endpoint for app usage analytics. Accepts both anonymous and
 * authenticated clients (the JWT filter still populates the SecurityContext when a
 * Bearer is present, so {@link AppAnalyticsService} can attach the user id).
 *
 * Designed to be navigator.sendBeacon-friendly: a single fire-and-forget POST that
 * always returns 204 so a client beacon never surfaces an error.
 */
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AppAnalyticsService analyticsService;

    public AnalyticsController(AppAnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    public record AnalyticsEventRequest(
            String sessionId,
            String type,
            Long engagedSeconds,
            String path,
            String referrer,
            String timezone,
            String locale,
            String platform,
            String appVersion) {}

    @PostMapping("/event")
    public ResponseEntity<Void> event(@RequestBody(required = false) AnalyticsEventRequest req,
                                      HttpServletRequest http) {
        if (req == null || req.sessionId() == null || req.sessionId().isBlank()) {
            return ResponseEntity.noContent().build();
        }
        boolean pageView = req.type() == null || !"heartbeat".equalsIgnoreCase(req.type().trim());
        long engaged = req.engagedSeconds() == null ? 0L : req.engagedSeconds();

        AppAnalyticsService.EventInput in = new AppAnalyticsService.EventInput(
                req.sessionId(),
                pageView,
                engaged,
                req.path(),
                referrerHost(req.referrer()),
                req.timezone(),
                req.locale(),
                req.platform(),
                req.appVersion(),
                firstHeader(http, "CF-IPCountry", "X-Vercel-IP-Country", "X-Geo-Country", "X-Country-Code"),
                firstHeader(http, "X-Geo-Country-Name"),
                decode(firstHeader(http, "X-Vercel-IP-City", "X-Geo-City")),
                decode(firstHeader(http, "X-Vercel-IP-Country-Region", "X-Geo-Region")));
        try {
            analyticsService.record(in);
        } catch (RuntimeException ignored) {
            // Never fail an analytics beacon — recording is best-effort.
        }
        return ResponseEntity.noContent().build();
    }

    private static String firstHeader(HttpServletRequest http, String... names) {
        for (String name : names) {
            String value = http.getHeader(name);
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private static String decode(String value) {
        if (value == null) {
            return null;
        }
        try {
            return URLDecoder.decode(value, StandardCharsets.UTF_8);
        } catch (RuntimeException e) {
            return value;
        }
    }

    private static String referrerHost(String referrer) {
        if (referrer == null || referrer.isBlank()) {
            return null;
        }
        try {
            String host = URI.create(referrer.trim()).getHost();
            return (host == null || host.isBlank()) ? null : host;
        } catch (RuntimeException e) {
            return null;
        }
    }
}
