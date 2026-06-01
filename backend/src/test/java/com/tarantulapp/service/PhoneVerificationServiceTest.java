package com.tarantulapp.service;

import com.tarantulapp.entity.User;
import com.tarantulapp.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PhoneVerificationServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private TwilioVerifyService twilioVerifyService;

    private PhoneVerificationService service;
    private UUID userId;
    private User user;

    @BeforeEach
    void setUp() {
        service = new PhoneVerificationService(userRepository, twilioVerifyService);
        userId = UUID.randomUUID();
        user = new User();
        user.setId(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    }

    @Test
    void startRejectsNonE164() {
        assertThrows(IllegalArgumentException.class, () -> service.start(userId, "555-1234"));
        verify(twilioVerifyService, never()).startVerification(anyString());
    }

    @Test
    void startSendsCodeAndRecordsAttempt() {
        Map<String, Object> out = service.start(userId, "+1 (415) 555-2671");

        verify(twilioVerifyService).startVerification("+14155552671");
        assertEquals("+14155552671", user.getPhoneE164());
        assertEquals(Integer.valueOf(1), user.getPhoneVerifyAttempts());
        assertFalse(user.isPhoneVerified());
        assertEquals(Boolean.TRUE, out.get("sent"));
        verify(userRepository).save(user);
    }

    @Test
    void startThrottlesRapidResend() {
        user.setPhoneE164("+14155552671");
        user.setPhoneVerifyLastSentAt(Instant.now().minusSeconds(5));
        user.setPhoneVerifyAttempts(1);

        assertThrows(IllegalArgumentException.class, () -> service.start(userId, "+14155552671"));
        verify(twilioVerifyService, never()).startVerification(anyString());
    }

    @Test
    void checkApprovesAndMarksVerified() {
        user.setPhoneE164("+14155552671");
        when(twilioVerifyService.checkCode(eq("+14155552671"), eq("123456"))).thenReturn(true);

        Map<String, Object> out = service.check(userId, "123456");

        assertTrue(user.isPhoneVerified());
        assertEquals(Boolean.TRUE, out.get("verified"));
        verify(userRepository).save(user);
    }

    @Test
    void checkRejectsBadCode() {
        user.setPhoneE164("+14155552671");
        when(twilioVerifyService.checkCode(eq("+14155552671"), eq("000000"))).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> service.check(userId, "000000"));
        assertFalse(user.isPhoneVerified());
        verify(userRepository, never()).save(any());
    }

    @Test
    void checkRequiresPhoneSet() {
        assertThrows(IllegalArgumentException.class, () -> service.check(userId, "123456"));
    }
}
