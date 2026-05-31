package com.tarantulapp.service;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.PartnerProgramTier;
import com.tarantulapp.entity.User;
import com.tarantulapp.repository.OfficialVendorRepository;
import com.tarantulapp.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.anyString;

@ExtendWith(MockitoExtension.class)
class UserCapabilitiesServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private AdminAccessService adminAccessService;
    @Mock
    private OfficialVendorRepository officialVendorRepository;

    private UserCapabilitiesService service;

    @BeforeEach
    void setUp() {
        service = new UserCapabilitiesService(userRepository, adminAccessService, officialVendorRepository);
    }

    @Test
    void verifiedBreederCanCreatePassports() {
        User user = new User();
        user.setVerifiedBreeder(true);
        assertTrue(service.canCreatePassports(user));
    }

    @Test
    void passportCreatorFlagEnablesAccess() {
        User user = new User();
        user.setPassportCreatorEnabledAt(Instant.now());
        assertTrue(service.canCreatePassports(user));
    }

    @Test
    void regularKeeperCannotCreatePassports() {
        User user = new User();
        assertFalse(service.canCreatePassports(user));
    }

    @Test
    void pickupAuthorizationFlagEnablesPickupAccess() {
        User user = new User();
        user.setPickupAuthorizedAt(Instant.now());
        assertTrue(service.canUsePickupPoints(user));
    }

    @Test
    void regularKeeperCannotUsePickupPoints() {
        User user = new User();
        assertFalse(service.canUsePickupPoints(user));
    }

    @Test
    void activateStudioSetsFlag() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setPassportCreatorEnabledAt(Instant.now());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        var caps = service.activateStudio(userId);
        assertTrue(caps.isStudio());
    }

    @Test
    void officialPartnerWhenHandleMatchesEnabledVendor() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setPublicHandle("monarch-reptiles");
        OfficialVendor vendor = new OfficialVendor();
        vendor.setSlug("monarch-reptiles");
        vendor.setEnabled(true);
        vendor.setPartnerProgramTier(PartnerProgramTier.FOUNDING_PARTNER);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(officialVendorRepository.findBySlug("monarch-reptiles")).thenReturn(Optional.of(vendor));

        assertTrue(service.getCapabilities(userId).isOfficialPartner());
    }

    @Test
    void notOfficialPartnerWithoutMatchingVendor() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setPublicHandle("random-keeper");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(officialVendorRepository.findBySlug(anyString())).thenReturn(Optional.empty());

        assertFalse(service.getCapabilities(userId).isOfficialPartner());
    }
}
