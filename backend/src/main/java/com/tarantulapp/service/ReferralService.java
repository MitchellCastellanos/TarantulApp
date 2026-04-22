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
        log.info("Referral applied referee={} referrer={}", newUserId, referrerId);
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
