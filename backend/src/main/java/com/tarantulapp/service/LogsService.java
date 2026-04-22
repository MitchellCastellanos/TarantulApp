package com.tarantulapp.service;

import com.tarantulapp.dto.*;
import com.tarantulapp.entity.*;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class LogsService {

    private static final Logger log = LoggerFactory.getLogger(LogsService.class);

    private final FeedingLogRepository feedingLogRepository;
    private final MoltLogRepository moltLogRepository;
    private final BehaviorLogRepository behaviorLogRepository;
    private final TarantulaRepository tarantulaRepository;
    private final PlanAccessService planAccessService;
    private final ActivityPostService activityPostService;

    public LogsService(FeedingLogRepository feedingLogRepository,
                       MoltLogRepository moltLogRepository,
                       BehaviorLogRepository behaviorLogRepository,
                       TarantulaRepository tarantulaRepository,
                       PlanAccessService planAccessService,
                       ActivityPostService activityPostService) {
        this.feedingLogRepository = feedingLogRepository;
        this.moltLogRepository = moltLogRepository;
        this.behaviorLogRepository = behaviorLogRepository;
        this.tarantulaRepository = tarantulaRepository;
        this.planAccessService = planAccessService;
        this.activityPostService = activityPostService;
    }

    // ─── Feeding ────────────────────────────────────────────────────────────

    public FeedingLogResponse addFeeding(UUID tarantulaId, FeedingLogRequest req, UUID userId) {
        planAccessService.enforceTarantulaWrite(userId, tarantulaId);
        verifyOwnership(tarantulaId, userId);
        FeedingLog log = new FeedingLog();
        log.setTarantulaId(tarantulaId);
        log.setFedAt(req.getFedAt().toInstant());
        log.setPreyType(req.getPreyType());
        log.setPreySize(req.getPreySize());
        log.setQuantity(req.getQuantity() != null ? req.getQuantity() : 1);
        log.setAccepted(req.getAccepted());
        log.setNotes(req.getNotes());
        FeedingLog saved = feedingLogRepository.save(log);
        if (Boolean.TRUE.equals(req.getPublishToFeed())) {
            publishEventPost(userId, tarantulaId, "feeding", buildFeedingBody(saved));
        }
        return FeedingLogResponse.from(saved);
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
        planAccessService.enforceTarantulaWrite(userId, log.getTarantulaId());
        feedingLogRepository.delete(log);
    }

    // ─── Molt ───────────────────────────────────────────────────────────────

    public MoltLogResponse addMolt(UUID tarantulaId, MoltLogRequest req, UUID userId) {
        planAccessService.enforceTarantulaWrite(userId, tarantulaId);
        verifyOwnership(tarantulaId, userId);
        MoltLog log = new MoltLog();
        log.setTarantulaId(tarantulaId);
        log.setMoltedAt(req.getMoltedAt().toInstant());
        log.setPreSizeCm(req.getPreSizeCm());
        log.setPostSizeCm(req.getPostSizeCm());
        log.setNotes(req.getNotes());
        MoltLog saved = moltLogRepository.save(log);
        if (Boolean.TRUE.equals(req.getPublishToFeed())) {
            publishEventPost(userId, tarantulaId, "molt", buildMoltBody(saved));
        }
        return MoltLogResponse.from(saved);
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
        planAccessService.enforceTarantulaWrite(userId, log.getTarantulaId());
        moltLogRepository.delete(log);
    }

    // ─── Behavior ───────────────────────────────────────────────────────────

    public BehaviorLogResponse addBehavior(UUID tarantulaId, BehaviorLogRequest req, UUID userId) {
        planAccessService.enforceTarantulaWrite(userId, tarantulaId);
        verifyOwnership(tarantulaId, userId);
        BehaviorLog log = new BehaviorLog();
        log.setTarantulaId(tarantulaId);
        log.setLoggedAt(req.getLoggedAt().toInstant());
        log.setMood(req.getMood());
        log.setNotes(req.getNotes());
        BehaviorLog saved = behaviorLogRepository.save(log);
        if (Boolean.TRUE.equals(req.getPublishToFeed())) {
            publishEventPost(userId, tarantulaId, "behavior", buildBehaviorBody(saved));
        }
        return BehaviorLogResponse.from(saved);
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
        planAccessService.enforceTarantulaWrite(userId, log.getTarantulaId());
        behaviorLogRepository.delete(log);
    }

    // ─── Private ────────────────────────────────────────────────────────────

    private void verifyOwnership(UUID tarantulaId, UUID userId) {
        Tarantula t = tarantulaRepository.findById(tarantulaId)
                .orElseThrow(() -> new NotFoundException("Tarántula no encontrada"));
        if (!t.getUserId().equals(userId)) throw new AccessDeniedException("Acceso denegado");
    }

    private void publishEventPost(UUID userId, UUID tarantulaId, String milestone, String body) {
        try {
            activityPostService.createPost(userId, body, "public", milestone, null, tarantulaId);
        } catch (Exception ex) {
            log.warn("No se pudo publicar evento al feed: {}", ex.getMessage());
        }
    }

    private String buildFeedingBody(FeedingLog logRow) {
        String prey = logRow.getPreyType() == null ? "presa" : logRow.getPreyType();
        String accepted = Boolean.FALSE.equals(logRow.getAccepted()) ? "rechazo" : "acepto";
        return "Registro de alimentacion: " + accepted + " " + prey + ".";
    }

    private String buildMoltBody(MoltLog logRow) {
        String pre = logRow.getPreSizeCm() == null ? "-" : logRow.getPreSizeCm().toString();
        String post = logRow.getPostSizeCm() == null ? "-" : logRow.getPostSizeCm().toString();
        return "Registro de muda: pre " + pre + " cm -> post " + post + " cm.";
    }

    private String buildBehaviorBody(BehaviorLog logRow) {
        String mood = logRow.getMood() == null ? "observacion" : logRow.getMood();
        return "Registro de comportamiento: " + mood + ".";
    }
}
