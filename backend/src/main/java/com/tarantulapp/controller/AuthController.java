package com.tarantulapp.controller;

import com.tarantulapp.dto.AuthResponse;
import com.tarantulapp.dto.ChangePasswordRequest;
import com.tarantulapp.dto.LoginRequest;
import com.tarantulapp.dto.RegisterRequest;
import com.tarantulapp.service.AuthService;
import com.tarantulapp.util.SecurityHelper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final SecurityHelper securityHelper;

    public AuthController(AuthService authService, SecurityHelper securityHelper) {
        this.authService = authService;
        this.securityHelper = securityHelper;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    record ForgotRequest(@Email @NotBlank String email) {}
    record ResetRequest(@NotBlank String token, @NotBlank @Size(min = 6) String password) {}

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgot(@Valid @RequestBody ForgotRequest req) {
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
}
