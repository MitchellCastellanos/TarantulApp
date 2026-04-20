package com.tarantulapp.controller;

import com.tarantulapp.service.PushNotificationService;
import com.tarantulapp.util.SecurityHelper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/push")
public class PushController {

    private final PushNotificationService pushNotificationService;
    private final SecurityHelper securityHelper;

    public PushController(PushNotificationService pushNotificationService, SecurityHelper securityHelper) {
        this.pushNotificationService = pushNotificationService;
        this.securityHelper = securityHelper;
    }

    record DeviceTokenRequest(@NotBlank String token, @NotBlank String platform) {}
    record DeviceTokenDeleteRequest(@NotBlank String token) {}
    record SendTestRequest(@NotBlank String title, @NotBlank String body) {}

    @PostMapping("/device-token")
    public ResponseEntity<Map<String, String>> registerToken(@Valid @RequestBody DeviceTokenRequest req) {
        UUID userId = securityHelper.getCurrentUserId();
        pushNotificationService.registerDevice(userId, req.platform(), req.token());
        return ResponseEntity.ok(Map.of("message", "ok"));
    }

    @DeleteMapping("/device-token")
    public ResponseEntity<Void> unregisterToken(@Valid @RequestBody DeviceTokenDeleteRequest req) {
        UUID userId = securityHelper.getCurrentUserId();
        pushNotificationService.unregisterDevice(userId, req.token());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/test")
    public ResponseEntity<Map<String, Object>> sendTest(@Valid @RequestBody SendTestRequest req) {
        UUID userId = securityHelper.getCurrentUserId();
        int delivered = pushNotificationService.sendReminderPushToUser(userId, req.title(), req.body());
        return ResponseEntity.ok(Map.of("delivered", delivered));
    }
}
