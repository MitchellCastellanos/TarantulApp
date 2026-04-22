package com.tarantulapp.service;

import com.tarantulapp.entity.ReferralCode;
import com.tarantulapp.entity.ReferralRedemption;
import com.tarantulapp.entity.User;
import com.tarantulapp.repository.ReferralCodeRepository;
import com.tarantulapp.repository.ReferralRedemptionRepository;
import com.tarantulapp.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class ReferralService {

    private static final Logger log = LoggerFactory.getLogger(ReferralService.class);
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    /** Consecutive referral counts that unlock one-time extra trial days for the referrer. */
    private static final int[] MILESTONE_COUNTS = {1, 3, 5, 10, 25};
    /** Extra Pro trial days granted once when the referrer reaches each count (0 = badge-only step). */
    private static final int[] MILESTONE_EXTRA_DAYS = {7, 14, 30, 90, 0};
    /** Bit in {@code users.referral_milestone_mask} for each milestone tier (order matches arrays above). */
    private static final int[] MILESTONE_BITS = {1, 2, 4, 8, 16};

    private final ReferralCodeRepository referralCodeRepository;
    private final ReferralRedemptionRepository referralRedemptionRepository;
    private final UserRepository userRepository;
    private final SecureRandom random = new SecureRandom();

    @Value("${app.referral.referee-bonus-days:3}")
    private int refereeBonusDays;

    @Value("${app.referral.referrer-bonus-days:3}")
    private int referrerBonusDays;

    public ReferralService(ReferralCodeRepository referralCodeRepository,
                           ReferralRedemptionRepository referralRedemptionRepository,
                           UserRepository userRepository) {
        this.referralCodeRepository = referralCodeRepository;
        this.referralRedemptionRepository = referralRedemptionRepository;
        this.userRepository = userRepository;
    }

    /** Genera codigo si falta y devuelve datos para Cuenta / Comunidad. */
    @Transactional
    public Map<String, Object> getOrCreateReferralSummary(UUID userId) {
        ensureReferralCodeForUser(userId);
        ReferralCode code = referralCodeRepository.findById(userId).orElseThrow();
        long invited = referralRedemptionRepository.countByReferrerUserId(userId);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("code", code.getCode());
        out.put("invitedCount", invited);
        out.put("shareQuery", "?ref=" + code.getCode());
        out.put("refereeBonusDays", refereeBonusDays);
        out.put("referrerBonusDays", referrerBonusDays);
        out.put("founderKeeper", userRepository.findById(userId)
                .map(u -> Boolean.TRUE.equals(u.getFounderKeeper()))
                .orElse(false));
        return out;
    }

    @Transactional
    public void ensureReferralCodeForUser(UUID userId) {
        if (referralCodeRepository.existsById(userId)) {
            return;
        }
        for (int attempt = 0; attempt < 20; attempt++) {
            String candidate = randomCode(8);
            if (referralCodeRepository.findByCodeIgnoreCase(candidate).isPresent()) {
                continue;
            }
            ReferralCode row = new ReferralCode();
            row.setUserId(userId);
            row.setCode(candidate);
            try {
                referralCodeRepository.save(row);
                return;
            } catch (Exception e) {
                log.warn("Referral code collision on save, retrying: {}", e.getMessage());
            }
        }
        throw new IllegalStateException("Could not generate referral code");
    }

    @Transactional
    public void applyReferralForNewAccount(UUID newUserId, String rawCode) {
        if (rawCode == null || rawCode.isBlank()) {
            return;
        }
        if (referralRedemptionRepository.existsByRefereeUserId(newUserId)) {
            return;
        }
        String normalized = rawCode.trim().toUpperCase();
        Optional<ReferralCode> rcOpt = referralCodeRepository.findByCodeIgnoreCase(normalized);
        if (rcOpt.isEmpty()) {
            return;
        }
        UUID referrerId = rcOpt.get().getUserId();
        if (referrerId.equals(newUserId)) {
            return;
        }
        User referee = userRepository.findById(newUserId).orElse(null);
        User referrer = userRepository.findById(referrerId).orElse(null);
        if (referee == null || referrer == null) {
            return;
        }
        ReferralRedemption redemption = new ReferralRedemption();
        redemption.setReferrerUserId(referrerId);
        redemption.setRefereeUserId(newUserId);
        redemption.setCodeSnapshot(rcOpt.get().getCode());
        referralRedemptionRepository.save(redemption);

        referee.setReferredByUserId(referrerId);
        extendTrial(referee, refereeBonusDays);
        extendTrial(referrer, referrerBonusDays);
        userRepository.save(referee);
        userRepository.save(referrer);
        applyReferrerMilestoneBonuses(referrerId);
        log.info("Referral applied referee={} referrer={}", newUserId, referrerId);
    }

    /**
     * One-time ladder bonuses for the referrer (short, stackable trial extensions).
     * Does not change the per-signup +3/+3 base handled above.
     */
    private void applyReferrerMilestoneBonuses(UUID referrerId) {
        User referrer = userRepository.findById(referrerId).orElse(null);
        if (referrer == null) {
            return;
        }
        long count = referralRedemptionRepository.countByReferrerUserId(referrerId);
        int mask = referrer.getReferralMilestoneMask() == null ? 0 : referrer.getReferralMilestoneMask();
        boolean changed = false;
        for (int i = 0; i < MILESTONE_COUNTS.length; i++) {
            if (count < MILESTONE_COUNTS[i]) {
                break;
            }
            int bit = MILESTONE_BITS[i];
            if ((mask & bit) != 0) {
                continue;
            }
            mask |= bit;
            int extra = MILESTONE_EXTRA_DAYS[i];
            if (extra > 0) {
                extendTrial(referrer, extra);
            }
            if (i == MILESTONE_COUNTS.length - 1) {
                referrer.setFounderKeeper(Boolean.TRUE);
            }
            changed = true;
        }
        if (changed) {
            referrer.setReferralMilestoneMask(mask);
            userRepository.save(referrer);
            log.info("Referral milestones applied referrer={} count={} mask={}", referrerId, count, mask);
        }
    }

    private void extendTrial(User user, int days) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime base = user.getTrialEndsAt() == null || user.getTrialEndsAt().isBefore(now)
                ? now
                : user.getTrialEndsAt();
        user.setTrialEndsAt(base.plusDays(days));
    }

    private String randomCode(int len) {
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) {
            sb.append(CODE_ALPHABET.charAt(random.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }
}
