package com.tarantulapp.service;

import com.tarantulapp.dto.SpeciesDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Discovery sibling of {@link TaxonomySyncService}: instead of refreshing existing rows, it
 * <em>creates</em> public catalog rows for species we don't yet have, sourced from GBIF.
 *
 * <p>Two modes:</p>
 * <ul>
 *   <li><b>Whitelist</b> (weekly): names listed in {@code taxonomy/discovery_whitelist.txt}.
 *       Cheap, predictable, hand-curated for the hobby.</li>
 *   <li><b>Family-wide</b> (monthly, opt-in): paginates accepted Theraphosidae from the GBIF
 *       backbone and upserts each. Heavier, captures species we didn't think to whitelist.</li>
 * </ul>
 *
 * <p>Idempotency comes from {@link GbifService#ensurePublicCatalogSpecies(Long)} which keys on
 * {@code gbif_usage_key}. Throttled politely between calls (default 1s) to respect iNat's
 * 1 req/s soft cap (called transitively for reference photos).</p>
 */
@Service
public class TaxonomyDiscoveryService {

    private static final Logger log = LoggerFactory.getLogger(TaxonomyDiscoveryService.class);

    private final GbifService gbifService;
    private final ResourceLoader resourceLoader;

    @Value("${app.taxonomy-discovery.enabled:true}")
    private boolean enabled;

    @Value("${app.taxonomy-discovery.whitelist-path:classpath:taxonomy/discovery_whitelist.txt}")
    private String whitelistPath;

    @Value("${app.taxonomy-discovery.throttle-ms:1000}")
    private long throttleMs;

    @Value("${app.taxonomy-discovery.family-wide.enabled:false}")
    private boolean familyWideEnabled;

    @Value("${app.taxonomy-discovery.family-wide.page-size:100}")
    private int familyWidePageSize;

    @Value("${app.taxonomy-discovery.family-wide.max-pages:25}")
    private int familyWideMaxPages;

    public TaxonomyDiscoveryService(GbifService gbifService, ResourceLoader resourceLoader) {
        this.gbifService = gbifService;
        this.resourceLoader = resourceLoader;
    }

    /** Weekly: Sundays 05:30 (after the 04:30 daily refresh). */
    @Scheduled(cron = "${app.taxonomy-discovery.whitelist-cron:0 30 5 * * SUN}")
    public void runWhitelistScheduled() {
        if (!enabled) return;
        Map<String, Object> out = runWhitelist();
        log.info("Taxonomy discovery (whitelist) complete: {}", out);
    }

    /** Monthly: day 1 at 06:00. Off by default; flip {@code app.taxonomy-discovery.family-wide.enabled=true}. */
    @Scheduled(cron = "${app.taxonomy-discovery.family-wide-cron:0 0 6 1 * *}")
    public void runFamilyWideScheduled() {
        if (!enabled || !familyWideEnabled) return;
        Map<String, Object> out = runFamilyWide();
        log.info("Taxonomy discovery (family-wide) complete: {}", out);
    }

    public Map<String, Object> runWhitelist() {
        List<String> names = loadWhitelist();
        int considered = names.size();
        int resolved = 0;
        int upserted = 0;
        int unresolved = 0;
        int failed = 0;

        for (String name : names) {
            try {
                Optional<Long> key = gbifService.tryResolveAcceptedKey(name);
                if (key.isEmpty()) {
                    unresolved++;
                    log.debug("Discovery whitelist: no GBIF match for '{}'", name);
                    continue;
                }
                resolved++;
                Optional<SpeciesDTO> dto = gbifService.ensurePublicCatalogSpecies(key.get());
                if (dto.isPresent()) {
                    upserted++;
                }
            } catch (Exception ex) {
                failed++;
                log.warn("Discovery whitelist failed for '{}': {}", name, ex.getMessage());
            }
            sleepThrottle();
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("mode", "whitelist");
        out.put("considered", considered);
        out.put("resolved", resolved);
        out.put("upserted", upserted);
        out.put("unresolved", unresolved);
        out.put("failed", failed);
        return out;
    }

    public Map<String, Object> runFamilyWide() {
        int pages = 0;
        int considered = 0;
        int upserted = 0;
        int failed = 0;

        for (int i = 0; i < familyWideMaxPages; i++) {
            int offset = i * familyWidePageSize;
            GbifService.AcceptedSpeciesPage page =
                    gbifService.listAcceptedTheraphosidaePage(offset, familyWidePageSize);
            pages++;
            List<Long> keys = page.getKeys();
            if (keys.isEmpty() && page.isEndOfRecords()) {
                break;
            }
            for (Long key : keys) {
                considered++;
                try {
                    Optional<SpeciesDTO> dto = gbifService.ensurePublicCatalogSpecies(key);
                    if (dto.isPresent()) {
                        upserted++;
                    }
                } catch (Exception ex) {
                    failed++;
                    log.warn("Discovery family-wide failed for gbifKey={}: {}", key, ex.getMessage());
                }
                sleepThrottle();
            }
            if (page.isEndOfRecords()) break;
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("mode", "family-wide");
        out.put("pages", pages);
        out.put("considered", considered);
        out.put("upserted", upserted);
        out.put("failed", failed);
        return out;
    }

    /** Fire-and-forget: returns immediately, runs whitelist on a background thread. */
    public Map<String, Object> runWhitelistAsync() {
        Thread t = new Thread(() -> {
            try {
                Map<String, Object> out = runWhitelist();
                log.info("Taxonomy discovery (whitelist, async) complete: {}", out);
            } catch (Exception ex) {
                log.warn("Taxonomy discovery (whitelist, async) failed: {}", ex.getMessage(), ex);
            }
        }, "taxonomy-discovery-whitelist");
        t.setDaemon(true);
        t.start();
        Map<String, Object> ack = new LinkedHashMap<>();
        ack.put("started", true);
        ack.put("mode", "whitelist");
        return ack;
    }

    /** Fire-and-forget: returns immediately, runs family-wide on a background thread. */
    public Map<String, Object> runFamilyWideAsync() {
        Thread t = new Thread(() -> {
            try {
                Map<String, Object> out = runFamilyWide();
                log.info("Taxonomy discovery (family-wide, async) complete: {}", out);
            } catch (Exception ex) {
                log.warn("Taxonomy discovery (family-wide, async) failed: {}", ex.getMessage(), ex);
            }
        }, "taxonomy-discovery-family-wide");
        t.setDaemon(true);
        t.start();
        Map<String, Object> ack = new LinkedHashMap<>();
        ack.put("started", true);
        ack.put("mode", "family-wide");
        return ack;
    }

    private List<String> loadWhitelist() {
        Resource resource = resourceLoader.getResource(whitelistPath);
        if (!resource.exists()) {
            log.warn("Discovery whitelist not found at {}", whitelistPath);
            return List.of();
        }
        Set<String> unique = new LinkedHashSet<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#")) continue;
                unique.add(trimmed);
            }
        } catch (IOException e) {
            log.warn("Failed reading discovery whitelist {}: {}", whitelistPath, e.getMessage());
            return List.of();
        }
        return new ArrayList<>(unique);
    }

    private void sleepThrottle() {
        if (throttleMs <= 0) return;
        try {
            Thread.sleep(throttleMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
