package com.tarantulapp.service;

import com.tarantulapp.entity.ModerationReport;
import com.tarantulapp.entity.Tarantula;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.ModerationReportRepository;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ModerationService {

    private final ModerationReportRepository moderationReportRepository;
    private final TarantulaRepository tarantulaRepository;
    private final SecurityHelper securityHelper;

    public ModerationService(ModerationReportRepository moderationReportRepository,
                             TarantulaRepository tarantulaRepository,
                             SecurityHelper securityHelper) {
        this.moderationReportRepository = moderationReportRepository;
        this.tarantulaRepository = tarantulaRepository;
        this.securityHelper = securityHelper;
    }

    @Transactional
    public void reportPublicTarantula(String shortId, String reason, String details) {
        Tarantula target = tarantulaRepository.findByShortId(shortId)
                .orElseThrow(() -> new NotFoundException("Perfil no encontrado"));
        ModerationReport r = new ModerationReport();
        r.setReporterUserId(securityHelper.tryGetCurrentUserId().orElse(null));
        r.setTargetType("public_tarantula");
        r.setTargetId(target.getId());
        r.setTargetRef(shortId);
        r.setReason(reason == null || reason.isBlank() ? "other" : reason.trim());
        r.setDetails(details == null ? null : details.trim());
        moderationReportRepository.save(r);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> adminList(String status) {
        List<ModerationReport> rows = (status == null || status.isBlank())
                ? moderationReportRepository.findTop100ByOrderByCreatedAtDesc()
                : moderationReportRepository.findByStatusOrderByCreatedAtDesc(status.trim().toLowerCase());
        return rows.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> adminResolve(UUID reportId, String action, String note) {
        ModerationReport report = moderationReportRepository.findById(reportId)
                .orElseThrow(() -> new NotFoundException("Reporte no encontrado"));
        String normalizedAction = action == null ? "dismiss" : action.trim().toLowerCase();
        if ("hide_tarantula".equals(normalizedAction) && report.getTargetId() != null) {
            tarantulaRepository.findById(report.getTargetId()).ifPresent(t -> {
                t.setIsPublic(false);
                tarantulaRepository.save(t);
            });
            report.setStatus("resolved_hidden");
        } else {
            report.setStatus("resolved_dismissed");
        }
        report.setResolvedAt(Instant.now());
        report.setResolvedBy(securityHelper.getCurrentUserId());
        report.setResolutionNote(note == null ? null : note.trim());
        moderationReportRepository.save(report);
        return toDto(report);
    }

    private Map<String, Object> toDto(ModerationReport r) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", r.getId());
        out.put("status", r.getStatus());
        out.put("targetType", r.getTargetType());
        out.put("targetId", r.getTargetId());
        out.put("targetRef", r.getTargetRef() == null ? "" : r.getTargetRef());
        out.put("reason", r.getReason());
        out.put("details", r.getDetails() == null ? "" : r.getDetails());
        out.put("createdAt", r.getCreatedAt());
        out.put("resolvedAt", r.getResolvedAt() == null ? "" : r.getResolvedAt().toString());
        return out;
    }
}
