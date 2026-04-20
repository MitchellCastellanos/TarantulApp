package com.tarantulapp.service;

import com.tarantulapp.entity.BillingEmailEvent;
import com.tarantulapp.entity.Subscription;
import com.tarantulapp.entity.User;
import com.tarantulapp.entity.UserPlan;
import com.tarantulapp.repository.BillingEmailEventRepository;
import com.tarantulapp.repository.SubscriptionRepository;
import com.tarantulapp.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class BillingEmailSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(BillingEmailSchedulerService.class);

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final BillingEmailEventRepository billingEmailEventRepository;
    private final EmailService emailService;

    public BillingEmailSchedulerService(SubscriptionRepository subscriptionRepository,
                                        UserRepository userRepository,
                                        BillingEmailEventRepository billingEmailEventRepository,
                                        EmailService emailService) {
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.billingEmailEventRepository = billingEmailEventRepository;
        this.emailService = emailService;
    }

    @Scheduled(cron = "${app.billing-reminder.cron:0 20 9 * * *}")
    @Transactional
    public void runDailyBillingNotifications() {
        sendProExpiringReminders();
        sendTrialExpiredNotifications();
    }

    private void sendProExpiringReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime from = now.plusDays(2);
        LocalDateTime to = now.plusDays(3);
        List<Subscription> candidates = subscriptionRepository.findByStatusInAndCurrentPeriodEndBetween(
                List.of("active", "trialing", "past_due"),
                from,
                to
        );
        int sent = 0;
        for (Subscription sub : candidates) {
            User user = userRepository.findById(sub.getUserId()).orElse(null);
            if (user == null || !UserPlan.PRO.equals(user.getPlan())) continue;
            String eventKey = "PRO_EXPIRING_2D:" + sub.getProviderSubscriptionId() + ":" + sub.getCurrentPeriodEnd();
            if (billingEmailEventRepository.existsByEventKey(eventKey)) continue;
            emailService.sendProExpiringReminder(user.getEmail(), user.getDisplayName(), sub.getCurrentPeriodEnd());
            persistEvent(user.getId(), eventKey);
            sent++;
        }
        if (sent > 0) {
            log.info("Pro expiring reminders sent: {}", sent);
        }
    }

    private void sendTrialExpiredNotifications() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime from = now.minusDays(1);
        List<User> candidates = userRepository.findByPlanAndTrialEndsAtBetween(UserPlan.FREE, from, now);
        int sent = 0;
        for (User user : candidates) {
            if (user.getTrialEndsAt() == null) continue;
            String eventKey = "TRIAL_EXPIRED:" + user.getId() + ":" + user.getTrialEndsAt();
            if (billingEmailEventRepository.existsByEventKey(eventKey)) continue;
            emailService.sendTrialExpired(user.getEmail(), user.getDisplayName());
            persistEvent(user.getId(), eventKey);
            sent++;
        }
        if (sent > 0) {
            log.info("Trial expired emails sent: {}", sent);
        }
    }

    private void persistEvent(java.util.UUID userId, String eventKey) {
        try {
            BillingEmailEvent event = new BillingEmailEvent();
            event.setUserId(userId);
            event.setEventKey(eventKey);
            billingEmailEventRepository.save(event);
        } catch (DataIntegrityViolationException ignored) {
            // duplicate key due to concurrent schedulers
        }
    }
}
