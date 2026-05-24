package com.tarantulapp.service;

import com.tarantulapp.entity.BetaEmailSend;
import com.tarantulapp.entity.User;
import com.tarantulapp.repository.BetaEmailSendRepository;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.util.BetaMailBodies;
import com.tarantulapp.util.SupportedLocales;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TarantulaPublicDefaultAnnouncementService {

    public static final String CAMPAIGN_KEY = "tarantula_public_default";

    private static final Logger log = LoggerFactory.getLogger(TarantulaPublicDefaultAnnouncementService.class);

    private final TarantulaRepository tarantulaRepository;
    private final UserRepository userRepository;
    private final BetaEmailSendRepository betaEmailSendRepository;
    private final EmailService emailService;

    public TarantulaPublicDefaultAnnouncementService(TarantulaRepository tarantulaRepository,
                                                     UserRepository userRepository,
                                                     BetaEmailSendRepository betaEmailSendRepository,
                                                     EmailService emailService) {
        this.tarantulaRepository = tarantulaRepository;
        this.userRepository = userRepository;
        this.betaEmailSendRepository = betaEmailSendRepository;
        this.emailService = emailService;
    }

    @Transactional
    public Map<String, Object> sendToKeepersWithCollection() {
        List<UUID> keeperIds = tarantulaRepository.findDistinctUserIds();
        List<Map<String, Object>> results = new ArrayList<>();
        int sent = 0;
        int skipped = 0;
        int failed = 0;

        for (UUID userId : keeperIds) {
            if (betaEmailSendRepository.existsByUserIdAndCampaignKey(userId, CAMPAIGN_KEY)) {
                skipped++;
                results.add(resultRow(userId, "skipped", "ALREADY_SENT", null));
                continue;
            }
            User user = userRepository.findById(userId).orElse(null);
            if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
                skipped++;
                results.add(resultRow(userId, "skipped", "USER_NOT_FOUND", null));
                continue;
            }
            String locale = resolveEmailLocale(user);
            try {
                emailService.sendBetaCampaignEmail(
                        user.getEmail(),
                        user.getDisplayName(),
                        CAMPAIGN_KEY,
                        locale);
                recordSent(userId, locale);
                sent++;
                results.add(resultRow(userId, "sent", null, locale));
            } catch (Exception e) {
                failed++;
                String err = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                log.warn("Failed tarantula public default email for user {}: {}", userId, err);
                results.add(resultRow(userId, "failed", err, locale));
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("campaignKey", CAMPAIGN_KEY);
        out.put("eligibleKeepers", keeperIds.size());
        out.put("sent", sent);
        out.put("skipped", skipped);
        out.put("failed", failed);
        out.put("results", results);
        return out;
    }

    public static String resolveEmailLocale(User user) {
        if (user.getPreferredLocale() != null && !user.getPreferredLocale().isBlank()) {
            return BetaMailBodies.normalizeLocale(SupportedLocales.normalize(user.getPreferredLocale()));
        }
        if (user.getBetaPreferredLocale() != null && !user.getBetaPreferredLocale().isBlank()) {
            return BetaMailBodies.normalizeLocale(user.getBetaPreferredLocale());
        }
        return "es";
    }

    private void recordSent(UUID userId, String locale) {
        BetaEmailSend row = new BetaEmailSend();
        row.setUserId(userId);
        row.setCampaignKey(CAMPAIGN_KEY);
        row.setLocale(locale);
        betaEmailSendRepository.save(row);
    }

    private static Map<String, Object> resultRow(UUID userId, String status, String reason, String locale) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("userId", userId);
        row.put("status", status);
        if (reason != null) {
            row.put("reason", reason);
        }
        if (locale != null) {
            row.put("locale", locale);
        }
        return row;
    }
}
