package com.tarantulapp.controller;

import com.tarantulapp.dto.AuthResponse;
import com.tarantulapp.dto.ChangePasswordRequest;
import com.tarantulapp.service.AuthService;
import com.tarantulapp.service.CaptchaService;
import com.tarantulapp.util.SecurityHelper;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @Mock
    private SecurityHelper securityHelper;

    @Mock
    private CaptchaService captchaService;

    private AuthController controller;

    @BeforeEach
    void setUp() {
        controller = new AuthController(authService, securityHelper, captchaService);
    }

    @Test
    void oauthGoogleDelegatesToService() {
        AuthController.GoogleOAuthRequest request = new AuthController.GoogleOAuthRequest("token-123", "REF123");
        AuthResponse response = new AuthResponse("jwt", "test@mail.com", "Test", UUID.randomUUID(), "FREE");
        when(authService.googleLogin("token-123", "REF123")).thenReturn(response);

        ResponseEntity<AuthResponse> result = controller.oauthGoogle(request);

        assertEquals(200, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertEquals("jwt", result.getBody().getToken());
        verify(authService).googleLogin("token-123", "REF123");
    }

    @Test
    void forgotPasswordReturnsNeutralSuccessMessage() {
        AuthController.ForgotRequest request = new AuthController.ForgotRequest("user@mail.com", "captcha-tok");
        HttpServletRequest httpRequest = new MockHttpServletRequest();

        ResponseEntity<Map<String, String>> result = controller.forgot(request, httpRequest);

        assertEquals(200, result.getStatusCode().value());
        assertNotNull(result.getBody());
        String message = result.getBody().get("message");
        assertNotNull(message);
        org.junit.jupiter.api.Assertions.assertTrue(message.startsWith("Si el email existe"));
        verify(captchaService).verifyOrThrow("captcha-tok", "127.0.0.1", "forgot-password");
        verify(authService).forgotPassword("user@mail.com");
    }

    @Test
    void changePasswordUsesAuthenticatedUser() {
        UUID userId = UUID.randomUUID();
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("old-pass");
        request.setNewPassword("new-pass");
        when(securityHelper.getCurrentUserId()).thenReturn(userId);

        ResponseEntity<Map<String, String>> result = controller.changePassword(request);

        assertEquals(200, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertEquals("OK", result.getBody().get("message"));
        verify(authService).changePassword(userId, "old-pass", "new-pass");
    }
}
