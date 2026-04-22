package com.tarantulapp.controller;

import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.service.BillingService;
import com.tarantulapp.util.SecurityHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BillingControllerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private SecurityHelper securityHelper;

    @Mock
    private BillingService billingService;

    private BillingController controller;

    @BeforeEach
    void setUp() {
        controller = new BillingController(userRepository, securityHelper, billingService);
    }

    @Test
    void createCheckoutSessionReturnsDisabledWhenStripeIsNotConfigured() {
        ReflectionTestUtils.setField(controller, "stripeSecretKey", "");

        ResponseEntity<Map<String, Object>> response = controller.createCheckoutSession(Map.of("interval", "year"));

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(false, response.getBody().get("checkoutEnabled"));
        assertEquals("", response.getBody().get("url"));
    }

    @Test
    void verifySessionRequiresSessionId() {
        ResponseEntity<Map<String, Object>> response = controller.verifySession(Map.of());

        assertEquals(400, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("Missing sessionId", response.getBody().get("error"));
    }

    @Test
    void webhookRejectsRequestsWhenSecretNotConfigured() {
        ReflectionTestUtils.setField(controller, "stripeWebhookSecret", "");

        ResponseEntity<String> response = controller.webhook("{}".getBytes(), "t=1,v1=sig");

        assertEquals(400, response.getStatusCode().value());
        assertEquals("Webhook secret not configured", response.getBody());
    }

    @Test
    void createPortalSessionReturnsBadRequestOnDomainValidationErrors() {
        when(securityHelper.getCurrentUserId()).thenReturn(java.util.UUID.randomUUID());
        when(billingService.createPortalSession(org.mockito.ArgumentMatchers.any()))
                .thenThrow(new IllegalArgumentException("NO_STRIPE_CUSTOMER"));

        ResponseEntity<Map<String, Object>> response = controller.createPortalSession();

        assertEquals(400, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("NO_STRIPE_CUSTOMER", response.getBody().get("error"));
        verify(billingService).createPortalSession(org.mockito.ArgumentMatchers.any());
    }
}
