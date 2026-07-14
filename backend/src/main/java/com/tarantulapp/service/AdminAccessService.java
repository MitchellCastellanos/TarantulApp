package com.tarantulapp.service;

import com.tarantulapp.entity.User;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Admin gating is now driven by users.is_admin (V65). APP_ADMIN_EMAILS remains as a
 * bootstrap mechanism: AuthService promotes a matching account to is_admin=true on first
 * authenticated login, which lets us seed admins via env without a DB write step.
 */
@Service
public class AdminAccessService {

    private final SecurityHelper securityHelper;
    private final UserRepository userRepository;
    private final Set<String> bootstrapAdminEmails;

    public AdminAccessService(SecurityHelper securityHelper,
                              UserRepository userRepository,
                              @Value("${app.admin.emails:}") String adminEmailsCsv) {
        this.securityHelper = securityHelper;
        this.userRepository = userRepository;
        this.bootstrapAdminEmails = Arrays.stream(adminEmailsCsv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());
    }

    public void assertCurrentUserIsAdmin() {
        String email = securityHelper.getCurrentUserEmail();
        if (!isCurrentUserAdmin(email)) {
            throw new AccessDeniedException("Acceso solo para administradores");
        }
    }

    public void assertCurrentUserCanUseMarketingTools() {
        String email = securityHelper.getCurrentUserEmail();
        if (!isCurrentUserAdmin(email) && !isCurrentUserMarketingOps(email)) {
            throw new AccessDeniedException("Acceso solo para admin/marketing");
        }
    }

    private boolean isCurrentUserAdmin(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        return userRepository.findByEmailIgnoreCase(email)
                .map(User::getIsAdmin)
                .filter(Boolean.TRUE::equals)
                .isPresent();
    }

    private boolean isCurrentUserMarketingOps(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        return userRepository.findByEmail(email)
                .map(User::getIsMarketingOps)
                .filter(Boolean.TRUE::equals)
                .isPresent();
    }

    /**
     * Bootstrap helper called from AuthService on login: returns true if the user should be
     * promoted to admin because their email is in the env-configured bootstrap list and they
     * are not yet flagged in DB.
     */
    public boolean shouldBootstrapAdmin(User user) {
        if (user == null || user.getEmail() == null) {
            return false;
        }
        if (Boolean.TRUE.equals(user.getIsAdmin())) {
            return false;
        }
        return bootstrapAdminEmails.contains(user.getEmail().trim().toLowerCase(Locale.ROOT));
    }

    /** Persist the admin flag for a freshly bootstrapped user. */
    public void promoteToAdmin(User user) {
        if (user == null) return;
        user.setIsAdmin(true);
        userRepository.save(user);
    }

    /**
     * @deprecated DB flag is the source of truth. Kept for AuthService.buildAuthResponse so the
     *             AuthResponse#admin flag still works while the bootstrap user logs in for the
     *             first time. New callers should query {@link User#getIsAdmin()} directly.
     */
    @Deprecated
    public boolean isAdminEmail(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        String norm = email.trim().toLowerCase(Locale.ROOT);
        if (bootstrapAdminEmails.contains(norm)) {
            return true;
        }
        return userRepository.findByEmailIgnoreCase(norm)
                .map(User::getIsAdmin)
                .filter(Boolean.TRUE::equals)
                .isPresent();
    }
}
