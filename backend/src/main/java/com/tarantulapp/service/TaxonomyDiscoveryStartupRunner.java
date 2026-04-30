package com.tarantulapp.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * One-shot trigger for {@link TaxonomyDiscoveryService} that fires on application startup
 * when {@code app.taxonomy-discovery.run-on-startup} is set to a non-empty mode.
 *
 * <p>Modes:</p>
 * <ul>
 *   <li>{@code none} (default) — no-op</li>
 *   <li>{@code whitelist} — runs the curated whitelist once, async</li>
 *   <li>{@code family-wide} — paginates the full GBIF family once, async</li>
 *   <li>{@code both} — runs whitelist immediately, then family-wide after it finishes</li>
 * </ul>
 *
 * <p>Intended workflow: set {@code TAXONOMY_DISCOVERY_RUN_ON_STARTUP=both} in Railway,
 * trigger a redeploy, watch logs for {@code Taxonomy discovery (...) complete}, then
 * unset the env var so subsequent restarts don't re-run.</p>
 */
@Component
public class TaxonomyDiscoveryStartupRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(TaxonomyDiscoveryStartupRunner.class);

    private final TaxonomyDiscoveryService discoveryService;

    @Value("${app.taxonomy-discovery.run-on-startup:none}")
    private String mode;

    public TaxonomyDiscoveryStartupRunner(TaxonomyDiscoveryService discoveryService) {
        this.discoveryService = discoveryService;
    }

    @Override
    public void run(ApplicationArguments args) {
        String m = mode == null ? "" : mode.trim().toLowerCase(Locale.ROOT);
        if (m.isEmpty() || "none".equals(m) || "false".equals(m)) {
            return;
        }
        switch (m) {
            case "whitelist" -> {
                log.info("TAXONOMY_DISCOVERY_RUN_ON_STARTUP=whitelist — kicking off whitelist discovery");
                discoveryService.runWhitelistAsync();
            }
            case "family-wide", "family_wide", "familywide" -> {
                log.info("TAXONOMY_DISCOVERY_RUN_ON_STARTUP=family-wide — kicking off family-wide discovery");
                discoveryService.runFamilyWideAsync();
            }
            case "both", "all" -> {
                log.info("TAXONOMY_DISCOVERY_RUN_ON_STARTUP=both — kicking off whitelist then family-wide");
                Thread t = new Thread(() -> {
                    try {
                        discoveryService.runWhitelist();
                        discoveryService.runFamilyWide();
                    } catch (Exception ex) {
                        log.warn("Startup discovery (both) failed: {}", ex.getMessage(), ex);
                    }
                }, "taxonomy-discovery-startup-both");
                t.setDaemon(true);
                t.start();
            }
            default -> log.warn("Unknown TAXONOMY_DISCOVERY_RUN_ON_STARTUP value '{}'; skipping", mode);
        }
    }
}
