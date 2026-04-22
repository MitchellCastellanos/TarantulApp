package com.tarantulapp.controller;

import com.tarantulapp.service.LaunchEventService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/public/launch-event")
public class PublicLaunchEventController {

    private final LaunchEventService launchEventService;

    public PublicLaunchEventController(LaunchEventService launchEventService) {
        this.launchEventService = launchEventService;
    }

    @GetMapping("/eligibility")
    public ResponseEntity<Map<String, Object>> eligibility(HttpServletRequest request) {
        return ResponseEntity.ok(launchEventService.checkQuebecEligibility(request));
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok(launchEventService.status());
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody LaunchEventRegistrationRequest req) {
        return ResponseEntity.ok(launchEventService.register(new LaunchEventService.LaunchRegistrationRequest(
                req.fullName(),
                req.email(),
                req.phone(),
                req.ownsTarantulas(),
                req.tarantulaCount(),
                req.willAttend(),
                req.bringCollectionInfo(),
                req.reminderOptIn(),
                req.newsletterOptIn(),
                req.language(),
                req.sourcePath()
        )));
    }

    @PostMapping("/notify-future")
    public ResponseEntity<Map<String, Object>> notifyFuture(@Valid @RequestBody FutureInterestRequest req) {
        return ResponseEntity.ok(launchEventService.submitFutureInterest(req.email(), req.language()));
    }

    record FutureInterestRequest(
            @NotBlank @Email String email,
            String language
    ) {}

    record LaunchEventRegistrationRequest(
            @NotBlank String fullName,
            @NotBlank @Email String email,
            @NotBlank String phone,
            Boolean ownsTarantulas,
            Integer tarantulaCount,
            Boolean willAttend,
            Boolean bringCollectionInfo,
            Boolean reminderOptIn,
            Boolean newsletterOptIn,
            String language,
            String sourcePath
    ) {}
}
