package com.tarantulapp.security;

import com.tarantulapp.exception.RateLimitExceededException;
import com.tarantulapp.util.RequestPaths;
import com.tarantulapp.util.SecurityHelper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Rate-limits Spood: opening a thread (POST /open) and sending messages (POST .../messages).
 * Must run after {@link com.tarantulapp.config.JwtAuthFilter}.
 */
@Component
public class ChatMessageRateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(ChatMessageRateLimitFilter.class);
    private static final Duration WINDOW = Duration.ofMinutes(1);
    private static final String OPEN_THREAD_PATH = "/api/chat/threads/open";
    private static final Pattern CHAT_MESSAGE_POST = Pattern.compile(
            "^/api/chat/threads/[0-9a-fA-F\\-]{36}/messages$");

    private final SecurityHelper securityHelper;
    private final RateLimiter rateLimiter;
    private final int maxMessagesPerWindow;
    private final int maxOpenThreadPerWindow;

    public ChatMessageRateLimitFilter(
            SecurityHelper securityHelper,
            RateLimiter rateLimiter,
            @Value("${app.rate-limit.chat-message-per-minute:40}") int maxMessagesPerWindow,
            @Value("${app.rate-limit.chat-open-thread-per-minute:25}") int maxOpenThreadPerWindow) {
        this.securityHelper = securityHelper;
        this.rateLimiter = rateLimiter;
        this.maxMessagesPerWindow = Math.max(1, maxMessagesPerWindow);
        this.maxOpenThreadPerWindow = Math.max(1, maxOpenThreadPerWindow);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String path = RequestPaths.stripContextPath(request);
        return !OPEN_THREAD_PATH.equals(path) && !CHAT_MESSAGE_POST.matcher(path).matches();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = RequestPaths.stripContextPath(request);
        boolean isOpen = OPEN_THREAD_PATH.equals(path);
        int limit = isOpen ? maxOpenThreadPerWindow : maxMessagesPerWindow;
        String keyPrefix = isOpen ? "chatopen" : "chatmsg";

        Optional<UUID> uid = securityHelper.tryGetCurrentUserId();
        String ip = clientIp(request);
        String key = keyPrefix + "|" + uid.map(u -> "u|" + u).orElseGet(() -> "ip|" + ip);
        if (!rateLimiter.allow(key, limit, WINDOW)) {
            if (log.isWarnEnabled()) {
                log.warn("rate_limit_chat kind={} userId={} ip={} path={}",
                        keyPrefix,
                        uid.map(UUID::toString).orElse("-"),
                        ip,
                        request.getRequestURI());
            }
            throw new RateLimitExceededException(isOpen
                    ? "Demasiadas aperturas de chat. Intenta de nuevo en 1 minuto."
                    : "Demasiados mensajes. Intenta de nuevo en 1 minuto.");
        }
        filterChain.doFilter(request, response);
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return (comma >= 0 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        return request.getRemoteAddr();
    }
}
