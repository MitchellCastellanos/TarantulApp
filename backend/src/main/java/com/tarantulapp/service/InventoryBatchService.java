package com.tarantulapp.service;

import com.tarantulapp.dto.CreateInventoryBatchRequest;
import com.tarantulapp.dto.GenerateBatchPassportsRequest;
import com.tarantulapp.dto.GenerateBatchPassportsResponse;
import com.tarantulapp.dto.InventoryBatchAdjustmentRequest;
import com.tarantulapp.dto.InventoryBatchResponse;
import com.tarantulapp.dto.StudioPassportSummaryDTO;
import com.tarantulapp.entity.InventoryAdjustment;
import com.tarantulapp.entity.InventoryBatch;
import com.tarantulapp.entity.Passport;
import com.tarantulapp.entity.Species;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.InventoryAdjustmentRepository;
import com.tarantulapp.repository.InventoryBatchRepository;
import com.tarantulapp.repository.PassportRepository;
import com.tarantulapp.repository.SpeciesRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class InventoryBatchService {

    private final InventoryBatchRepository batchRepository;
    private final InventoryAdjustmentRepository adjustmentRepository;
    private final PassportRepository passportRepository;
    private final SpeciesRepository speciesRepository;
    private final UserRepository userRepository;
    private final ShortIdService shortIdService;
    private final UserCapabilitiesService userCapabilitiesService;

    @Value("${app.public-base-url:https://tarantulapp.com}")
    private String publicBaseUrl;

    public InventoryBatchService(InventoryBatchRepository batchRepository,
                                 InventoryAdjustmentRepository adjustmentRepository,
                                 PassportRepository passportRepository,
                                 SpeciesRepository speciesRepository,
                                 UserRepository userRepository,
                                 ShortIdService shortIdService,
                                 UserCapabilitiesService userCapabilitiesService) {
        this.batchRepository = batchRepository;
        this.adjustmentRepository = adjustmentRepository;
        this.passportRepository = passportRepository;
        this.speciesRepository = speciesRepository;
        this.userRepository = userRepository;
        this.shortIdService = shortIdService;
        this.userCapabilitiesService = userCapabilitiesService;
    }

    @Transactional(readOnly = true)
    public List<InventoryBatchResponse> listForUser(UUID userId) {
        userCapabilitiesService.ensureStudioAccess(userId);
        return batchRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public InventoryBatchResponse getForUser(UUID batchId, UUID userId) {
        userCapabilitiesService.ensureStudioAccess(userId);
        InventoryBatch batch = requireOwnedBatch(batchId, userId);
        return toResponse(batch);
    }

    public InventoryBatchResponse create(CreateInventoryBatchRequest req, UUID userId) {
        userCapabilitiesService.ensurePassportCreator(userId);
        activateStudioIfNeeded(userId);

        Species species = speciesRepository.findById(req.getSpeciesId())
                .orElseThrow(() -> new NotFoundException("Especie no encontrada"));

        InventoryBatch batch = new InventoryBatch();
        batch.setUserId(userId);
        batch.setSpecies(species);
        batch.setName(req.getName().trim());
        batch.setQuantityTotal(req.getQuantityTotal() != null ? req.getQuantityTotal() : 0);
        batch.setQuantitySold(0);
        batch.setNotes(trimToNull(req.getNotes()));
        return toResponse(batchRepository.save(batch));
    }

    public InventoryBatchResponse adjust(UUID batchId, UUID userId, InventoryBatchAdjustmentRequest req) {
        userCapabilitiesService.ensureStudioAccess(userId);
        InventoryBatch batch = requireOwnedBatch(batchId, userId);

        int deltaSold = req.getDeltaSold() != null ? req.getDeltaSold() : 0;
        int deltaTotal = req.getDeltaTotal() != null ? req.getDeltaTotal() : 0;
        if (deltaSold == 0 && deltaTotal == 0) {
            throw new IllegalArgumentException("ADJUSTMENT_EMPTY");
        }

        int newSold = Math.max(0, batch.getQuantitySold() + deltaSold);
        int newTotal = Math.max(0, batch.getQuantityTotal() + deltaTotal);
        if (newSold > newTotal) {
            throw new IllegalArgumentException("SOLD_EXCEEDS_TOTAL");
        }

        batch.setQuantitySold(newSold);
        batch.setQuantityTotal(newTotal);
        batchRepository.save(batch);

        InventoryAdjustment adj = new InventoryAdjustment();
        adj.setBatchId(batch.getId());
        adj.setUserId(userId);
        adj.setDeltaSold(deltaSold);
        adj.setDeltaTotal(deltaTotal);
        adj.setReason(normalizeReason(req.getReason()));
        adj.setNotes(trimToNull(req.getNotes()));
        adjustmentRepository.save(adj);

        return toResponse(batch);
    }

    public GenerateBatchPassportsResponse generatePassports(UUID batchId, UUID userId, GenerateBatchPassportsRequest req) {
        userCapabilitiesService.ensurePassportCreator(userId);
        activateStudioIfNeeded(userId);
        InventoryBatch batch = requireOwnedBatch(batchId, userId);

        int count = req.getCount();
        if (count < 1 || count > 500) {
            throw new IllegalArgumentException("INVALID_PASSPORT_COUNT");
        }

        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        List<GenerateBatchPassportsResponse.GeneratedPassportLine> lines = new ArrayList<>();

        for (int i = 0; i < count; i++) {
            Passport passport = new Passport();
            passport.setShortId(shortIdService.generateUniqueShortId());
            passport.setCreatedByUserId(userId);
            passport.setOriginUserId(userId);
            passport.setSpecies(batch.getSpecies());
            passport.setBatchId(batch.getId());
            passport.setStage(trimToNull(req.getStage()));
            passport.setSex(trimToNull(req.getSex()));
            passport.setLabelNotes(trimToNull(req.getLabelNotes()));
            if (req.getProGiftDays() != null && req.getProGiftDays() > 0) {
                passport.setProGiftDays(req.getProGiftDays());
            }
            Passport saved = passportRepository.save(passport);
            lines.add(new GenerateBatchPassportsResponse.GeneratedPassportLine(
                    saved.getId(),
                    saved.getShortId(),
                    base + "/t/" + saved.getShortId()
            ));
        }

        batch.setQuantityTotal(batch.getQuantityTotal() + count);
        batchRepository.save(batch);

        GenerateBatchPassportsResponse out = new GenerateBatchPassportsResponse();
        out.setCreated(count);
        out.setPassports(lines);
        return out;
    }

    @Transactional(readOnly = true)
    public List<StudioPassportSummaryDTO> listPassportsForBatch(UUID batchId, UUID userId) {
        userCapabilitiesService.ensureStudioAccess(userId);
        requireOwnedBatch(batchId, userId);
        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        return passportRepository.findByBatchIdOrderByCreatedAtDesc(batchId).stream()
                .map(p -> toPassportSummary(p, base))
                .toList();
    }

    private void activateStudioIfNeeded(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow();
        if (user.getStudioActivatedAt() == null) {
            user.setStudioActivatedAt(Instant.now());
            userRepository.save(user);
        }
    }

    private InventoryBatch requireOwnedBatch(UUID batchId, UUID userId) {
        return batchRepository.findByIdAndUserId(batchId, userId)
                .orElseThrow(() -> new NotFoundException("Batch no encontrado"));
    }

    private InventoryBatchResponse toResponse(InventoryBatch batch) {
        InventoryBatchResponse r = new InventoryBatchResponse();
        r.setId(batch.getId());
        r.setName(batch.getName());
        r.setQuantityTotal(batch.getQuantityTotal());
        r.setQuantitySold(batch.getQuantitySold());
        r.setQuantityAvailable(batch.getQuantityAvailable());
        r.setNotes(batch.getNotes());
        r.setCreatedAt(batch.getCreatedAt());
        r.setUpdatedAt(batch.getUpdatedAt());
        if (batch.getSpecies() != null) {
            r.setSpeciesId(batch.getSpecies().getId());
            r.setScientificName(batch.getSpecies().getScientificName());
            r.setCommonName(batch.getSpecies().getCommonName());
        }
        long generated = passportRepository.findByBatchIdOrderByCreatedAtDesc(batch.getId()).size();
        long claimed = passportRepository.countByBatchIdAndClaimedAtIsNotNull(batch.getId());
        r.setPassportsGenerated(generated);
        r.setPassportsClaimed(claimed);
        r.setPassportsUnclaimed(Math.max(0, generated - claimed));
        return r;
    }

    private StudioPassportSummaryDTO toPassportSummary(Passport passport, String base) {
        StudioPassportSummaryDTO dto = new StudioPassportSummaryDTO();
        dto.setId(passport.getId());
        dto.setShortId(passport.getShortId());
        dto.setPublicUrl(base + "/t/" + passport.getShortId());
        dto.setClaimed(passport.isClaimed());
        dto.setClaimedAt(passport.getClaimedAt());
        dto.setStage(passport.getStage());
        dto.setSex(passport.getSex());
        dto.setLabelNotes(passport.getLabelNotes());
        return dto;
    }

    private static String normalizeReason(String reason) {
        if (reason == null || reason.isBlank()) return "MANUAL";
        String r = reason.trim().toUpperCase();
        return r.length() > 40 ? r.substring(0, 40) : r;
    }

    private static String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
