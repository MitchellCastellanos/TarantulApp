package com.tarantulapp.service;

import com.tarantulapp.entity.Species;
import com.tarantulapp.entity.SpeciesWatch;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.SpeciesRepository;
import com.tarantulapp.repository.SpeciesWatchRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * A4 — Species wishlist. Lets a keeper opt in to push alerts when a marketplace
 * listing for a species they care about is created.
 *
 * Fan-out runs on the {@code pushExecutor} so a vendor uploading a batch of
 * listings does not block on N push deliveries.
 */
@Service
public class SpeciesWatchService {

    private static final Logger log = LoggerFactory.getLogger(SpeciesWatchService.class);

    /** Skip notifying the same watcher more than once per species inside this rolling window. */
    private static final Duration WATCHER_COOLDOWN = Duration.ofHours(24);

    public static final String NOTIFICATION_TYPE = "SPECIES_LISTED_WISHLIST";

    private final SpeciesWatchRepository speciesWatchRepository;
    private final SpeciesRepository speciesRepository;
    private final NotificationService notificationService;

    public SpeciesWatchService(SpeciesWatchRepository speciesWatchRepository,
                               SpeciesRepository speciesRepository,
                               NotificationService notificationService) {
        this.speciesWatchRepository = speciesWatchRepository;
        this.speciesRepository = speciesRepository;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listMine(UUID userId) {
        List<SpeciesWatch> rows = speciesWatchRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (rows.isEmpty()) return List.of();
        List<Integer> speciesIds = rows.stream().map(SpeciesWatch::getSpeciesId).distinct().toList();
        Map<Integer, Species> byId = new LinkedHashMap<>();
        for (Species s : speciesRepository.findAllById(speciesIds)) {
            byId.put(s.getId(), s);
        }
        List<Map<String, Object>> out = new ArrayList<>(rows.size());
        for (SpeciesWatch w : rows) {
            Species s = byId.get(w.getSpeciesId());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", w.getId());
            row.put("speciesId", w.getSpeciesId());
            row.put("scientificName", s == null ? null : s.getScientificName());
            row.put("commonName", s == null ? null : s.getCommonName());
            row.put("createdAt", w.getCreatedAt());
            row.put("lastNotifiedAt", w.getLastNotifiedAt());
            out.add(row);
        }
        return out;
    }

    @Transactional
    public Map<String, Object> watch(UUID userId, Integer speciesId) {
        if (speciesId == null) throw new IllegalArgumentException("speciesId requerido");
        Species species = speciesRepository.findById(speciesId)
                .orElseThrow(() -> new NotFoundException("Especie no encontrada"));
        SpeciesWatch existing = speciesWatchRepository.findByUserIdAndSpeciesId(userId, species.getId()).orElse(null);
        if (existing == null) {
            existing = new SpeciesWatch();
            existing.setUserId(userId);
            existing.setSpeciesId(species.getId());
            existing = speciesWatchRepository.save(existing);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", existing.getId());
        out.put("speciesId", species.getId());
        out.put("scientificName", species.getScientificName());
        out.put("commonName", species.getCommonName());
        out.put("createdAt", existing.getCreatedAt());
        return out;
    }

    @Transactional
    public void unwatch(UUID userId, Integer speciesId) {
        if (speciesId == null) return;
        speciesWatchRepository.deleteByUserIdAndSpeciesId(userId, speciesId);
    }

    @Transactional(readOnly = true)
    public boolean isWatched(UUID userId, Integer speciesId) {
        if (userId == null || speciesId == null) return false;
        return speciesWatchRepository.existsByUserIdAndSpeciesId(userId, speciesId);
    }

    /**
     * Fan-out alerts to every watcher of the species matched by {@code speciesName}.
     * Runs on {@code pushExecutor} so it never blocks the listing-create request.
     * Self-listings (vendor watching their own species) are silently dropped by
     * {@link NotificationService#create} when actorUserId == userId.
     */
    @Async("pushExecutor")
    @Transactional
    public void notifyWatchersAsync(String speciesName,
                                    UUID listingId,
                                    UUID sellerUserId,
                                    String listingTitle,
                                    String listingPriceLabel) {
        try {
            if (speciesName == null || speciesName.isBlank() || listingId == null) return;
            Species species = speciesRepository.findByScientificNameIgnoreCase(speciesName.trim()).orElse(null);
            if (species == null) return;
            List<SpeciesWatch> watchers = speciesWatchRepository.findBySpeciesId(species.getId());
            if (watchers.isEmpty()) return;

            Instant now = Instant.now();
            Instant cooldownCut = now.minus(WATCHER_COOLDOWN);
            List<UUID> bumpedIds = new ArrayList<>();

            for (SpeciesWatch w : watchers) {
                if (w.getUserId() == null) continue;
                if (sellerUserId != null && sellerUserId.equals(w.getUserId())) continue; // own listing
                if (w.getLastNotifiedAt() != null && w.getLastNotifiedAt().isAfter(cooldownCut)) continue;

                Map<String, Object> data = new LinkedHashMap<>();
                data.put("speciesId", species.getId());
                data.put("scientificName", species.getScientificName());
                data.put("listingId", listingId.toString());
                data.put("route", "/marketplace/listing/" + listingId);

                String title = species.getScientificName() == null
                        ? "Nuevo anuncio en tu wishlist"
                        : "Nuevo: " + species.getScientificName();
                String body = listingTitle == null || listingTitle.isBlank()
                        ? (listingPriceLabel == null ? "Alguien acaba de listar esta especie." : "Alguien acaba de listarla — " + listingPriceLabel)
                        : (listingPriceLabel == null ? listingTitle : listingTitle + " — " + listingPriceLabel);
                try {
                    notificationService.create(w.getUserId(), sellerUserId, NOTIFICATION_TYPE, title, body, data);
                    bumpedIds.add(w.getId());
                } catch (RuntimeException ex) {
                    log.warn("species watch push failed userId={} listingId={} cause={}", w.getUserId(), listingId, ex.toString());
                }
            }

            if (!bumpedIds.isEmpty()) {
                speciesWatchRepository.bumpLastNotifiedAt(bumpedIds, now);
            }
        } catch (RuntimeException ex) {
            log.warn("species watch fan-out failed listingId={} species={} cause={}", listingId, speciesName, ex.toString());
        }
    }
}
