package com.tarantulapp.service;

import com.tarantulapp.entity.ProDayGrant;
import com.tarantulapp.entity.ProDayGrantSource;
import com.tarantulapp.entity.User;
import com.tarantulapp.repository.ProDayGrantRepository;
import com.tarantulapp.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Records and reports Pro day grants. Day-extension grants (referral / admin / migration) live here;
 * subscription activations remain in {@link BillingService} since the entitlement comes from the
 * subscription row, not the ledger.
 */
@Service
public class ProDayGrantService {

    private static final Logger log = LoggerFactory.getLogger(ProDayGrantService.class);

    private final ProDayGrantRepository grantRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public ProDayGrantService(ProDayGrantRepository grantRepository,
                               UserRepository userRepository,
                               EmailService emailService) {
        this.grantRepository = grantRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    /**
     * Extends {@code user.trial_ends_at} by {@code days} (from max(now, current end)), persists a
     * {@link ProDayGrant} ledger row, and sends the localized "Pro days added" email. The user is
     * saved here so the email reflects the new totals; callers must NOT also save the user with a
     * stale trial_ends_at after invoking this.
     *
     * @param grantedByAdminId admin actor for ADMIN grants; null otherwise.
     * @return the persisted grant.
     */
    @Transactional
    public ProDayGrant recordGrant(User user, int days, ProDayGrantSource source, String reason, UUID grantedByAdminId) {
        if (user == null) throw new IllegalArgumentException("user is required");
        if (days <= 0) throw new IllegalArgumentException("days must be > 0");
        if (source == null) throw new IllegalArgumentException("source is required");
        if (source == ProDayGrantSource.ADMIN && (reason == null || reason.isBlank())) {
            throw new IllegalArgumentException("ADMIN_GRANT_REQUIRES_REASON");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime base = user.getTrialEndsAt() != null && user.getTrialEndsAt().isAfter(now)
                ? user.getTrialEndsAt()
                : now;
        LocalDateTime newEnd = base.plusDays(days);
        user.setTrialEndsAt(newEnd);
        userRepository.save(user);

        ProDayGrant grant = new ProDayGrant();
        grant.setUserId(user.getId());
        grant.setDays(days);
        grant.setSource(source);
        grant.setReason(reason == null || reason.isBlank() ? null : reason.trim());
        grant.setGrantedByAdminId(grantedByAdminId);
        grantRepository.save(grant);

        int totalDaysRemaining = daysRemainingFromNow(newEnd);
        try {
            emailService.sendProDaysAdded(
                    user.getEmail(),
                    user.getDisplayName(),
                    user.getPreferredLocale(),
                    days,
                    source,
                    grant.getReason(),
                    totalDaysRemaining,
                    newEnd
            );
        } catch (Exception e) {
            log.error("Pro-days-added email failed for userId={}: {}", user.getId(), e.getMessage());
        }
        return grant;
    }

    /** True if the user has ever received a grant from this source (used to detect first passport claim). */
    @Transactional(readOnly = true)
    public boolean hasGrantOfSource(UUID userId, ProDayGrantSource source) {
        return grantRepository.existsByUserIdAndSource(userId, source);
    }

    /** Read-only payload for the gamification card. */
    @Transactional(readOnly = true)
    public Map<String, Object> summaryForUser(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        List<ProDayGrant> grants = grantRepository.findByUserIdOrderByGrantedAtDesc(userId);
        int totalDaysGrantedEver = grants.stream().mapToInt(ProDayGrant::getDays).sum();
        int totalDaysRemaining = daysRemainingFromNow(user.getTrialEndsAt());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("plan", user.getPlan() == null ? "FREE" : user.getPlan().name());
        out.put("trialEndsAt", user.getTrialEndsAt());
        out.put("totalDaysRemaining", totalDaysRemaining);
        out.put("totalDaysGrantedEver", totalDaysGrantedEver);
        out.put("grants", grants.stream().map(this::serializeGrant).collect(Collectors.toList()));
        return out;
    }

    private Map<String, Object> serializeGrant(ProDayGrant g) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", g.getId());
        row.put("days", g.getDays());
        row.put("source", g.getSource() == null ? null : g.getSource().name());
        row.put("reason", g.getReason());
        row.put("grantedAt", g.getGrantedAt());
        return row;
    }

    /** Floored calendar days from now to {@code end}; clamped at 0 for past dates. */
    public static int daysRemainingFromNow(LocalDateTime end) {
        if (end == null) return 0;
        LocalDateTime now = LocalDateTime.now();
        if (!end.isAfter(now)) return 0;
        long seconds = Duration.between(now, end).getSeconds();
        long days = (seconds + 86_399) / 86_400;
        return (int) Math.max(0, days);
    }
}
