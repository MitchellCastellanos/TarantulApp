package com.tarantulapp.service;

import com.tarantulapp.dto.AuthResponse;
import com.tarantulapp.dto.LoginRequest;
import com.tarantulapp.dto.RegisterRequest;
import com.tarantulapp.entity.BetaApplication;
import com.tarantulapp.entity.PasswordResetToken;
import com.tarantulapp.entity.User;
import com.tarantulapp.entity.UserPlan;
import com.tarantulapp.repository.BetaApplicationRepository;
import com.tarantulapp.repository.PasswordResetTokenRepository;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.util.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.orm.jpa.JpaSystemException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private static final char[] PASSWORD_ALPHABET =
            "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789".toCharArray();

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final EmailService emailService;
    private final PlanAccessService planAccessService;
    private final ReferralService referralService;
    private final PublicHandleService publicHandleService;
    private final AdminAccessService adminAccessService;
    private final BetaApplicationRepository betaApplicationRepository;
    private final RestClient restClient = RestClient.create();

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil, PasswordResetTokenRepository resetTokenRepository,
                       EmailService emailService, PlanAccessService planAccessService,
                       ReferralService referralService,
                       PublicHandleService publicHandleService,
                       AdminAccessService adminAccessService,
                       BetaApplicationRepository betaApplicationRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.resetTokenRepository = resetTokenRepository;
        this.emailService = emailService;
        this.planAccessService = planAccessService;
        this.referralService = referralService;
        this.publicHandleService = publicHandleService;
        this.adminAccessService = adminAccessService;
        this.betaApplicationRepository = betaApplicationRepository;
    }

    /** If an approved beta application exists for this email, mark the user as a beta tester. */
    private void linkApprovedBetaApplication(User user) {
        if (user == null || user.getEmail() == null) return;
        if (Boolean.TRUE.equals(user.getIsBetaTester())) return;
        betaApplicationRepository
                .findFirstByEmailIgnoreCaseAndStatusOrderByReviewedAtDesc(user.getEmail().trim(), "approved")
                .ifPresent(app -> {
                    user.setIsBetaTester(true);
                    if (user.getBetaCountry() == null || user.getBetaCountry().isBlank()) {
                        user.setBetaCountry(trimTo(app.getCountry(), 80));
                    }
                    if (user.getBetaExperienceLevel() == null || user.getBetaExperienceLevel().isBlank()) {
                        user.setBetaExperienceLevel(trimTo(app.getExperienceLevel(), 40));
                    }
                    userRepository.save(user);
                    if (app.getApprovedUserId() == null) {
                        app.setApprovedUserId(user.getId());
                        betaApplicationRepository.save(app);
                    }
                });
    }

    private static String trimTo(String value, int max) {
        if (value == null) return null;
        String out = value.trim();
        if (out.isEmpty()) return null;
        return out.length() <= max ? out : out.substring(0, max);
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("El email ya está registrado");
        }
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setDisplayName(request.getDisplayName());
        user.setPlan(UserPlan.FREE);
        user.setTrialEndsAt(LocalDateTime.now().plusDays(7));
        userRepository.save(user);
        publicHandleService.assignInitialPublicHandleIfMissing(user.getId());
        referralService.applyReferralForNewAccount(user.getId(), request.getReferralCode());
        referralService.ensureReferralCodeForUser(user.getId());
        User refreshed = userRepository.findById(user.getId()).orElseThrow();
        linkApprovedBetaApplication(refreshed);
        refreshed = userRepository.findById(refreshed.getId()).orElse(refreshed);
        emailService.sendWelcomeTrialStarted(refreshed.getEmail(), refreshed.getDisplayName(), refreshed.getTrialEndsAt());
        String token = jwtUtil.generateToken(refreshed.getEmail());
        return buildAuthResponse(token, refreshed);
    }

    public AuthResponse login(LoginRequest request) {
        User user = findByEmailWithOneRetry(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Credenciales inválidas"));
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Credenciales inválidas");
        }
        if (user.getPlan() == null) {
            user.setPlan(UserPlan.FREE);
            userRepository.save(user);
        }
        if (user.getPublicHandle() == null || user.getPublicHandle().isBlank()) {
            publicHandleService.assignInitialPublicHandleIfMissing(user.getId());
            user = userRepository.findById(user.getId()).orElse(user);
        }
        if (!Boolean.TRUE.equals(user.getIsBetaTester())) {
            linkApprovedBetaApplication(user);
            user = userRepository.findById(user.getId()).orElse(user);
        }
        String token = jwtUtil.generateToken(user.getEmail());
        return buildAuthResponse(token, user);
    }

    public AuthResponse googleLogin(String idToken, String referralCode) {
        Map<String, Object> tokenInfo;
        try {
            tokenInfo = restClient.get()
                    .uri("https://oauth2.googleapis.com/tokeninfo?id_token={idToken}", idToken)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
        } catch (RestClientException e) {
            throw new IllegalArgumentException("Google token inválido");
        }
        if (tokenInfo == null) {
            throw new IllegalArgumentException("Google token inválido");
        }
        Object emailRaw = tokenInfo.get("email");
        Object verifiedRaw = tokenInfo.get("email_verified");
        String email = emailRaw == null ? "" : String.valueOf(emailRaw).trim().toLowerCase();
        boolean verified = verifiedRaw != null && "true".equalsIgnoreCase(String.valueOf(verifiedRaw));
        if (email.isBlank() || !verified) {
            throw new IllegalArgumentException("Google token inválido");
        }

        User user = findByEmailWithOneRetry(email).orElseGet(() -> {
            User created = new User();
            created.setEmail(email);
            created.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            Object nameRaw = tokenInfo.get("name");
            String displayName = nameRaw == null ? null : String.valueOf(nameRaw).trim();
            created.setDisplayName(displayName == null || displayName.isBlank() ? null : displayName);
            created.setPlan(UserPlan.FREE);
            created.setTrialEndsAt(LocalDateTime.now().plusDays(7));
            User saved = userRepository.save(created);
            publicHandleService.assignInitialPublicHandleIfMissing(saved.getId());
            referralService.applyReferralForNewAccount(saved.getId(), referralCode);
            referralService.ensureReferralCodeForUser(saved.getId());
            User refreshed = userRepository.findById(saved.getId()).orElseThrow();
            emailService.sendWelcomeTrialStarted(refreshed.getEmail(), refreshed.getDisplayName(), refreshed.getTrialEndsAt());
            return refreshed;
        });

        if (user.getPublicHandle() == null || user.getPublicHandle().isBlank()) {
            publicHandleService.assignInitialPublicHandleIfMissing(user.getId());
            user = userRepository.findById(user.getId()).orElse(user);
        }
        if (!Boolean.TRUE.equals(user.getIsBetaTester())) {
            linkApprovedBetaApplication(user);
            user = userRepository.findById(user.getId()).orElse(user);
        }

        String token = jwtUtil.generateToken(user.getEmail());
        return buildAuthResponse(token, user);
    }

    private java.util.Optional<User> findByEmailWithOneRetry(String email) {
        try {
            return userRepository.findByEmail(email);
        } catch (RuntimeException ex) {
            if (!isTransientDbConnectivity(ex)) {
                throw ex;
            }
            log.warn("Transient DB error on findByEmail, retrying once for email={}", email);
            return userRepository.findByEmail(email);
        }
    }

    private boolean isTransientDbConnectivity(RuntimeException ex) {
        if (ex instanceof DataAccessResourceFailureException
                || ex instanceof JpaSystemException
                || ex instanceof QueryTimeoutException
                || ex instanceof CannotCreateTransactionException) {
            return true;
        }
        Throwable current = ex;
        while (current != null) {
            String msg = current.getMessage();
            if (msg != null && (msg.contains("MaxClientsInSessionMode")
                    || msg.contains("Connection is not available")
                    || msg.contains("canceling statement due to statement timeout"))) {
                return true;
            }
            if (current instanceof java.sql.SQLException sqlEx && "57014".equals(sqlEx.getSQLState())) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private AuthResponse buildAuthResponse(String token, User user) {
        AuthResponse r = new AuthResponse(token, user.getEmail(), user.getDisplayName(), user.getId(),
                user.getPlan() != null ? user.getPlan().name() : UserPlan.FREE.name());
        r.setTrialEndsAt(user.getTrialEndsAt());
        // Cupo/tarántulas: si la consulta falla (pool=1, datos viejos, plan inválido en fila), no tumbar login con 500.
        try {
            r.setReadOnly(planAccessService.isReadOnly(user));
            r.setInTrial(planAccessService.isTrialActive(user));
            r.setOverFreeLimit(planAccessService.isOverFreeTierLimit(user));
            r.setStrictReadOnly(planAccessService.isStrictReadOnly(user));
        } catch (Exception e) {
            log.warn("Login: no se pudieron calcular flags de plan para userId={}: {}", user.getId(), e.getMessage());
            r.setReadOnly(false);
            r.setInTrial(user.getTrialEndsAt() != null && LocalDateTime.now().isBefore(user.getTrialEndsAt()));
            r.setOverFreeLimit(false);
            r.setStrictReadOnly(false);
        }
        r.setPublicHandle(user.getPublicHandle());
        r.setBio(user.getBio());
        r.setLocation(user.getLocation());
        r.setFeaturedCollection(user.getFeaturedCollection());
        r.setContactWhatsapp(user.getContactWhatsapp());
        r.setContactInstagram(user.getContactInstagram());
        r.setProfileCountry(user.getProfileCountry());
        r.setProfileState(user.getProfileState());
        r.setProfileCity(user.getProfileCity());
        r.setQrPrintExports(user.getQrPrintExports());
        r.setProfilePhoto(user.getProfilePhoto());
        r.setCommunityProfileVisibility(user.getCommunityProfileVisibility());
        r.setAdmin(adminAccessService.isAdminEmail(user.getEmail()));
        r.setBetaTester(Boolean.TRUE.equals(user.getIsBetaTester()));
        return r;
    }

    @Transactional
    public void forgotPassword(String email) {
        // Always respond the same (don't reveal whether email exists)
        userRepository.findByEmail(email).ifPresent(user -> {
            resetTokenRepository.deleteByUserId(user.getId());

            byte[] bytes = new byte[48];
            new SecureRandom().nextBytes(bytes);
            String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

            PasswordResetToken prt = new PasswordResetToken();
            prt.setUserId(user.getId());
            prt.setToken(rawToken);
            prt.setExpiresAt(LocalDateTime.now().plusHours(1));
            resetTokenRepository.save(prt);

            emailService.sendPasswordReset(email, rawToken);
        });
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken prt = resetTokenRepository.findByTokenAndUsedFalse(token)
                .orElseThrow(() -> new IllegalArgumentException("Token inválido o expirado"));

        if (prt.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("El token ha expirado");
        }

        User user = userRepository.findById(prt.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        prt.setUsed(true);
        resetTokenRepository.save(prt);
    }

    @Transactional
    public void changePassword(UUID userId, String currentPassword, String newPassword) {
        if (newPassword == null || newPassword.length() < 6 || newPassword.length() > 100) {
            throw new IllegalArgumentException("PASSWORD_LENGTH");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("INVALID_CURRENT_PASSWORD");
        }
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("SAME_PASSWORD");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    /**
     * Admin: set a user's password (no current password). When {@code generate} is true, a random
     * password is created and returned in {@link AdminUserPasswordResult#plainPassword()}.
     */
    @Transactional
    public AdminUserPasswordResult adminSetPasswordByUserId(UUID userId, String newPassword, boolean generate) {
        String plain = generate ? randomPasswordChars(14) : newPassword;
        assertAdminPasswordLength(plain);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        user.setPasswordHash(passwordEncoder.encode(plain));
        userRepository.save(user);
        return new AdminUserPasswordResult(user, plain, false);
    }

    /**
     * Admin: find user by email or public handle (with or without leading {@code @}), set password,
     * mark as beta tester. If no user exists and {@code identifier} is an email, creates an account
     * (beta tester, free plan, trial) like register but without welcome email.
     */
    @Transactional
    public AdminUserPasswordResult adminProvisionBetaTester(String identifier, String newPassword, boolean generate,
                                                            String displayName) {
        String plain = generate ? randomPasswordChars(14) : newPassword;
        assertAdminPasswordLength(plain);
        Optional<User> existing = findUserByIdentifier(identifier);
        if (existing.isPresent()) {
            User user = existing.get();
            user.setPasswordHash(passwordEncoder.encode(plain));
            user.setIsBetaTester(true);
            if (displayName != null && !displayName.isBlank()
                    && (user.getDisplayName() == null || user.getDisplayName().isBlank())) {
                user.setDisplayName(displayName.trim());
            }
            userRepository.save(user);
            return new AdminUserPasswordResult(user, plain, false);
        }
        String email = identifierToEmailForNewUserOrNull(identifier);
        if (email == null) {
            throw new IllegalArgumentException("USER_NOT_FOUND_USE_EMAIL_TO_CREATE");
        }
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("EMAIL_ALREADY_REGISTERED");
        }
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(plain));
        user.setDisplayName(displayName == null || displayName.isBlank() ? null : displayName.trim());
        user.setPlan(UserPlan.FREE);
        user.setTrialEndsAt(LocalDateTime.now().plusDays(7));
        user.setIsBetaTester(true);
        userRepository.save(user);
        publicHandleService.assignInitialPublicHandleIfMissing(user.getId());
        referralService.applyReferralForNewAccount(user.getId(), null);
        referralService.ensureReferralCodeForUser(user.getId());
        User refreshed = userRepository.findById(user.getId()).orElse(user);
        return new AdminUserPasswordResult(refreshed, plain, true);
    }

    public record AdminUserPasswordResult(User user, String plainPassword, boolean created) {}

    private void assertAdminPasswordLength(String plain) {
        if (plain == null || plain.length() < 6 || plain.length() > 100) {
            throw new IllegalArgumentException("PASSWORD_LENGTH");
        }
    }

    private String randomPasswordChars(int length) {
        SecureRandom rnd = new SecureRandom();
        char[] out = new char[length];
        for (int i = 0; i < length; i++) {
            out[i] = PASSWORD_ALPHABET[rnd.nextInt(PASSWORD_ALPHABET.length)];
        }
        return new String(out);
    }

    private Optional<User> findUserByIdentifier(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        String s = raw.trim();
        if (s.contains("@")) {
            return userRepository.findByEmail(s.toLowerCase(Locale.ROOT));
        }
        String handle = s.startsWith("@") ? s.substring(1) : s;
        if (handle.isBlank()) {
            return Optional.empty();
        }
        return userRepository.findByPublicHandleIgnoreCase(handle);
    }

    private String identifierToEmailForNewUserOrNull(String raw) {
        if (raw == null || raw.isBlank() || !raw.contains("@")) {
            return null;
        }
        return raw.trim().toLowerCase(Locale.ROOT);
    }
}

