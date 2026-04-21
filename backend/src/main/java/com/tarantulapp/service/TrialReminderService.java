package com.tarantulapp.service;

import com.tarantulapp.entity.User;
import com.tarantulapp.entity.UserPlan;
import com.tarantulapp.entity.TrialEmailEvent;
import com.tarantulapp.repository.TrialEmailEventRepository;
import com.tarantulapp.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TrialReminderService {

    private static final Logger log = LoggerFactory.getLogger(TrialReminderService.class);
    private static final String TRIAL_ENDING_2_DAYS = "TRIAL_ENDING_2_DAYS";

    private final UserRepository userRepository;
    private final TrialEmailEventRepository trialEmailEventRepository;
    private final EmailService emailService;

    @Value("${app.trial-reminder.enabled:true}")
    private boolean trialReminderEnabled;

    public TrialReminderService(UserRepository userRepository,
                                TrialEmailEventRepository trialEmailEventRepository,
                                EmailService emailService) {
        this.userRepository = userRepository;
        this.trialEmailEventRepository = trialEmailEventRepository;
        this.emailService = emailService;
    }

    @Scheduled(cron = "${app.trial-reminder.cron:0 0 9 * * *}")
    @Transactional
    public void sendTrialEndingReminders() {
        if (!trialReminderEnabled) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime windowStart = now.plusDays(2);
        LocalDateTime windowEnd = now.plusDays(2).plusHours(24);

        List<User> users = userRepository.findByPlanAndTrialEndsAtBetween(
                UserPlan.FREE,
                windowStart,
                windowEnd
        );

        int sentCount = 0;
        for (User user : users) {
            if (trialEmailEventRepository.existsByUserIdAndEventType(user.getId(), TRIAL_ENDING_2_DAYS)) {
                continue;
            }
            emailService.sendTrialEndingReminder(user.getEmail(), user.getDisplayName(), user.getTrialEndsAt());
            sentCount++;
            try {
                TrialEmailEvent event = new TrialEmailEvent();
                event.setUserId(user.getId());
                event.setEventType(TRIAL_ENDING_2_DAYS);
                trialEmailEventRepository.save(event);
            } catch (DataIntegrityViolationException ignored) {
                // Concurrent sender already persisted this event.
            }
        }

        if (sentCount > 0) {
            log.info("Trial reminder emails sent: {}", sentCount);
        }
    }
}
