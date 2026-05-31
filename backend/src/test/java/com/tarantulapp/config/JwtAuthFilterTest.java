package com.tarantulapp.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtAuthFilterTest {

    private final TestableJwtAuthFilter filter = new TestableJwtAuthFilter();

    @Test
    void skipsPublicAuthEndpoints() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");

        assertTrue(filter.shouldNotFilterForTest(request));
    }

    @Test
    void filtersVendorInviteAcceptSoBearerTokenCanAuthenticate() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/vendor-invite/accept");
        request.addHeader("Authorization", "Bearer jwt-token");

        assertFalse(filter.shouldNotFilterForTest(request));
    }

    private static class TestableJwtAuthFilter extends JwtAuthFilter {
        TestableJwtAuthFilter() {
            super(null, null, null, null);
        }

        boolean shouldNotFilterForTest(MockHttpServletRequest request) {
            return shouldNotFilter(request);
        }
    }
}
