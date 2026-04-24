package com.tarantulapp.service;

import com.tarantulapp.entity.Species;
import com.tarantulapp.repository.SpeciesRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class TaxonomySyncService {

    private static final Logger log = LoggerFactory.getLogger(TaxonomySyncService.class);

    private final SpeciesRepository speciesRepository;
    private final GbifService gbifService;

    @Value("${app.taxonomy-sync.enabled:true}")
    private boolean schedulerEnabled;

    public TaxonomySyncService(SpeciesRepository speciesRepository, GbifService gbifService) {
        this.speciesRepository = speciesRepository;
        this.gbifService = gbifService;
    }

    @Scheduled(cron = "${app.taxonomy-sync.cron:0 30 4 * * *}")
    public void runScheduled() {
        if (!schedulerEnabled) return;
        Map<String, Object> out = runNow();
        log.info("Taxonomy sync complete: {}", out);
    }

    public Map<String, Object> runNow() {
        int scanned = 0;
        int linkedGbifKey = 0;
        int refreshed = 0;
        int failed = 0;

        List<Species> all = speciesRepository.findAll();
        for (Species s : all) {
            if (!DiscoverCatalogService.isPublicCatalogRow(s)) continue;
            scanned++;
            try {
                if (s.getGbifUsageKey() == null || s.getGbifUsageKey() <= 0) {
                    Long resolved = gbifService.tryResolveAcceptedKey(s.getScientificName()).orElse(null);
                    if (resolved != null) {
                        s.setGbifUsageKey(resolved);
                        speciesRepository.save(s);
                        linkedGbifKey++;
                    }
                }
                if (s.getGbifUsageKey() != null && s.getGbifUsageKey() > 0) {
                    gbifService.refreshCatalogTaxonomy(s.getId());
                    refreshed++;
                }
            } catch (Exception ex) {
                failed++;
                log.warn("Taxonomy sync failed for species id={} name='{}': {}",
                        s.getId(), s.getScientificName(), ex.getMessage());
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("scanned", scanned);
        out.put("linkedGbifKey", linkedGbifKey);
        out.put("refreshed", refreshed);
        out.put("failed", failed);
        return out;
    }
}

