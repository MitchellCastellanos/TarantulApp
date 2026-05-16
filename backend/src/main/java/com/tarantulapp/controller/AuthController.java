package com.tarantulapp.controller;

import com.tarantulapp.dto.AuthResponse;
import com.tarantulapp.dto.AuthRegistrationPolicyResponse;
import com.tarantulapp.dto.ChangePasswordRequest;
import com.tarantulapp.dto.LoginRequest;
import com.tarantulapp.dto.RegisterRequest;
import com.tarantulapp.entity.User;
import com.tarantulapp.service.AccountDeletionService;
import com.tarantulapp.service.AuthService;
import com.tarantulapp.service.CaptchaService;
import com.tarantulapp.service.TokenBlacklistService;
import com.tarantulapp.service.VendorInviteService;
import com.tarantulapp.util.SecurityHelper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AccountDeletionService accountDeletionService;
    private final SecurityHelper securityHelper;
    private final CaptchaService captchaService;
    private final TokenBlacklistService tokenBlacklistService;
    private final VendorInviteService vendorInviteService;

    public AuthController(AuthService authService,
                          AccountDeletionService accountDeletionService,
                          SecurityHelper securityHelper,
                          CaptchaService captchaService,
                          TokenBlacklistService tokenBlacklistService,
                          VendorInviteService vendorInviteService) {
        this.authService = authService;
        this.accountDeletionService = accountDeletionService;
        this.securityHelper = securityHelper;
        this.captchaService = captchaService;
        this.tokenBlacklistService = tokenBlacklistService;
        this.vendorInviteService = vendorInviteService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        captchaService.verifyOrThrow(request.getCaptchaToken(), clientIp(httpRequest), "register");
        return ResponseEntity.ok(authService.register(request, httpRequest.getHeader("Accept-Language")));
    }

    @GetMapping("/registration-policy")
    public ResponseEntity<AuthRegistrationPolicyResponse> registrationPolicy() {
        var mode = authService.getRegistrationMode();
        return ResponseEntity.ok(new AuthRegistrationPolicyResponse(mode.wireName(), mode.allowsSelfServeRegistration()));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.login(request, httpRequest.getHeader("Accept-Language")));
    }

    record GoogleOAuthRequest(@NotBlank String idToken, String referralCode) {}

    @PostMapping("/oauth/google")
    public ResponseEntity<AuthResponse> oauthGoogle(@Valid @RequestBody GoogleOAuthRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.googleLogin(request.idToken(), request.referralCode(), httpRequest.getHeader("Accept-Language")));
    }

    record ForgotRequest(@Email @NotBlank String email, @Size(max = 4096) String captchaToken) {}
    record ResetRequest(@NotBlank String token, @NotBlank @Size(min = 6) String password) {}

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgot(@Valid @RequestBody ForgotRequest req, HttpServletRequest httpRequest) {
        captchaService.verifyOrThrow(req.captchaToken(), clientIp(httpRequest), "forgot-password");
        authService.forgotPassword(req.email());
        return ResponseEntity.ok(Map.of("message", "Si el email existe, recibirás un enlace."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> reset(@Valid @RequestBody ResetRequest req) {
        authService.resetPassword(req.token(), req.password());
        return ResponseEntity.ok(Map.of("message", "Contraseña actualizada correctamente."));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        UUID userId = securityHelper.getCurrentUserId();
        authService.changePassword(userId, req.getCurrentPassword(), req.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "OK"));
    }

    record DeleteAccountRequest(String currentPassword, String googleIdToken) {}

    @PostMapping("/delete-account")
    public ResponseEntity<Map<String, String>> deleteAccount(@RequestBody(required = false) DeleteAccountRequest req) {
        UUID userId = securityHelper.getCurrentUserId();
        String pw = req != null ? req.currentPassword() : null;
        String google = req != null ? req.googleIdToken() : null;
        accountDeletionService.deleteMyAccount(userId, pw, google);
        return ResponseEntity.ok(Map.of("message", "ok"));
    }

    record BetaAgreementBody(Boolean accepted) {}

    record VendorInviteAcceptBody(@NotBlank String token) {}

    @GetMapping("/vendor-invite/status")
    public ResponseEntity<Map<String, Object>> vendorInviteStatus(
            @RequestParam(value = "token", required = false) String token) {
        return ResponseEntity.ok(vendorInviteService.publicTokenStatus(token));
    }

    @PostMapping("/vendor-invite/accept")
    public ResponseEntity<Map<String, Object>> vendorInviteAccept(@Valid @RequestBody VendorInviteAcceptBody body) {
        UUID uid = securityHelper.getCurrentUserId();
        UUID tok;
        try {
            tok = UUID.fromString(body.token().trim());
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("ok", false, "error", "INVALID_TOKEN"));
        }
        User u = vendorInviteService.accept(uid, tok);
        vendorInviteService.sendWelcomeAfterAccept(u);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ok", true);
        out.put("verifiedBreeder", true);
        out.put("nextPath", "/marketplace/sell");
        return ResponseEntity.ok(out);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest httpRequest) {
        String token = extractBearerToken(httpRequest.getHeader("Authorization"));
        if (token != null) {
            tokenBlacklistService.revoke(token);
        }
        return ResponseEntity.ok(Map.of("message", "ok"));
    }

    private static String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null) return null;
        String h = authorizationHeader.trim();
        if (h.length() < 8 || !h.regionMatches(true, 0, "Bearer", 0, 6) || h.charAt(6) != ' ') {
            return null;
        }
        String raw = h.substring(7).trim();
        return raw.isEmpty() ? null : raw;
    }

    @PostMapping("/beta-agreement")
    public ResponseEntity<AuthResponse> acceptBetaAgreement(@RequestBody(required = false) BetaAgreementBody body) {
        UUID userId = securityHelper.getCurrentUserId();
        boolean ok = body == null || body.accepted() == null || Boolean.TRUE.equals(body.accepted());
        if (!ok) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(authService.acceptBetaTesterAgreement(userId));
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
