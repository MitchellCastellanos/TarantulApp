package com.tarantulapp.service;

import com.tarantulapp.entity.User;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.util.BetaMailBodies;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class VendorInviteService {

    private static final Logger log = LoggerFactory.getLogger(VendorInviteService.class);
    private static final Duration INVITE_TTL = Duration.ofDays(14);

    private final UserRepository userRepository;
    private final EmailService emailService;

    @Value("${app.base-url:http://localhost:5173}")
    private String appBaseUrl;

    public VendorInviteService(UserRepository userRepository, EmailService emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    @Transactional
    public User sendInvite(UUID targetUserId, String requestedLocale) {
        User u = userRepository.findById(targetUserId).orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        if (Boolean.TRUE.equals(u.getVerifiedBreeder())) {
            throw new IllegalArgumentException("USER_ALREADY_VENDOR");
        }
        UUID token = UUID.randomUUID();
        Instant now = Instant.now();
        u.setVendorInviteToken(token);
        u.setVendorInviteSentAt(now);
        u.setVendorInviteExpiresAt(now.plus(INVITE_TTL));
        userRepository.save(u);
        String loc = resolveLocale(u, requestedLocale);
        String inviteUrl = buildInviteUrl(token);
        String greeting;
        if (u.getDisplayName() != null && !u.getDisplayName().isBlank()) {
            greeting = u.getDisplayName().trim();
        } else {
            greeting = u.getEmail();
        }
        emailService.sendVendorInviteEmail(u.getEmail(), greeting, loc, inviteUrl);
        return userRepository.findById(targetUserId).orElse(u);
    }

    /**
     * After the user accepts in-app, sends the long-form vendor welcome (same as manual admin outreach).
     * Swallows SMTP errors so acceptance always commits.
     */
    public void sendWelcomeAfterAccept(User acceptedUser) {
        if (acceptedUser == null) {
            return;
        }
        try {
            String loc = resolveLocale(acceptedUser, null);
            String greeting;
            if (acceptedUser.getDisplayName() != null && !acceptedUser.getDisplayName().isBlank()) {
                greeting = acceptedUser.getDisplayName().trim();
            } else {
                greeting = acceptedUser.getEmail();
            }
            emailService.sendBetaCampaignEmail(acceptedUser.getEmail(), greeting, "vendor_welcome_mx", loc);
        } catch (Exception e) {
            log.warn("Vendor welcome after accept failed for {}: {}", acceptedUser.getId(),
                    e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
        }
    }

    private String resolveLocale(User u, String requested) {
        if (requested != null && !requested.isBlank()) {
            return BetaMailBodies.normalizeLocale(requested);
        }
        if (u.getPreferredLocale() != null && !u.getPreferredLocale().isBlank()) {
            return BetaMailBodies.normalizeLocale(u.getPreferredLocale());
        }
        if (u.getBetaPreferredLocale() != null && !u.getBetaPreferredLocale().isBlank()) {
            return BetaMailBodies.normalizeLocale(u.getBetaPreferredLocale());
        }
        return "es";
    }

    private String buildInviteUrl(UUID token) {
        String base = appBaseUrl == null ? "" : appBaseUrl.trim();
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        if (base.isEmpty()) {
            base = BetaMailBodies.DEFAULT_APP_URL;
        }
        return base + "/vendor-invite?token=" + token;
    }

    public Map<String, Object> publicTokenStatus(String rawToken) {
        Map<String, Object> out = new LinkedHashMap<>();
        UUID token;
        try {
            token = UUID.fromString(rawToken == null ? "" : rawToken.trim());
        } catch (Exception e) {
            out.put("status", "not_found");
            out.put("ok", false);
            return out;
        }
        var opt = userRepository.findByVendorInviteToken(token);
        if (opt.isEmpty()) {
            out.put("status", "not_found");
            out.put("ok", false);
            return out;
        }
        User u = opt.get();
        Instant exp = u.getVendorInviteExpiresAt();
        boolean expired = exp != null && exp.isBefore(Instant.now());
        if (expired) {
            out.put("status", "expired");
            out.put("ok", false);
            out.put("emailHint", maskEmail(u.getEmail()));
            out.put("expiresAt", exp);
            return out;
        }
        if (Boolean.TRUE.equals(u.getVerifiedBreeder())) {
            out.put("status", "already_accepted");
            out.put("ok", false);
            out.put("emailHint", maskEmail(u.getEmail()));
            return out;
        }
        out.put("status", "valid");
        out.put("ok", true);
        out.put("emailHint", maskEmail(u.getEmail()));
        out.put("expiresAt", exp);
        return out;
    }

    @Transactional
    public User accept(UUID currentUserId, UUID token) {
        User invited = userRepository.findByVendorInviteToken(token)
                .orElseThrow(() -> new IllegalArgumentException("INVITE_NOT_FOUND"));
        if (!invited.getId().equals(currentUserId)) {
            throw new IllegalArgumentException("INVITE_WRONG_ACCOUNT");
        }
        Instant exp = invited.getVendorInviteExpiresAt();
        if (exp != null && exp.isBefore(Instant.now())) {
            throw new IllegalArgumentException("INVITE_EXPIRED");
        }
        if (Boolean.TRUE.equals(invited.getVerifiedBreeder())) {
            throw new IllegalArgumentException("USER_ALREADY_VENDOR");
        }
        invited.setVerifiedBreeder(true);
        invited.setVerifiedBreederAt(Instant.now());
        invited.setVendorInviteToken(null);
        invited.setVendorInviteSentAt(null);
        invited.setVendorInviteExpiresAt(null);
        userRepository.save(invited);
        return invited;
    }

    @Transactional
    public void revokeInvite(UUID userId) {
        User u = userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        if (Boolean.TRUE.equals(u.getVerifiedBreeder())) {
            throw new IllegalArgumentException("USER_ALREADY_VENDOR");
        }
        u.setVendorInviteToken(null);
        u.setVendorInviteSentAt(null);
        u.setVendorInviteExpiresAt(null);
        userRepository.save(u);
    }

    public static String maskEmail(String email) {
        if (email == null) {
            return "";
        }
        String e = email.trim();
        int at = e.indexOf('@');
        if (at <= 0) {
            return "***";
        }
        String local = e.substring(0, at);
        String dom = e.substring(at + 1);
        if (local.length() <= 1) {
            return "*" + "@" + dom;
        }
        return local.charAt(0) + "***@" + dom;
    }
}
