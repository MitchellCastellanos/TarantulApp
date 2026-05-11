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

    /** Numeric OAuth client id from the same service-account JSON as {@code GOOGLE_CLIENT_EMAIL} / key (field {@code client_id}). */
    @Value("${GOOGLE_SERVICE_ACCOUNT_CLIENT_ID:}")
    private String serviceAccountClientId;

    /** GCP project id from the same JSON ({@code project_id}). */
    @Value("${GOOGLE_SERVICE_ACCOUNT_PROJECT_ID:}")
    private String serviceAccountProjectId;

    /** From the same JSON ({@code private_key_id}); optional but keeps the credential blob faithful. */
    @Value("${GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID:}")
    private String serviceAccountPrivateKeyId;

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
            if (isBlank(serviceAccountClientId)) {
                log.warn("GOOGLE_SERVICE_ACCOUNT_CLIENT_ID is empty — token exchange may return 401. "
                        + "Set it to the client_id from the same service-account JSON as GOOGLE_CLIENT_EMAIL.");
            }
            String pem = normalizePrivateKey(privateKeyPem);
            assertPrivateKeyLooksLikePkcs8Pem(pem);
            long pemLineCount = pem.lines().count();
            String pemFirstLine = pem.lines().findFirst().orElse("(empty)");
            log.info("Building Google Directory client: clientEmail={} pemLines={} pemHeader={}",
                    clientEmail.trim(), pemLineCount, pemFirstLine);
            GoogleCredentials base = GoogleCredentials.fromStream(new ByteArrayInputStream(buildServiceAccountJson(pem)))
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

    private byte[] buildServiceAccountJson(String normalizedPem) throws IOException {
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("type", "service_account");
        json.put("project_id", isBlank(serviceAccountProjectId) ? "unused-project" : serviceAccountProjectId.trim());
        json.put("private_key_id", isBlank(serviceAccountPrivateKeyId) ? "unused" : serviceAccountPrivateKeyId.trim());
        json.put("private_key", normalizedPem);
        json.put("client_email", clientEmail.trim());
        json.put("client_id", isBlank(serviceAccountClientId) ? "0" : serviceAccountClientId.trim());
        json.put("auth_uri", "https://accounts.google.com/o/oauth2/auth");
        json.put("token_uri", "https://oauth2.googleapis.com/token");
        return objectMapper.writeValueAsBytes(json);
    }

    /**
     * Railway / dotenv often mangle multiline PEM: outer quotes, UTF-8 BOM, or {@code \n} sent as literal two chars.
     * Google expects PKCS#8 PEM ({@code -----BEGIN PRIVATE KEY-----}) from the service-account JSON field {@code private_key}.
     *
     * <p>Operation order matters: {@code \n} sequences are expanded to real newlines <em>before</em> outer-quote
     * detection, because a trailing literal {@code \n} before the closing quote (e.g. {@code "..key..\n"}) would
     * otherwise mask the quote and leave it in the PEM, causing a 401 from Google's token endpoint.
     */
    static String normalizePrivateKey(String raw) {
        if (raw == null) {
            return "";
        }
        String s = raw;

        // Strip UTF-8 BOM
        if (s.startsWith("\uFEFF")) {
            s = s.substring(1);
        }

        // Collapse double-escaped sequences (\\n \u2192 \n) before converting to real newlines.
        boolean hadDoubleEscape = false;
        while (s.contains("\\\\n")) {
            s = s.replace("\\\\n", "\\n");
            hadDoubleEscape = true;
        }

        // Convert literal \n sequences (backslash + n) to real newlines.
        // Railway typically stores multi-line secrets as single-line values with literal \n.
        boolean hadLiteralNewline = false;
        if (s.contains("\\n")) {
            s = s.replace("\\n", "\n");
            hadLiteralNewline = true;
        }

        // Normalize CRLF \u2192 LF
        s = s.replace("\r\n", "\n").replace("\r", "\n");

        // Trim outer whitespace including any real newlines produced by the conversion above.
        // This must happen before quote detection so that a trailing newline cannot hide the closing quote.
        s = s.trim();

        // Strip surrounding quotes. Done AFTER \n expansion + trim so that a value like
        // "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
        // (literal \n before the closing quote) is handled correctly.
        boolean hadOuterQuotes = false;
        while (s.length() >= 2
                && ((s.startsWith("\"") && s.endsWith("\""))
                        || (s.startsWith("'") && s.endsWith("'")))) {
            s = s.substring(1, s.length() - 1).trim();
            hadOuterQuotes = true;
        }

        if (hadDoubleEscape || hadLiteralNewline || hadOuterQuotes) {
            log.warn("GOOGLE_PRIVATE_KEY normalization applied \u2014 doubleEscape={} literalNewline={} outerQuotes={}. "
                    + "Verify the key in Railway matches the service account email set in GOOGLE_CLIENT_EMAIL.",
                    hadDoubleEscape, hadLiteralNewline, hadOuterQuotes);
        }

        return s;
    }

    private static void assertPrivateKeyLooksLikePkcs8Pem(String pem) {
        if (pem == null || pem.isBlank()) {
            return;
        }
        if (pem.contains("BEGIN RSA PRIVATE KEY")) {
            throw new IllegalArgumentException(
                    "GOOGLE_PRIVATE_KEY must be PKCS#8 from the service account JSON (-----BEGIN PRIVATE KEY-----). "
                            + "Do not paste an RSA-only PEM or a different key file.");
        }
        if (!pem.contains("BEGIN PRIVATE KEY")) {
            throw new IllegalArgumentException(
                    "GOOGLE_PRIVATE_KEY must include a PKCS#8 PEM header (-----BEGIN PRIVATE KEY-----). "
                            + "Copy the private_key value from the downloaded service-account JSON.");
        }
        if (!pem.contains("END PRIVATE KEY")) {
            throw new IllegalArgumentException(
                    "GOOGLE_PRIVATE_KEY looks truncated (missing -----END PRIVATE KEY-----). "
                            + "Re-paste the full key; multiline secrets in Railway must include every line.");
        }
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
