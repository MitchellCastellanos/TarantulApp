package com.tarantulapp.service;

import com.tarantulapp.dto.AuthResponse;
import com.tarantulapp.dto.LoginRequest;
import com.tarantulapp.dto.RegisterRequest;
import com.tarantulapp.entity.PasswordResetToken;
import com.tarantulapp.entity.User;
import com.tarantulapp.entity.UserPlan;
import com.tarantulapp.repository.PasswordResetTokenRepository;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.util.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final EmailService emailService;
    private final PlanAccessService planAccessService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil, PasswordResetTokenRepository resetTokenRepository,
                       EmailService emailService, PlanAccessService planAccessService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.resetTokenRepository = resetTokenRepository;
        this.emailService = emailService;
        this.planAccessService = planAccessService;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("El email ya está registrado");
        }
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setDisplayName(request.getDisplayName());
        user.setPlan(UserPlan.FREE);
        user.setTrialEndsAt(LocalDateTime.now().plusDays(7));
        userRepository.save(user);
        String token = jwtUtil.generateToken(user.getEmail());
        return buildAuthResponse(token, user);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Credenciales inválidas"));
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Credenciales inválidas");
        }
        if (user.getPlan() == null) {
            user.setPlan(UserPlan.FREE);
            userRepository.save(user);
        }
        String token = jwtUtil.generateToken(user.getEmail());
        return buildAuthResponse(token, user);
    }

    private AuthResponse buildAuthResponse(String token, User user) {
        AuthResponse r = new AuthResponse(token, user.getEmail(), user.getDisplayName(), user.getId(),
                user.getPlan() != null ? user.getPlan().name() : UserPlan.FREE.name());
        r.setTrialEndsAt(user.getTrialEndsAt());
        r.setReadOnly(planAccessService.isReadOnly(user));
        r.setInTrial(planAccessService.isTrialActive(user));
        r.setOverFreeLimit(planAccessService.isOverFreeTierLimit(user));
        r.setStrictReadOnly(planAccessService.isStrictReadOnly(user));
        return r;
    }

    @Transactional
    public void forgotPassword(String email) {
        // Always respond the same (don't reveal whether email exists)
        userRepository.findByEmail(email).ifPresent(user -> {
            resetTokenRepository.deleteByUserId(user.getId());

            byte[] bytes = new byte[48];
            new SecureRandom().nextBytes(bytes);
            String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

            PasswordResetToken prt = new PasswordResetToken();
            prt.setUserId(user.getId());
            prt.setToken(rawToken);
            prt.setExpiresAt(LocalDateTime.now().plusHours(1));
            resetTokenRepository.save(prt);

            emailService.sendPasswordReset(email, rawToken);
        });
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken prt = resetTokenRepository.findByTokenAndUsedFalse(token)
                .orElseThrow(() -> new IllegalArgumentException("Token inválido o expirado"));

        if (prt.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("El token ha expirado");
        }

        User user = userRepository.findById(prt.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        prt.setUsed(true);
        resetTokenRepository.save(prt);
    }

    @Transactional
    public void changePassword(UUID userId, String currentPassword, String newPassword) {
        if (newPassword == null || newPassword.length() < 6 || newPassword.length() > 100) {
            throw new IllegalArgumentException("PASSWORD_LENGTH");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("INVALID_CURRENT_PASSWORD");
        }
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("SAME_PASSWORD");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
}

