package com.tarantulapp.service;

import com.tarantulapp.util.SecurityHelper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AdminAccessService {

    private final SecurityHelper securityHelper;
    private final Set<String> adminEmails;

    public AdminAccessService(SecurityHelper securityHelper,
                              @Value("${app.admin.emails:}") String adminEmailsCsv) {
        this.securityHelper = securityHelper;
        this.adminEmails = Arrays.stream(adminEmailsCsv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());
    }

    public void assertCurrentUserIsAdmin() {
        String email = securityHelper.getCurrentUserEmail();
        String normalized = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        if (!adminEmails.contains(normalized)) {
            throw new AccessDeniedException("Acceso solo para administradores");
        }
    }
}
