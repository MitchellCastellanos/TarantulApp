package com.tarantulapp.util;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.Map;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String apiKey;

    @Value("${cloudinary.api-secret:}")
    private String apiSecret;

    private Cloudinary cloudinary;

    @PostConstruct
    public void init() {
        if (isCloudinaryConfigured()) {
            cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", cloudName,
                    "api_key", apiKey,
                    "api_secret", apiSecret,
                    "secure", true
            ));
        }
    }

    private boolean isCloudinaryConfigured() {
        return cloudName != null && !cloudName.isBlank()
                && apiKey != null && !apiKey.isBlank()
                && apiSecret != null && !apiSecret.isBlank();
    }

    public String saveFile(MultipartFile file, String subfolder) throws IOException {
        if (isCloudinaryConfigured()) {
            return uploadToCloudinary(file, subfolder);
        }
        return saveToLocal(file, subfolder);
    }

    @SuppressWarnings("unchecked")
    private String uploadToCloudinary(MultipartFile file, String subfolder) throws IOException {
        Map<String, Object> params = ObjectUtils.asMap(
                "folder", "tarantulapp/" + subfolder,
                "resource_type", "image"
        );
        Map<String, Object> result = cloudinary.uploader().upload(file.getBytes(), params);
        return (String) result.get("secure_url");
    }

    private String saveToLocal(MultipartFile file, String subfolder) throws IOException {
        String originalName = StringUtils.cleanPath(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
        String extension = "";
        int dotIndex = originalName.lastIndexOf('.');
        if (dotIndex >= 0) extension = originalName.substring(dotIndex);

        String filename = UUID.randomUUID() + extension;
        Path targetDir = Paths.get(uploadDir, subfolder);
        Files.createDirectories(targetDir);
        Files.copy(file.getInputStream(), targetDir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        return subfolder + "/" + filename;
    }

    public void deleteFile(String path) {
        if (path == null) return;
        if (isCloudinaryConfigured() && path.startsWith("http")) {
            // Cloudinary deletion is optional — skipped for simplicity
            return;
        }
        try {
            Files.deleteIfExists(Paths.get(uploadDir, path));
        } catch (IOException ignored) {
        }
    }
}
