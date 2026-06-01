package com.tarantulapp.service;

import com.tarantulapp.dto.MeCapabilitiesDTO;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.PartnerProgramTier;
import com.tarantulapp.repository.OfficialVendorRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@Transactional
public class UserCapabilitiesService {

    private final UserRepository userRepository;
    private final AdminAccessService adminAccessService;
    private final OfficialVendorRepository officialVendorRepository;

    public UserCapabilitiesService(UserRepository userRepository,
                                   AdminAccessService adminAccessService,
                                   OfficialVendorRepository officialVendorRepository) {
        this.userRepository = userRepository;
        this.adminAccessService = adminAccessService;
        this.officialVendorRepository = officialVendorRepository;
    }

    @Transactional(readOnly = true)
    public MeCapabilitiesDTO getCapabilities(UUID userId) {
        User user = requireUser(userId);
        MeCapabilitiesDTO dto = new MeCapabilitiesDTO();
        dto.setCollection(true);
        dto.setMarketplace(true);
        dto.setPassportCreator(canCreatePassports(user));
        dto.setStudio(user.getStudioActivatedAt() != null);
        dto.setVerifiedBreeder(Boolean.TRUE.equals(user.getVerifiedBreeder()));
        dto.setVerifiedOrigin(VerifiedOriginService.isVerified(user));
        dto.setOfficialPartner(isOfficialPartner(user));
        dto.setBranding(BrandingService.canBrand(user, officialVendorRepository));
        dto.setPickupAuthorized(canUsePickupPoints(user));
        dto.setPhoneVerified(user.isPhoneVerified());
        dto.setBatchTermsAccepted(user.getBatchIssuerTermsAcceptedAt() != null);
        return dto;
    }

    /**
     * Batch / non-P2P label issuance requires a verified phone and accepted issuer terms.
     * Admins are exempt. Throws {@code PHONE_VERIFICATION_REQUIRED} / {@code BATCH_TERMS_REQUIRED}.
     */
    public void ensureBatchIssuerReady(UUID userId) {
        User user = requireUser(userId);
        if (Boolean.TRUE.equals(user.getIsAdmin()) || adminAccessService.shouldBootstrapAdmin(user)) {
            return;
        }
        if (!user.isPhoneVerified()) {
            throw new IllegalArgumentException("PHONE_VERIFICATION_REQUIRED");
        }
        if (user.getBatchIssuerTermsAcceptedAt() == null) {
            throw new IllegalArgumentException("BATCH_TERMS_REQUIRED");
        }
    }

    public MeCapabilitiesDTO acceptBatchTerms(UUID userId) {
        User user = requireUser(userId);
        if (user.getBatchIssuerTermsAcceptedAt() == null) {
            user.setBatchIssuerTermsAcceptedAt(Instant.now());
            userRepository.save(user);
        }
        return getCapabilities(userId);
    }

    public MeCapabilitiesDTO activateStudio(UUID userId) {
        User user = requireUser(userId);
        if (!canCreatePassports(user)) {
            throw new IllegalArgumentException("PASSPORT_CREATOR_REQUIRED");
        }
        if (user.getStudioActivatedAt() == null) {
            user.setStudioActivatedAt(Instant.now());
            userRepository.save(user);
        }
        return getCapabilities(userId);
    }

    public void setPassportCreatorEnabled(UUID userId, boolean enabled) {
        User user = requireUser(userId);
        user.setPassportCreatorEnabledAt(enabled ? Instant.now() : null);
        userRepository.save(user);
    }

    public boolean canCreatePassports(User user) {
        if (user == null) return false;
        if (Boolean.TRUE.equals(user.getIsAdmin()) || adminAccessService.shouldBootstrapAdmin(user)) {
            return true;
        }
        if (user.getPassportCreatorEnabledAt() != null) {
            return true;
        }
        return Boolean.TRUE.equals(user.getVerifiedBreeder());
    }

    public void ensurePassportCreator(UUID userId) {
        User user = requireUser(userId);
        if (!canCreatePassports(user)) {
            throw new IllegalArgumentException("PASSPORT_CREATOR_REQUIRED");
        }
    }

    public void ensureStudioAccess(UUID userId) {
        ensurePassportCreator(userId);
    }

    public boolean canUsePickupPoints(User user) {
        if (user == null) return false;
        if (Boolean.TRUE.equals(user.getIsAdmin()) || adminAccessService.shouldBootstrapAdmin(user)) {
            return true;
        }
        return user.getPickupAuthorizedAt() != null;
    }

    public void ensurePickupAuthorized(UUID userId) {
        User user = requireUser(userId);
        if (!canUsePickupPoints(user)) {
            throw new IllegalArgumentException("PICKUP_AUTHORIZATION_REQUIRED");
        }
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
    }

    private boolean isOfficialPartner(User user) {
        if (user == null || user.getPublicHandle() == null || user.getPublicHandle().isBlank()) {
            return false;
        }
        return officialVendorRepository.findBySlug(user.getPublicHandle().trim())
                .filter(v -> Boolean.TRUE.equals(v.getEnabled()))
                .map(vendor -> {
                    PartnerProgramTier tier = vendor.getPartnerProgramTier();
                    return tier != null && tier.isOfficialPartner();
                })
                .orElse(false);
    }
}
