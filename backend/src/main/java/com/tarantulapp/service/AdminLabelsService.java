package com.tarantulapp.service;

import com.tarantulapp.dto.AdminIssuerLabelsDTO;
import com.tarantulapp.dto.AdminLabelRowDTO;
import com.tarantulapp.entity.Passport;
import com.tarantulapp.entity.User;
import com.tarantulapp.repository.InventoryAdjustmentRepository;
import com.tarantulapp.repository.PassportRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Admin "labels issued per user" overview: who issued labels, whether they are a verified origin, and
 * the claim status of each label (green = confirmed, yellow = pending, red = unconfirmed past 2h).
 */
@Service
public class AdminLabelsService {

    /** A claim is "confirmed" once the issuer applies the claim signal (logged as this adjustment). */
    static final String CLAIM_SUGGESTION_REASON = "CLAIM_SUGGESTION";
    /** Grace period before an unconfirmed claim is flagged red / alerts the admin. */
    static final Duration CONFIRM_GRACE = Duration.ofHours(2);

    private final PassportRepository passportRepository;
    private final UserRepository userRepository;
    private final InventoryAdjustmentRepository adjustmentRepository;

    @Value("${app.public-base-url:https://tarantulapp.com}")
    private String publicBaseUrl;

    public AdminLabelsService(PassportRepository passportRepository,
                              UserRepository userRepository,
                              InventoryAdjustmentRepository adjustmentRepository) {
        this.passportRepository = passportRepository;
        this.userRepository = userRepository;
        this.adjustmentRepository = adjustmentRepository;
    }

    @Transactional(readOnly = true)
    public List<AdminIssuerLabelsDTO> listIssuers() {
        Instant now = Instant.now();
        List<AdminIssuerLabelsDTO> out = new ArrayList<>();
        for (UUID issuerId : passportRepository.findDistinctIssuerIds()) {
            List<Passport> passports = passportRepository.findByCreatedByUserIdOrderByCreatedAtDesc(issuerId);
            AdminIssuerLabelsDTO dto = new AdminIssuerLabelsDTO();
            dto.setUserId(issuerId);
            User user = userRepository.findById(issuerId).orElse(null);
            if (user != null) {
                dto.setDisplayName(user.getDisplayName());
                dto.setEmail(user.getEmail());
                dto.setVerifiedOrigin(VerifiedOriginService.isVerified(user));
                dto.setOriginKind(user.getVerifiedOriginKind());
            }
            dto.setIssued(passports.size());
            for (Passport p : passports) {
                switch (statusOf(p, now)) {
                    case "UNCLAIMED" -> dto.setUnclaimed(dto.getUnclaimed() + 1);
                    case "PENDING" -> dto.setPendingConfirm(dto.getPendingConfirm() + 1);
                    case "CONFIRMED" -> dto.setConfirmed(dto.getConfirmed() + 1);
                    case "OVERDUE" -> dto.setOverdue(dto.getOverdue() + 1);
                    default -> { /* no-op */ }
                }
            }
            out.add(dto);
        }
        // Surface issuers needing attention first (most overdue, then most pending).
        out.sort(Comparator.comparingLong(AdminIssuerLabelsDTO::getOverdue)
                .thenComparingLong(AdminIssuerLabelsDTO::getPendingConfirm).reversed());
        return out;
    }

    @Transactional(readOnly = true)
    public List<AdminLabelRowDTO> passportsForIssuer(UUID issuerId) {
        Instant now = Instant.now();
        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        List<AdminLabelRowDTO> rows = new ArrayList<>();
        for (Passport p : passportRepository.findByCreatedByUserIdOrderByCreatedAtDesc(issuerId)) {
            AdminLabelRowDTO row = new AdminLabelRowDTO();
            row.setPassportId(p.getId());
            row.setShortId(p.getShortId());
            row.setPublicUrl(base + "/t/" + p.getShortId());
            row.setScientificName(p.getSpecies() != null ? p.getSpecies().getScientificName() : null);
            row.setCreatedAt(p.getCreatedAt());
            row.setClaimedAt(p.getClaimedAt());
            String status = statusOf(p, now);
            row.setStatus(status);
            row.setColor(colorOf(status));
            rows.add(row);
        }
        return rows;
    }

    /** True when the issuer has confirmed the claim (applied the claim signal). */
    public boolean isConfirmed(UUID passportId) {
        return adjustmentRepository.existsByPassportIdAndReason(passportId, CLAIM_SUGGESTION_REASON);
    }

    String statusOf(Passport p, Instant now) {
        if (p.getClaimedAt() == null) return "UNCLAIMED";
        if (isConfirmed(p.getId())) return "CONFIRMED";
        boolean overdue = p.getClaimedAt().isBefore(now.minus(CONFIRM_GRACE));
        return overdue ? "OVERDUE" : "PENDING";
    }

    static String colorOf(String status) {
        return switch (status) {
            case "CONFIRMED" -> "green";
            case "PENDING" -> "yellow";
            case "OVERDUE" -> "red";
            default -> "grey";
        };
    }

    Optional<User> issuer(Passport p) {
        return p.getCreatedByUserId() == null ? Optional.empty() : userRepository.findById(p.getCreatedByUserId());
    }
}
