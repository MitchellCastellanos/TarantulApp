package com.tarantulapp.security;

import io.sentry.Sentry;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Stamps every request with a correlation id (X-Request-Id).
 * <p>
 * Reads the inbound header if the caller already supplied one (common when requests come
 * through a load balancer or Cloudflare), otherwise mints a fresh UUID. The value is echoed
 * back on the response header and placed in the SLF4J MDC under {@code request_id} so the
 * JSON encoder emits it as a first-class field. Method and path are added for quick triage
 * without another filter round-trip.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

    public static final String HEADER_NAME = "X-Request-Id";
    public static final String MDC_REQUEST_ID = "request_id";
    public static final String MDC_METHOD = "http_method";
    public static final String MDC_PATH = "http_path";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String incoming = request.getHeader(HEADER_NAME);
        String requestId = isValid(incoming) ? incoming : UUID.randomUUID().toString();

        MDC.put(MDC_REQUEST_ID, requestId);
        MDC.put(MDC_METHOD, request.getMethod());
        MDC.put(MDC_PATH, safePath(request));
        Sentry.configureScope(scope -> scope.setTag("request_id", requestId));

        response.setHeader(HEADER_NAME, requestId);
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_REQUEST_ID);
            MDC.remove(MDC_METHOD);
            MDC.remove(MDC_PATH);
        }
    }

    private static boolean isValid(String value) {
        if (value == null) return false;
        String trimmed = value.trim();
        if (trimmed.isEmpty() || trimmed.length() > 128) return false;
        for (int i = 0; i < trimmed.length(); i++) {
            char c = trimmed.charAt(i);
            boolean ok = Character.isLetterOrDigit(c) || c == '-' || c == '_' || c == '.' || c == ':';
            if (!ok) return false;
        }
        return true;
    }

    private static String safePath(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri == null ? "" : uri;
    }
}
