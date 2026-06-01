package com.tarantulapp.service;

import com.tarantulapp.entity.Passport;
import com.tarantulapp.entity.User;
import com.tarantulapp.repository.PassportRepository;
import com.tarantulapp.repository.UserRepository;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Every 15 minutes, finds labels that were claimed more than 2 hours ago but whose issuer has not yet
 * confirmed the claim, and emails the admin to contact the responsible seller/vendor/partner. Each
 * passport is processed once (tracked via {@code claim_pending_alert_sent_at}).
 */
@Service
public class ClaimConfirmationAlertService {

    private static final Logger log = LoggerFactory.getLogger(ClaimConfirmationAlertService.class);

    private final PassportRepository passportRepository;
    private final UserRepository userRepository;
    private final AdminLabelsService adminLabelsService;
    private final EmailService emailService;

    public ClaimConfirmationAlertService(PassportRepository passportRepository,
                                         UserRepository userRepository,
                                         AdminLabelsService adminLabelsService,
                                         EmailService emailService) {
        this.passportRepository = passportRepository;
        this.userRepository = userRepository;
        this.adminLabelsService = adminLabelsService;
        this.emailService = emailService;
    }

    @Scheduled(cron = "${app.claim-alert.cron:0 */15 * * * *}")
    @SchedulerLock(name = "claimConfirmationAlerts", lockAtLeastFor = "PT1M", lockAtMostFor = "PT10M")
    @Transactional
    public void alertOverduePendingClaims() {
        Instant cutoff = Instant.now().minus(AdminLabelsService.CONFIRM_GRACE);
        List<Passport> overdue =
                passportRepository.findByClaimedAtIsNotNullAndClaimedAtBeforeAndClaimPendingAlertSentAtIsNull(cutoff);
        if (overdue.isEmpty()) return;

        int alerted = 0;
        for (Passport p : overdue) {
            if (!adminLabelsService.isConfirmed(p.getId())) {
                User issuer = p.getCreatedByUserId() == null ? null
                        : userRepository.findById(p.getCreatedByUserId()).orElse(null);
                emailService.sendAdminClaimPendingAlert(
                        p.getShortId(),
                        issuer != null ? issuer.getDisplayName() : null,
                        issuer != null ? issuer.getEmail() : null,
                        p.getClaimedAt());
                alerted++;
            }
            // Mark processed either way so we don't rescan confirmed/handled claims forever.
            p.setClaimPendingAlertSentAt(Instant.now());
            passportRepository.save(p);
        }
        log.info("Claim-confirmation alert job: processed {} overdue claim(s), alerted {}.", overdue.size(), alerted);
    }
}
