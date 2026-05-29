package com.tarantulapp.service;

import com.tarantulapp.entity.User;
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

@ExtendWith(MockitoExtension.class)
class UserCapabilitiesServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private AdminAccessService adminAccessService;

    private UserCapabilitiesService service;

    @BeforeEach
    void setUp() {
        service = new UserCapabilitiesService(userRepository, adminAccessService);
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
}
