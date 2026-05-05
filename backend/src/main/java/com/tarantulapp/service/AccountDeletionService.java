package com.tarantulapp.service;

import com.tarantulapp.entity.User;
import com.tarantulapp.repository.BetaApplicationRepository;
import com.tarantulapp.repository.SexIdCaseRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AccountDeletionService {

    private final UserRepository userRepository;
    private final AuthService authService;
    private final BillingService billingService;
    private final SexIdCaseRepository sexIdCaseRepository;
    private final BetaApplicationRepository betaApplicationRepository;

    public AccountDeletionService(UserRepository userRepository,
                                  AuthService authService,
                                  BillingService billingService,
                                  SexIdCaseRepository sexIdCaseRepository,
                                  BetaApplicationRepository betaApplicationRepository) {
        this.userRepository = userRepository;
        this.authService = authService;
        this.billingService = billingService;
        this.sexIdCaseRepository = sexIdCaseRepository;
        this.betaApplicationRepository = betaApplicationRepository;
    }

    /**
     * Permanently deletes the user and dependent rows. Requires password or Google ID token
     * (same email as the account). Cancels active Stripe subscriptions when configured.
     */
    @Transactional
    public void deleteMyAccount(UUID userId, String currentPassword, String googleIdToken) {
        authService.assertAccountDeletionReauthentication(userId, currentPassword, googleIdToken);
        billingService.cancelStripeSubscriptionsForUser(userId);
        // sex_id_cases.author_user_id does not ON DELETE CASCADE — delete before users row.
        sexIdCaseRepository.deleteByAuthorUserId(userId);
        betaApplicationRepository.clearApprovedUserId(userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        userRepository.delete(user);
    }
}
