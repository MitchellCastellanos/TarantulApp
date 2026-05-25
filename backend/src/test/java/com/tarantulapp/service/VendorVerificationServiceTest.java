package com.tarantulapp.service;

import com.tarantulapp.entity.User;
import com.tarantulapp.entity.VendorVerificationSubmission;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.repository.VendorVerificationSubmissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VendorVerificationServiceTest {

    @Mock
    private VendorVerificationSubmissionRepository submissionRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private EmailService emailService;

    private VendorVerificationService service;
    private UUID userId;
    private User vendorUser;

    @BeforeEach
    void setUp() {
        service = new VendorVerificationService(submissionRepository, userRepository, emailService);
        userId = UUID.randomUUID();
        vendorUser = new User();
        vendorUser.setId(userId);
        vendorUser.setEmail("vendor@example.com");
        vendorUser.setDisplayName("Test Shop");
        vendorUser.setVerifiedBreeder(true);
        vendorUser.setPreferredLocale("en");
    }

    @Test
    void submitRequiresSelfieMedia() {
        assertThrows(IllegalArgumentException.class,
                () -> service.submit(userId, " ", "https://cdn.example.com/inv.mp4", null));
    }

    @Test
    void submitSendsEmailsAndPersistsPending() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(vendorUser));
        when(submissionRepository.findFirstByUserIdOrderByCreatedAtDesc(userId)).thenReturn(Optional.empty());
        when(submissionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.submit(userId, "https://cdn.example.com/selfie.mp4", "https://cdn.example.com/inv.mp4", null);

        verify(emailService).sendVendorVerificationSubmitted(eq("vendor@example.com"), eq("Test Shop"), eq("en"));
        verify(emailService).sendAdminVendorVerificationSubmitted(
                nullable(UUID.class), eq("vendor@example.com"), eq("Test Shop"));
        ArgumentCaptor<VendorVerificationSubmission> cap = ArgumentCaptor.forClass(VendorVerificationSubmission.class);
        verify(submissionRepository).save(cap.capture());
        assertEquals("pending", cap.getValue().getStatus());
    }

    @Test
    void adminApproveSetsStorefrontVerifiedAndEmails() {
        UUID submissionId = UUID.randomUUID();
        VendorVerificationSubmission sub = pendingSubmission();
        when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(sub));
        when(userRepository.findById(userId)).thenReturn(Optional.of(vendorUser));
        when(submissionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.adminReview(submissionId, "approved", null);

        ArgumentCaptor<User> userCap = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCap.capture());
        assertNotNull(userCap.getValue().getStorefrontVerifiedAt());
        verify(emailService).sendVendorVerificationApproved(eq("vendor@example.com"), eq("Test Shop"), eq("en"));
    }

    @Test
    void adminRejectEmailsWhenNotYetVerified() {
        UUID submissionId = UUID.randomUUID();
        when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(pendingSubmission()));
        when(userRepository.findById(userId)).thenReturn(Optional.of(vendorUser));
        when(submissionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.adminReview(submissionId, "rejected", "Need clearer inventory video");

        verify(emailService).sendVendorVerificationRejected(
                eq("vendor@example.com"), eq("Test Shop"), eq("en"), eq("Need clearer inventory video"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void adminRejectSkipsEmailWhenBadgeAlreadyGranted() {
        UUID submissionId = UUID.randomUUID();
        vendorUser.setStorefrontVerifiedAt(Instant.now());
        when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(pendingSubmission()));
        when(userRepository.findById(userId)).thenReturn(Optional.of(vendorUser));
        when(submissionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.adminReview(submissionId, "rejected", "ops note");

        verify(emailService, never()).sendVendorVerificationRejected(any(), any(), any(), any());
    }

    @Test
    void adminReviewUnknownSubmissionThrows() {
        UUID submissionId = UUID.randomUUID();
        when(submissionRepository.findById(submissionId)).thenReturn(Optional.empty());
        assertThrows(NotFoundException.class, () -> service.adminReview(submissionId, "approved", null));
    }

    private VendorVerificationSubmission pendingSubmission() {
        VendorVerificationSubmission sub = new VendorVerificationSubmission();
        sub.setUserId(userId);
        sub.setStatus("pending");
        return sub;
    }
}
