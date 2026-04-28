package com.tarantulapp.controller;

import com.tarantulapp.entity.BetaApplication;
import com.tarantulapp.repository.BetaApplicationRepository;
import com.tarantulapp.service.EmailService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/public")
public class BetaApplicationController {

    private final BetaApplicationRepository betaApplicationRepository;
    private final EmailService emailService;

    public BetaApplicationController(BetaApplicationRepository betaApplicationRepository,
                                     EmailService emailService) {
        this.betaApplicationRepository = betaApplicationRepository;
        this.emailService = emailService;
    }

    record CreateBetaApplicationRequest(
            @NotBlank @Email String email,
            String name,
            String country,
            String experienceLevel,
            String devices,
            String notes
    ) {}

    @PostMapping("/beta-applications")
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody CreateBetaApplicationRequest req) {
        BetaApplication app = new BetaApplication();
        app.setEmail(trimTo(req.email(), 255));
        app.setName(trimTo(req.name(), 120));
        app.setCountry(trimTo(req.country(), 80));
        app.setExperienceLevel(trimTo(req.experienceLevel(), 40));
        app.setDevices(trimTo(req.devices(), 2000));
        app.setNotes(trimTo(req.notes(), 4000));
        BetaApplication saved = betaApplicationRepository.save(app);
        emailService.sendAdminBetaApplicationNotification(
                saved.getId(),
                saved.getEmail(),
                saved.getName(),
                saved.getCountry(),
                saved.getExperienceLevel()
        );
        return ResponseEntity.ok(Map.of("id", saved.getId(), "status", saved.getStatus()));
    }

    private String trimTo(String value, int max) {
        if (value == null) return null;
        String out = value.trim();
        if (out.isEmpty()) return null;
        return out.length() <= max ? out : out.substring(0, max);
    }
}
