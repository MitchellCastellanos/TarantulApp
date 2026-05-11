package com.tarantulapp.service;

import com.tarantulapp.entity.User;
import com.tarantulapp.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.UUID;

/**
 * Adds users to the Play testing Google Group (open/closed test track) and tracks sync status for retries.
 */
@Service
public class BetaTesterGoogleGroupSyncService {

    private static final Logger log = LoggerFactory.getLogger(BetaTesterGoogleGroupSyncService.class);

    private final UserRepository userRepository;
    private final GoogleGroupMemberService googleGroupMemberService;
    private final TransactionTemplate retryOneTx;
    private final BetaTesterGoogleGroupSyncService self;

    public BetaTesterGoogleGroupSyncService(UserRepository userRepository,
                                             GoogleGroupMemberService googleGroupMemberService,
                                             PlatformTransactionManager transactionManager,
                                             @Lazy BetaTesterGoogleGroupSyncService self) {
        this.userRepository = userRepository;
        this.googleGroupMemberService = googleGroupMemberService;
        this.self = self;
        TransactionTemplate tt = new TransactionTemplate(transactionManager);
        tt.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.retryOneTx = tt;
    }

    /**
     * Ensures the account email is a member of {@code GOOGLE_TESTERS_GROUP_EMAIL}. Call after signup or login
     * (and when toggling beta flags in admin). Never throws; failures are recorded as {@link GoogleGroupSyncStatus#FAILED}.
     */
    @Transactional
    public void ensureGoogleTestersGroupMember(UUID userId) {
        if (userId == null) {
            return;
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return;
        }
        if (GoogleGroupSyncStatus.SYNCED.equals(user.getGoogleGroupSyncStatus())) {
            return;
        }
        if (!googleGroupMemberService.isConfigured()) {
            log.warn("Google testers group sync skipped (configure GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, "
                    + "GOOGLE_ADMIN_IMPERSONATE_EMAIL, GOOGLE_TESTERS_GROUP_EMAIL) userId={}", userId);
            applyFailure(user, "GOOGLE_GROUP_NOT_CONFIGURED");
            return;
        }
        try {
            googleGroupMemberService.addGoogleGroupMember(user.getEmail());
            applySuccess(user);
        } catch (Exception e) {
            log.error("Google testers group sync failed userId={} email={}: {}",
                    userId, user.getEmail(), e.getMessage(), e);
            applyFailure(user, truncateError(e));
        }
    }

    /** Retries every user not marked {@link GoogleGroupSyncStatus#SYNCED}. */
    public SyncGoogleGroupBatchResult retryAllPending() {
        List<User> pending = userRepository.findUsersNeedingGoogleGroupSync();
        int synced = 0;
        int failed = 0;
        for (User u : pending) {
            retryOneTx.executeWithoutResult(st -> self.ensureGoogleTestersGroupMember(u.getId()));
            User refreshed = userRepository.findById(u.getId()).orElse(u);
            if (GoogleGroupSyncStatus.SYNCED.equals(refreshed.getGoogleGroupSyncStatus())) {
                synced++;
            } else {
                failed++;
            }
        }
        return new SyncGoogleGroupBatchResult(pending.size(), synced, failed);
    }

    private void applySuccess(User user) {
        user.setGoogleGroupSyncStatus(GoogleGroupSyncStatus.SYNCED);
        user.setGoogleGroupSyncLastError(null);
        userRepository.save(user);
    }

    private void applyFailure(User user, String message) {
        user.setGoogleGroupSyncStatus(GoogleGroupSyncStatus.FAILED);
        user.setGoogleGroupSyncLastError(message);
        userRepository.save(user);
    }

    private static String truncateError(Throwable e) {
        String msg = e.getMessage();
        if (msg == null || msg.isBlank()) {
            msg = e.getClass().getSimpleName();
        }
        return msg.length() <= 500 ? msg : msg.substring(0, 500);
    }

    public record SyncGoogleGroupBatchResult(int attempted, int synced, int failed) {}
}
