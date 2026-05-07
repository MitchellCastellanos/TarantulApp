package com.tarantulapp.controller;

import com.tarantulapp.service.ChatThreadPushDeliveryService;
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
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/push")
public class PushController {

    private static final Pattern UUID_RE = Pattern.compile(
            "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
            Pattern.CASE_INSENSITIVE);

    private final PushNotificationService pushNotificationService;
    private final ChatThreadPushDeliveryService chatThreadPushDeliveryService;
    private final SecurityHelper securityHelper;

    public PushController(PushNotificationService pushNotificationService,
                          ChatThreadPushDeliveryService chatThreadPushDeliveryService,
                          SecurityHelper securityHelper) {
        this.pushNotificationService = pushNotificationService;
        this.chatThreadPushDeliveryService = chatThreadPushDeliveryService;
        this.securityHelper = securityHelper;
    }

    record DeviceTokenRequest(@NotBlank String token, @NotBlank String platform) {}
    record DeviceTokenDeleteRequest(@NotBlank String token) {}
    record SendTestRequest(@NotBlank String title, @NotBlank String body) {}
    record DeliveryAckRequest(@NotBlank String pushDeliveryId) {}

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

    /**
     * Client ack when FCM delivers the message to the app (foreground / background handlers).
     * Used for marketplace thread push audit ({@code pushDeliveryId} in data payload).
     */
    @PostMapping("/delivery-ack")
    public ResponseEntity<Void> acknowledgeDelivery(@Valid @RequestBody DeliveryAckRequest req) {
        if (!UUID_RE.matcher(req.pushDeliveryId()).matches()) {
            throw new IllegalArgumentException("pushDeliveryId invalido");
        }
        UUID uid = securityHelper.getCurrentUserId();
        chatThreadPushDeliveryService.acknowledge(uid, UUID.fromString(req.pushDeliveryId()));
        return ResponseEntity.noContent().build();
    }
}
