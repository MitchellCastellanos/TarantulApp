package com.tarantulapp.service;

import com.tarantulapp.entity.User;
import com.tarantulapp.entity.VendorVerificationSubmission;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.repository.VendorVerificationSubmissionRepository;
import com.tarantulapp.util.BetaMailBodies;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class VendorVerificationService {

    private final VendorVerificationSubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final VerifiedOriginService verifiedOriginService;

    public VendorVerificationService(VendorVerificationSubmissionRepository submissionRepository,
                                   UserRepository userRepository,
                                   EmailService emailService,
                                   VerifiedOriginService verifiedOriginService) {
        this.submissionRepository = submissionRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.verifiedOriginService = verifiedOriginService;
    }

    @Transactional
    public Map<String, Object> submit(UUID userId, String selfieUrl, String inventoryUrl, String paperUrl) {
        if (selfieUrl == null || selfieUrl.isBlank()) {
            throw new IllegalArgumentException("SELFIE_MEDIA_REQUIRED");
        }
        if (inventoryUrl == null || inventoryUrl.isBlank()) {
            throw new IllegalArgumentException("INVENTORY_MEDIA_REQUIRED");
        }
        User user = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
        if (!Boolean.TRUE.equals(user.getVerifiedBreeder())) {
            throw new IllegalArgumentException("VENDOR_ACTIVATION_REQUIRED");
        }
        if (user.getStorefrontVerifiedAt() != null || VerifiedOriginService.isVerified(user)) {
            throw new IllegalArgumentException("STOREFRONT_ALREADY_VERIFIED");
        }
        submissionRepository.findFirstByUserIdOrderByCreatedAtDesc(userId).ifPresent(existing -> {
            if ("pending".equalsIgnoreCase(existing.getStatus())) {
                throw new IllegalArgumentException("SUBMISSION_ALREADY_PENDING");
            }
        });

        VendorVerificationSubmission sub = new VendorVerificationSubmission();
        sub.setUserId(userId);
        sub.setStatus("pending");
        sub.setSelfieMediaUrl(trimUrl(selfieUrl));
        sub.setInventoryMediaUrl(trimUrl(inventoryUrl));
        sub.setPaperMediaUrl(trimUrl(paperUrl));
        VendorVerificationSubmission saved = submissionRepository.save(sub);
        String locale = resolveUserLocale(user);
        emailService.sendVendorVerificationSubmitted(user.getEmail(), user.getDisplayName(), locale);
        emailService.sendAdminVendorVerificationSubmitted(saved.getId(), user.getEmail(), user.getDisplayName());
        return mapSubmission(saved, user);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> myStatus(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("verifiedBreeder", Boolean.TRUE.equals(user.getVerifiedBreeder()));
        out.put("storefrontVerified", VerifiedOriginService.isVerified(user));
        out.put("storefrontVerifiedAt", user.getVerifiedOriginAt() != null ? user.getVerifiedOriginAt() : user.getStorefrontVerifiedAt());
        out.put("origin", verifiedOriginService.toPublicMap(user));
        submissionRepository.findFirstByUserIdOrderByCreatedAtDesc(userId)
                .ifPresentOrElse(s -> out.put("latestSubmission", mapSubmission(s, user)),
                        () -> out.put("latestSubmission", null));
        return out;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> adminList(String statusFilter) {
        List<VendorVerificationSubmission> rows = statusFilter == null || statusFilter.isBlank()
                ? submissionRepository.findTop50ByOrderByCreatedAtDesc()
                : submissionRepository.findTop50ByStatusOrderByCreatedAtDesc(statusFilter.trim().toLowerCase());
        return rows.stream().map(s -> {
            User u = userRepository.findById(s.getUserId()).orElse(null);
            return mapSubmission(s, u);
        }).collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> adminReview(UUID submissionId, String status, String reviewerNote) {
        String st = status == null ? "" : status.trim().toLowerCase();
        if (!"approved".equals(st) && !"rejected".equals(st)) {
            throw new IllegalArgumentException("INVALID_STATUS");
        }
        VendorVerificationSubmission sub = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new NotFoundException("Submission not found"));
        sub.setStatus(st);
        sub.setReviewerNote(reviewerNote == null ? null : reviewerNote.trim());
        sub.setReviewedAt(Instant.now());
        submissionRepository.save(sub);

        User user = userRepository.findById(sub.getUserId()).orElseThrow(() -> new NotFoundException("User not found"));
        String locale = resolveUserLocale(user);
        if ("approved".equals(st)) {
            if (!Boolean.TRUE.equals(user.getVerifiedBreeder())) {
                throw new IllegalArgumentException("VENDOR_ACTIVATION_REQUIRED");
            }
            verifiedOriginService.grantVerifiedOrigin(user.getId(), com.tarantulapp.entity.VerifiedOriginKind.VENDOR);
            user = userRepository.findById(user.getId()).orElseThrow();
            emailService.sendVendorVerificationApproved(user.getEmail(), user.getDisplayName(), locale);
        } else if ("rejected".equals(st)) {
            if (user.getStorefrontVerifiedAt() != null) {
                // Keep existing badge unless ops explicitly revokes via admin storefront-verified endpoint.
            } else {
                emailService.sendVendorVerificationRejected(
                        user.getEmail(), user.getDisplayName(), locale, sub.getReviewerNote());
            }
        }
        return mapSubmission(sub, user);
    }

    private Map<String, Object> mapSubmission(VendorVerificationSubmission s, User user) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", s.getId());
        out.put("userId", s.getUserId());
        out.put("status", s.getStatus());
        out.put("selfieMediaUrl", s.getSelfieMediaUrl());
        out.put("inventoryMediaUrl", s.getInventoryMediaUrl());
        out.put("paperMediaUrl", s.getPaperMediaUrl());
        out.put("reviewerNote", s.getReviewerNote() == null ? "" : s.getReviewerNote());
        out.put("createdAt", s.getCreatedAt());
        out.put("reviewedAt", s.getReviewedAt());
        if (user != null) {
            out.put("userEmail", user.getEmail());
            out.put("userDisplayName", user.getDisplayName() == null ? "" : user.getDisplayName());
            out.put("verifiedBreeder", Boolean.TRUE.equals(user.getVerifiedBreeder()));
            out.put("storefrontVerified", VerifiedOriginService.isVerified(user));
            out.put("storefrontVerifiedAt", user.getVerifiedOriginAt() != null ? user.getVerifiedOriginAt() : user.getStorefrontVerifiedAt());
            out.put("origin", verifiedOriginService.toPublicMap(user));
        }
        return out;
    }

    private static String trimUrl(String raw) {
        if (raw == null) {
            return null;
        }
        String t = raw.trim();
        return t.isEmpty() ? null : t;
    }

    private static String resolveUserLocale(User user) {
        if (user == null) {
            return "es";
        }
        if (user.getPreferredLocale() != null && !user.getPreferredLocale().isBlank()) {
            return BetaMailBodies.normalizeLocale(user.getPreferredLocale());
        }
        if (user.getBetaPreferredLocale() != null && !user.getBetaPreferredLocale().isBlank()) {
            return BetaMailBodies.normalizeLocale(user.getBetaPreferredLocale());
        }
        return "es";
    }
}
