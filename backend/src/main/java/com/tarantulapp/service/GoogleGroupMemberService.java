package com.tarantulapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.directory.Directory;
import com.google.api.services.directory.model.Member;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Adds an email to a Google Group via Admin SDK Directory API (domain-wide delegated service account).
 */
@Service
public class GoogleGroupMemberService {

    private static final Logger log = LoggerFactory.getLogger(GoogleGroupMemberService.class);

    /** Admin SDK Directory API — group members (must match domain-wide delegation in Workspace). */
    public static final String GROUP_MEMBER_SCOPE = "https://www.googleapis.com/auth/admin.directory.group.member";

    @Value("${GOOGLE_CLIENT_EMAIL:}")
    private String clientEmail;

    @Value("${GOOGLE_PRIVATE_KEY:}")
    private String privateKeyPem;

    @Value("${GOOGLE_ADMIN_IMPERSONATE_EMAIL:}")
    private String impersonateEmail;

    @Value("${GOOGLE_TESTERS_GROUP_EMAIL:}")
    private String testersGroupEmail;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private volatile Directory directory;

    public boolean isConfigured() {
        return !isBlank(clientEmail)
                && !isBlank(privateKeyPem)
                && !isBlank(impersonateEmail)
                && !isBlank(testersGroupEmail);
    }

    /**
     * Inserts {@code email} into {@link #GOOGLE_TESTERS_GROUP_EMAIL}. Idempotent: existing members do not throw.
     */
    public void addGoogleGroupMember(String email) throws IOException, GeneralSecurityException {
        if (!isConfigured()) {
            throw new IllegalStateException("GOOGLE_GROUP_NOT_CONFIGURED");
        }
        String normalizedEmail = normalizeEmail(email);
        Directory api = getOrCreateDirectory();
        Member body = new Member();
        body.setEmail(normalizedEmail);
        body.setRole("MEMBER");
        try {
            api.members().insert(testersGroupEmail.trim(), body).execute();
            log.info("Added member to Google testers group email={} group={}", normalizedEmail, testersGroupEmail);
        } catch (GoogleJsonResponseException e) {
            if (isMemberAlreadyExists(e)) {
                log.info("Google testers group already contains email={} group={}", normalizedEmail, testersGroupEmail);
                return;
            }
            throw e;
        }
    }

    private static boolean isMemberAlreadyExists(GoogleJsonResponseException e) {
        int code = e.getStatusCode();
        if (code == 409) {
            return true;
        }
        String msg = e.getMessage();
        if (msg != null) {
            String lower = msg.toLowerCase(Locale.ROOT);
            if (lower.contains("already exists") || lower.contains("duplicate")) {
                return true;
            }
        }
        return false;
    }

    private Directory getOrCreateDirectory() throws IOException, GeneralSecurityException {
        Directory cached = directory;
        if (cached != null) {
            return cached;
        }
        synchronized (this) {
            if (directory != null) {
                return directory;
            }
            GoogleCredentials base = GoogleCredentials.fromStream(new ByteArrayInputStream(buildServiceAccountJson()))
                    .createScoped(Collections.singleton(GROUP_MEMBER_SCOPE));
            GoogleCredentials delegated = base.createDelegated(impersonateEmail.trim());
            directory = new Directory.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    GsonFactory.getDefaultInstance(),
                    new HttpCredentialsAdapter(delegated))
                    .setApplicationName("TarantulApp Backend")
                    .build();
            return directory;
        }
    }

    private byte[] buildServiceAccountJson() throws IOException {
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("type", "service_account");
        json.put("project_id", "tarantulapp-google-directory");
        json.put("private_key_id", "unused");
        json.put("private_key", normalizePrivateKey(privateKeyPem));
        json.put("client_email", clientEmail.trim());
        json.put("client_id", "0");
        json.put("auth_uri", "https://accounts.google.com/o/oauth2/auth");
        json.put("token_uri", "https://oauth2.googleapis.com/token");
        return objectMapper.writeValueAsBytes(json);
    }

    static String normalizePrivateKey(String raw) {
        if (raw == null) {
            return "";
        }
        String s = raw.trim();
        if (s.contains("\\n")) {
            s = s.replace("\\n", "\n");
        }
        return s;
    }

    private static String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("EMAIL_REQUIRED");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
