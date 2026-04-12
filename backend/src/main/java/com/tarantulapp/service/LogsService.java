package com.tarantulapp.service;

import com.tarantulapp.dto.*;
import com.tarantulapp.entity.*;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class LogsService {

    private final FeedingLogRepository feedingLogRepository;
    private final MoltLogRepository moltLogRepository;
    private final BehaviorLogRepository behaviorLogRepository;
    private final TarantulaRepository tarantulaRepository;

    public LogsService(FeedingLogRepository feedingLogRepository,
                       MoltLogRepository moltLogRepository,
                       BehaviorLogRepository behaviorLogRepository,
                       TarantulaRepository tarantulaRepository) {
        this.feedingLogRepository = feedingLogRepository;
        this.moltLogRepository = moltLogRepository;
        this.behaviorLogRepository = behaviorLogRepository;
        this.tarantulaRepository = tarantulaRepository;
    }

    // ─── Feeding ────────────────────────────────────────────────────────────

    public FeedingLogResponse addFeeding(UUID tarantulaId, FeedingLogRequest req, UUID userId) {
        verifyOwnership(tarantulaId, userId);
        FeedingLog log = new FeedingLog();
        log.setTarantulaId(tarantulaId);
        log.setFedAt(req.getFedAt());
        log.setPreyType(req.getPreyType());
        log.setPreySize(req.getPreySize());
        log.setQuantity(req.getQuantity() != null ? req.getQuantity() : 1);
        log.setAccepted(req.getAccepted());
        log.setNotes(req.getNotes());
        return FeedingLogResponse.from(feedingLogRepository.save(log));
    }

    public List<FeedingLogResponse> getFeedings(UUID tarantulaId, UUID userId) {
        verifyOwnership(tarantulaId, userId);
        return feedingLogRepository.findByTarantulaIdOrderByFedAtDesc(tarantulaId)
                .stream().map(FeedingLogResponse::from).collect(Collectors.toList());
    }

    public void deleteFeeding(UUID logId, UUID userId) {
        FeedingLog log = feedingLogRepository.findById(logId)
                .orElseThrow(() -> new NotFoundException("Registro no encontrado"));
        verifyOwnership(log.getTarantulaId(), userId);
        feedingLogRepository.delete(log);
    }

    // ─── Molt ───────────────────────────────────────────────────────────────

    public MoltLogResponse addMolt(UUID tarantulaId, MoltLogRequest req, UUID userId) {
        verifyOwnership(tarantulaId, userId);
        MoltLog log = new MoltLog();
        log.setTarantulaId(tarantulaId);
        log.setMoltedAt(req.getMoltedAt());
        log.setPreSizeCm(req.getPreSizeCm());
        log.setPostSizeCm(req.getPostSizeCm());
        log.setNotes(req.getNotes());
        return MoltLogResponse.from(moltLogRepository.save(log));
    }

    public List<MoltLogResponse> getMolts(UUID tarantulaId, UUID userId) {
        verifyOwnership(tarantulaId, userId);
        return moltLogRepository.findByTarantulaIdOrderByMoltedAtDesc(tarantulaId)
                .stream().map(MoltLogResponse::from).collect(Collectors.toList());
    }

    public void deleteMolt(UUID logId, UUID userId) {
        MoltLog log = moltLogRepository.findById(logId)
                .orElseThrow(() -> new NotFoundException("Registro no encontrado"));
        verifyOwnership(log.getTarantulaId(), userId);
        moltLogRepository.delete(log);
    }

    // ─── Behavior ───────────────────────────────────────────────────────────

    public BehaviorLogResponse addBehavior(UUID tarantulaId, BehaviorLogRequest req, UUID userId) {
        verifyOwnership(tarantulaId, userId);
        BehaviorLog log = new BehaviorLog();
        log.setTarantulaId(tarantulaId);
        log.setLoggedAt(req.getLoggedAt());
        log.setMood(req.getMood());
        log.setNotes(req.getNotes());
        return BehaviorLogResponse.from(behaviorLogRepository.save(log));
    }

    public List<BehaviorLogResponse> getBehaviors(UUID tarantulaId, UUID userId) {
        verifyOwnership(tarantulaId, userId);
        return behaviorLogRepository.findByTarantulaIdOrderByLoggedAtDesc(tarantulaId)
                .stream().map(BehaviorLogResponse::from).collect(Collectors.toList());
    }

    public void deleteBehavior(UUID logId, UUID userId) {
        BehaviorLog log = behaviorLogRepository.findById(logId)
                .orElseThrow(() -> new NotFoundException("Registro no encontrado"));
        verifyOwnership(log.getTarantulaId(), userId);
        behaviorLogRepository.delete(log);
    }

    // ─── Private ────────────────────────────────────────────────────────────

    private void verifyOwnership(UUID tarantulaId, UUID userId) {
        Tarantula t = tarantulaRepository.findById(tarantulaId)
                .orElseThrow(() -> new NotFoundException("Tarántula no encontrada"));
        if (!t.getUserId().equals(userId)) throw new AccessDeniedException("Acceso denegado");
    }
}
