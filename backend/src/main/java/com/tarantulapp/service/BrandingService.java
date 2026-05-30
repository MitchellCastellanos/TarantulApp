package com.tarantulapp.service;

import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.util.FileStorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Brand logo management for non-individual accounts (Verified Origin breeders/stores/vendors/sellers
 * and verified breeders). Stores a full-color logo plus a monochrome variant used on QR labels.
 * Accounts upload their own; admins may upload on behalf of any account (mostly official partners).
 */
@Service
public class BrandingService {

    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    public BrandingService(UserRepository userRepository, FileStorageService fileStorageService) {
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
    }

    /** Whether the account is a non-individual eligible to brand its labels and storefront. */
    public static boolean canBrand(User user) {
        return VerifiedOriginService.isVerified(user) || Boolean.TRUE.equals(user.getVerifiedBreeder());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> myBranding(UUID userId) {
        return toMap(requireUser(userId));
    }

    @Transactional
    public Map<String, Object> uploadLogo(UUID userId, MultipartFile file, boolean byAdmin) throws IOException {
        User user = requireUser(userId);
        if (!byAdmin && !canBrand(user)) {
            throw new IllegalArgumentException("NOT_ELIGIBLE_FOR_BRANDING");
        }
        FileStorageService.LogoVariants variants = fileStorageService.saveLogoWithMonochrome(file, "logos");
        // Clean up the previous local files (Cloudinary URLs are left in place).
        deletePreviousAssets(user);
        user.setLogoUrl(variants.colorPath());
        user.setLogoBwUrl(variants.bwPath());
        user.setLogoUploadedAt(Instant.now());
        user.setLogoUploadedByAdmin(byAdmin);
        userRepository.save(user);
        return toMap(user);
    }

    @Transactional
    public Map<String, Object> updatePreferences(UUID userId, Boolean useBwOnLabels) {
        User user = requireUser(userId);
        if (useBwOnLabels != null) {
            user.setLogoUseBwOnLabels(useBwOnLabels);
        }
        userRepository.save(user);
        return toMap(user);
    }

    @Transactional
    public Map<String, Object> deleteLogo(UUID userId) {
        User user = requireUser(userId);
        deletePreviousAssets(user);
        user.setLogoUrl(null);
        user.setLogoBwUrl(null);
        user.setLogoUploadedAt(null);
        user.setLogoUploadedByAdmin(false);
        userRepository.save(user);
        return toMap(user);
    }

    private void deletePreviousAssets(User user) {
        if (user.getLogoUrl() != null) {
            fileStorageService.deleteFile(user.getLogoUrl());
        }
        if (user.getLogoBwUrl() != null && !user.getLogoBwUrl().equals(user.getLogoUrl())) {
            fileStorageService.deleteFile(user.getLogoBwUrl());
        }
    }

    private Map<String, Object> toMap(User user) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("canUploadLogo", canBrand(user));
        out.put("logoUrl", user.getLogoUrl());
        out.put("logoBwUrl", user.getLogoBwUrl());
        out.put("useBwOnLabels", user.isLogoUseBwOnLabels());
        out.put("uploadedAt", user.getLogoUploadedAt());
        out.put("uploadedByAdmin", user.isLogoUploadedByAdmin());
        return out;
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
    }
}
