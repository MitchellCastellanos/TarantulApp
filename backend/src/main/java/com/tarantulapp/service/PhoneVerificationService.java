package com.tarantulapp.service;

import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Orchestrates phone ownership verification on top of {@link TwilioVerifyService}: normalizes/validates
 * the number (E.164), throttles code requests, and flips {@code users.phone_verified_at} once a code is
 * confirmed. Verification gates batch / non-P2P label issuance (handled by callers).
 */
@Service
public class PhoneVerificationService {

    /** E.164: leading +, country digit 1-9, total 8-15 digits. */
    private static final Pattern E164 = Pattern.compile("^\\+[1-9]\\d{6,14}$");
    private static final Duration MIN_RESEND_INTERVAL = Duration.ofSeconds(30);
    private static final Duration ATTEMPT_WINDOW = Duration.ofHours(1);
    private static final int MAX_ATTEMPTS_PER_WINDOW = 5;

    private final UserRepository userRepository;
    private final TwilioVerifyService twilioVerifyService;

    public PhoneVerificationService(UserRepository userRepository, TwilioVerifyService twilioVerifyService) {
        this.userRepository = userRepository;
        this.twilioVerifyService = twilioVerifyService;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> status(UUID userId) {
        return toStatus(requireUser(userId));
    }

    /** Sends a verification code to {@code phoneRaw}. */
    @Transactional
    public Map<String, Object> start(UUID userId, String phoneRaw) {
        User user = requireUser(userId);
        String phone = normalize(phoneRaw);
        if (!E164.matcher(phone).matches()) {
            throw new IllegalArgumentException("phone_invalid_e164");
        }

        Instant now = Instant.now();
        boolean samePhone = phone.equals(user.getPhoneE164());
        if (!samePhone) {
            // New number: drop any prior verified/pending state and reset throttling.
            user.setPhoneE164(phone);
            user.setPhoneVerifiedAt(null);
            user.setPhoneVerifyAttempts(0);
            user.setPhoneVerifyLastSentAt(null);
        } else if (user.isPhoneVerified()) {
            // Already verified this exact number — nothing to do.
            userRepository.save(user);
            return toStatus(user);
        }

        enforceRateLimit(user, now);

        twilioVerifyService.startVerification(phone);

        int attempts = withinWindow(user.getPhoneVerifyLastSentAt(), now) ? nz(user.getPhoneVerifyAttempts()) : 0;
        user.setPhoneVerifyAttempts(attempts + 1);
        user.setPhoneVerifyLastSentAt(now);
        userRepository.save(user);

        Map<String, Object> out = toStatus(user);
        out.put("sent", true);
        return out;
    }

    /** Confirms {@code code} against the pending number; marks the phone verified on success. */
    @Transactional
    public Map<String, Object> check(UUID userId, String code) {
        User user = requireUser(userId);
        if (user.getPhoneE164() == null || user.getPhoneE164().isBlank()) {
            throw new IllegalArgumentException("phone_not_set");
        }
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("phone_code_required");
        }
        if (user.isPhoneVerified()) {
            return toStatus(user);
        }
        boolean approved = twilioVerifyService.checkCode(user.getPhoneE164(), code.trim());
        if (!approved) {
            throw new IllegalArgumentException("phone_code_invalid");
        }
        user.setPhoneVerifiedAt(Instant.now());
        user.setPhoneVerifyAttempts(0);
        userRepository.save(user);
        return toStatus(user);
    }

    private void enforceRateLimit(User user, Instant now) {
        Instant last = user.getPhoneVerifyLastSentAt();
        if (last != null && Duration.between(last, now).compareTo(MIN_RESEND_INTERVAL) < 0) {
            throw new IllegalArgumentException("phone_verify_rate_limited");
        }
        if (withinWindow(last, now) && nz(user.getPhoneVerifyAttempts()) >= MAX_ATTEMPTS_PER_WINDOW) {
            throw new IllegalArgumentException("phone_verify_too_many_attempts");
        }
    }

    private boolean withinWindow(Instant last, Instant now) {
        return last != null && Duration.between(last, now).compareTo(ATTEMPT_WINDOW) < 0;
    }

    private static int nz(Integer v) {
        return v == null ? 0 : v;
    }

    private String normalize(String raw) {
        if (raw == null) return "";
        String trimmed = raw.trim().replaceAll("[\\s()\\-.]", "");
        return trimmed;
    }

    private Map<String, Object> toStatus(User user) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("phone", user.getPhoneE164());
        out.put("verified", user.isPhoneVerified());
        out.put("verifiedAt", user.getPhoneVerifiedAt());
        out.put("smsEnabled", twilioVerifyService.isEnabled());
        return out;
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
    }
}
