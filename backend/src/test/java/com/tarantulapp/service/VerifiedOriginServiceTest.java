package com.tarantulapp.service;

import com.tarantulapp.dto.PublicOriginDTO;
import com.tarantulapp.entity.User;
import com.tarantulapp.entity.VerifiedOriginKind;
import com.tarantulapp.repository.OriginVerificationSubmissionRepository;
import com.tarantulapp.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VerifiedOriginServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private OriginVerificationSubmissionRepository submissionRepository;

    private VerifiedOriginService service;
    private UUID userId;

    @BeforeEach
    void setUp() {
        service = new VerifiedOriginService(userRepository, submissionRepository);
        userId = UUID.randomUUID();
    }

    @Test
    void resolvePublicOriginWhenVerified() {
        User user = new User();
        user.setVerifiedOriginAt(Instant.now());
        user.setVerifiedOriginKind("BREEDER");
        user.setStorefrontName("Monarch Reptiles");

        PublicOriginDTO dto = service.resolvePublicOrigin(user);

        assertNotNull(dto);
        assertTrue(dto.isVerified());
        assertEquals("BREEDER", dto.getKind());
        assertEquals("Monarch Reptiles", dto.getDisplayName());
    }

    @Test
    void resolvePublicOriginNullWhenUnverified() {
        assertNull(service.resolvePublicOrigin(new User()));
    }

    @Test
    void grantVerifiedOriginPersistsFields() {
        User user = new User();
        user.setId(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        User saved = service.grantVerifiedOrigin(userId, VerifiedOriginKind.STORE);

        assertNotNull(saved.getVerifiedOriginAt());
        assertEquals("STORE", saved.getVerifiedOriginKind());
        verify(userRepository).save(user);
    }

    @Test
    void submitRequiresNote() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.submit(userId, "BREEDER", "  ", null));
        assertEquals("NOTE_REQUIRED", ex.getMessage());
    }
}
