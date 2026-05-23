package com.tarantulapp.util;

import com.cloudinary.Cloudinary;
import com.cloudinary.Transformation;
import com.cloudinary.utils.ObjectUtils;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Image storage with hard-coded validation. Inputs come from anonymous-ish marketplace uploads,
 * so we never trust the client-reported Content-Type or filename: extension is derived from a
 * magic-byte sniff (jpeg / png / webp), and the stored filename is a UUID — no path traversal,
 * no preserved attacker-controlled name.
 */
@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    private static final long MIN_BYTES = 1024;             // 1 KB — drop empty/garbage uploads
    private static final long MAX_BYTES = 10L * 1024 * 1024; // 10 MB — matches multipart limit for images
    private static final long MAX_VIDEO_BYTES = 35L * 1024 * 1024; // community post videos
    private static final Set<String> ALLOWED_MIME = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Set<String> ALLOWED_VIDEO_MIME = Set.of("video/mp4", "video/webm");

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String apiKey;

    @Value("${cloudinary.api-secret:}")
    private String apiSecret;

    @Value("${app.environment:development}")
    private String environment;

    private Cloudinary cloudinary;

    @PostConstruct
    public void init() {
        boolean isProd = environment != null
                && (environment.equalsIgnoreCase("production") || environment.equalsIgnoreCase("prod"));
        if (isProd && !isCloudinaryConfigured()) {
            // Filesystem fallback doesn't survive multi-replica deploys; refuse to start so we
            // notice in deploy logs instead of silently writing to ephemeral container disk.
            throw new IllegalStateException(
                    "Cloudinary credentials are required in production: set CLOUDINARY_CLOUD_NAME, "
                            + "CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in the host environment.");
        }
        if (isCloudinaryConfigured()) {
            cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", cloudName,
                    "api_key", apiKey,
                    "api_secret", apiSecret,
                    "secure", true
            ));
            log.info("FileStorage: Cloudinary configured (cloud={})", cloudName);
        } else {
            log.warn("FileStorage: Cloudinary NOT configured — using local filesystem at {} (single-replica only)", uploadDir);
        }
    }

    private boolean isCloudinaryConfigured() {
        return cloudName != null && !cloudName.isBlank()
                && apiKey != null && !apiKey.isBlank()
                && apiSecret != null && !apiSecret.isBlank();
    }

    public String saveFile(MultipartFile file, String subfolder) throws IOException {
        DetectedImage img = validateImageOrThrow(file);
        if (isCloudinaryConfigured()) {
            return uploadToCloudinary(file, subfolder, "image");
        }
        return saveToLocal(file, subfolder, img.extension);
    }

    /** Community post videos (mp4/webm magic-byte sniff). */
    public String saveVideoFile(MultipartFile file, String subfolder) throws IOException {
        DetectedVideo vid = validateVideoOrThrow(file);
        if (isCloudinaryConfigured()) {
            return uploadToCloudinary(file, subfolder, "video");
        }
        return saveToLocal(file, subfolder, vid.extension);
    }

    @SuppressWarnings("unchecked")
    private String uploadToCloudinary(MultipartFile file, String subfolder, String resourceType) throws IOException {
        // NOTE: Cloudinary's Java SDK requires a Transformation object (or a pre-formatted
        // string like "q_auto,f_auto,w_1600,c_limit") here — passing a raw Map serializes to
        // Java's default `{key=value}` format and the server returns "Invalid transformation
        // component".
        Map<String, Object> params = ObjectUtils.asMap(
                "folder", "tarantulapp/" + sanitizeSubfolder(subfolder),
                "resource_type", resourceType
        );
        if ("image".equals(resourceType)) {
            params.put("transformation", new Transformation()
                    .quality("auto")
                    .fetchFormat("auto")
                    .width(1600)
                    .crop("limit"));
        }
        Map<String, Object> result = cloudinary.uploader().upload(file.getBytes(), params);
        return (String) result.get("secure_url");
    }

    private String saveToLocal(MultipartFile file, String subfolder, String safeExtension) throws IOException {
        String safeSub = sanitizeSubfolder(subfolder);
        String filename = UUID.randomUUID() + safeExtension;
        Path baseDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path targetDir = baseDir.resolve(safeSub).normalize();
        // Belt-and-braces: refuse if normalization escapes the base (defensive even though safeSub
        // is already sanitized; protects against future callers passing absolute paths).
        if (!targetDir.startsWith(baseDir)) {
            throw new IOException("Invalid subfolder path");
        }
        Files.createDirectories(targetDir);
        Files.copy(file.getInputStream(), targetDir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        return safeSub + "/" + filename;
    }

    public void deleteFile(String path) {
        if (path == null) return;
        if (isCloudinaryConfigured() && path.startsWith("http")) {
            // Cloudinary deletion is optional — skipped for simplicity
            return;
        }
        try {
            Path baseDir = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path target = baseDir.resolve(path).normalize();
            if (target.startsWith(baseDir)) {
                Files.deleteIfExists(target);
            }
        } catch (IOException ignored) {
        }
    }

    // ── Validation helpers ──────────────────────────────────────────────────

    private record DetectedImage(String mime, String extension) {}

    private record DetectedVideo(String mime, String extension) {}

    private DetectedImage validateImageOrThrow(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("UPLOAD_EMPTY");
        }
        long size = file.getSize();
        if (size < MIN_BYTES) {
            throw new IllegalArgumentException("UPLOAD_TOO_SMALL");
        }
        if (size > MAX_BYTES) {
            throw new IllegalArgumentException("UPLOAD_TOO_LARGE");
        }
        // Read first 16 bytes (covers JPEG/PNG/WEBP magic + RIFF/WEBP container header).
        byte[] head = new byte[16];
        try (var in = file.getInputStream()) {
            int read = in.readNBytes(head, 0, head.length);
            if (read < 12) {
                throw new IllegalArgumentException("UPLOAD_INVALID_FORMAT");
            }
        }
        String mime = sniffMime(head);
        if (mime == null || !ALLOWED_MIME.contains(mime)) {
            log.warn("Rejected upload: unsupported magic bytes (size={}, declaredType={})",
                    size, file.getContentType());
            throw new IllegalArgumentException("UPLOAD_UNSUPPORTED_TYPE");
        }
        return new DetectedImage(mime, extensionFor(mime));
    }

    private DetectedVideo validateVideoOrThrow(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("UPLOAD_EMPTY");
        }
        long size = file.getSize();
        if (size < MIN_BYTES) {
            throw new IllegalArgumentException("UPLOAD_TOO_SMALL");
        }
        if (size > MAX_VIDEO_BYTES) {
            throw new IllegalArgumentException("UPLOAD_TOO_LARGE");
        }
        byte[] head = new byte[16];
        try (var in = file.getInputStream()) {
            int read = in.readNBytes(head, 0, head.length);
            if (read < 12) {
                throw new IllegalArgumentException("UPLOAD_INVALID_FORMAT");
            }
        }
        String mime = sniffVideoMime(head);
        if (mime == null || !ALLOWED_VIDEO_MIME.contains(mime)) {
            log.warn("Rejected video upload: unsupported magic bytes (size={}, declaredType={})",
                    size, file.getContentType());
            throw new IllegalArgumentException("UPLOAD_UNSUPPORTED_TYPE");
        }
        return new DetectedVideo(mime, extensionForVideo(mime));
    }

    /** Returns canonical mime by inspecting magic bytes; null when unrecognized. */
    private static String sniffMime(byte[] h) {
        // JPEG: FF D8 FF
        if ((h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if ((h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G'
                && (h[4] & 0xFF) == 0x0D && (h[5] & 0xFF) == 0x0A
                && (h[6] & 0xFF) == 0x1A && (h[7] & 0xFF) == 0x0A) {
            return "image/png";
        }
        // WEBP: "RIFF" .... "WEBP"
        if (h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') {
            return "image/webp";
        }
        return null;
    }

    private static String sniffVideoMime(byte[] h) {
        if ((h[0] & 0xFF) == 0x1A && h[1] == 0x45 && (h[2] & 0xFF) == 0xDF && (h[3] & 0xFF) == 0xA3) {
            return "video/webm";
        }
        if (h.length >= 8 && h[4] == 'f' && h[5] == 't' && h[6] == 'y' && h[7] == 'p') {
            return "video/mp4";
        }
        return null;
    }

    private static String extensionFor(String mime) {
        return switch (mime) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> "";
        };
    }

    private static String extensionForVideo(String mime) {
        return switch (mime) {
            case "video/mp4" -> ".mp4";
            case "video/webm" -> ".webm";
            default -> "";
        };
    }

    /**
     * Sanitize a slash-delimited subfolder path: each segment is reduced to [a-z0-9_-]+ and
     * empty segments are dropped. Defends against path traversal ("..", absolute paths) without
     * breaking existing callers that pass "tarantulas/{uuid}" or "listings/{userId}".
     */
    private static String sanitizeSubfolder(String subfolder) {
        if (subfolder == null || subfolder.isBlank()) {
            return "misc";
        }
        String[] parts = subfolder.trim().toLowerCase().split("/");
        StringBuilder out = new StringBuilder();
        for (String raw : parts) {
            String seg = raw.replaceAll("[^a-z0-9_-]", "");
            if (seg.isEmpty()) continue;
            if (out.length() > 0) out.append('/');
            out.append(seg);
        }
        return out.length() == 0 ? "misc" : out.toString();
    }
}
