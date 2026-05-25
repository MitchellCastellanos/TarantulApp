package com.tarantulapp.service;

import com.tarantulapp.entity.User;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.util.BetaMailBodies;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Commercial vendor activation ({@code verified_breeder}) — separate from trust badge ({@code storefront_verified_at}).
 */
@Service
public class VendorActivationService {

    private static final Logger log = LoggerFactory.getLogger(VendorActivationService.class);

    private final UserRepository userRepository;
    private final NewsletterService newsletterService;
    private final ReferralService referralService;
    private final EmailService emailService;

    public VendorActivationService(UserRepository userRepository,
                                   NewsletterService newsletterService,
                                   ReferralService referralService,
                                   EmailService emailService) {
        this.userRepository = userRepository;
        this.newsletterService = newsletterService;
        this.referralService = referralService;
        this.emailService = emailService;
    }

    @Transactional
    public User activateVendor(UUID userId, boolean sendWelcomeEmail) {
        User user = userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        if (Boolean.TRUE.equals(user.getVerifiedBreeder())) {
            return user;
        }
        Instant now = Instant.now();
        user.setVerifiedBreeder(true);
        user.setVerifiedBreederAt(now);
        user.setVendorInviteToken(null);
        user.setVendorInviteSentAt(null);
        user.setVendorInviteExpiresAt(null);
        userRepository.save(user);
        newsletterService.ensureSubscribedOnVerified(userId);
        referralService.ensureReferralCodeForUser(userId);
        referralService.syncVendorReferralCodeFlag(userId);
        if (sendWelcomeEmail) {
            sendVendorWelcomeEmail(user);
        }
        return user;
    }

    private void sendVendorWelcomeEmail(User user) {
        try {
            String loc = user.getPreferredLocale() != null && !user.getPreferredLocale().isBlank()
                    ? BetaMailBodies.normalizeLocale(user.getPreferredLocale())
                    : "es";
            String greeting = user.getDisplayName() != null && !user.getDisplayName().isBlank()
                    ? user.getDisplayName().trim()
                    : user.getEmail();
            emailService.sendBetaCampaignEmail(user.getEmail(), greeting, "vendor_welcome_mx", loc);
        } catch (Exception e) {
            log.warn("Vendor welcome email failed for user {}: {}", user.getId(), e.getMessage());
        }
    }
}
