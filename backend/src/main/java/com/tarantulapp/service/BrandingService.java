package com.tarantulapp.service;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.User;
import com.tarantulapp.entity.PartnerProgramTier;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.OfficialVendorRepository;
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
    private final OfficialVendorRepository officialVendorRepository;
    private final FileStorageService fileStorageService;

    public BrandingService(UserRepository userRepository,
                           OfficialVendorRepository officialVendorRepository,
                           FileStorageService fileStorageService) {
        this.userRepository = userRepository;
        this.officialVendorRepository = officialVendorRepository;
        this.fileStorageService = fileStorageService;
    }

    /** Whether the account is a non-individual eligible to brand its labels and storefront. */
    public static boolean canBrand(User user) {
        return canBrand(user, null);
    }

    static boolean canBrand(User user, OfficialVendorRepository vendorRepository) {
        if (user == null) {
            return false;
        }
        if (VerifiedOriginService.isVerified(user)) {
            return true;
        }
        if (Boolean.TRUE.equals(user.getVerifiedBreeder())) {
            return true;
        }
        String storefrontName = user.getStorefrontName();
        if (storefrontName != null && !storefrontName.isBlank()) {
            return true;
        }
        if (vendorRepository == null || user.getPublicHandle() == null || user.getPublicHandle().isBlank()) {
            return false;
        }
        return vendorRepository.findBySlug(user.getPublicHandle().trim())
                .filter(v -> Boolean.TRUE.equals(v.getEnabled()))
                .map(v -> {
                    PartnerProgramTier tier = v.getPartnerProgramTier();
                    return tier != null && tier.isOfficialPartner();
                })
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> myBranding(UUID userId) {
        return toMap(requireUser(userId));
    }

    @Transactional
    public Map<String, Object> uploadLogo(UUID userId, MultipartFile file, boolean byAdmin) throws IOException {
        User user = requireUser(userId);
        if (!byAdmin && !canBrand(user, officialVendorRepository)) {
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
        out.put("canUploadLogo", canBrand(user, officialVendorRepository));
        String logoUrl = user.getLogoUrl();
        if (logoUrl == null || logoUrl.isBlank()) {
            OfficialVendor vendor = findOfficialPartnerVendor(user).orElse(null);
            if (vendor != null && vendor.getLogoUrl() != null && !vendor.getLogoUrl().isBlank()) {
                logoUrl = vendor.getLogoUrl();
            }
        }
        out.put("logoUrl", logoUrl);
        out.put("uploadedAt", user.getLogoUploadedAt());
        out.put("uploadedByAdmin", user.isLogoUploadedByAdmin());
        return out;
    }

    private java.util.Optional<OfficialVendor> findOfficialPartnerVendor(User user) {
        if (user == null || user.getPublicHandle() == null || user.getPublicHandle().isBlank()) {
            return java.util.Optional.empty();
        }
        return officialVendorRepository.findBySlug(user.getPublicHandle().trim())
                .filter(v -> Boolean.TRUE.equals(v.getEnabled()))
                .filter(v -> {
                    PartnerProgramTier tier = v.getPartnerProgramTier();
                    return tier != null && tier.isOfficialPartner();
                });
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
    }
}
