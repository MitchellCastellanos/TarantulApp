package com.tarantulapp.controller;

import com.tarantulapp.service.NotificationService;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final SecurityHelper securityHelper;

    public NotificationController(NotificationService notificationService, SecurityHelper securityHelper) {
        this.notificationService = notificationService;
        this.securityHelper = securityHelper;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(notificationService.listMine(uid, page, size));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Object>> unreadCount() {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(Map.of("count", notificationService.unreadCount(uid)));
    }

    @PostMapping("/{notificationId}/read")
    public ResponseEntity<Map<String, Object>> markRead(@PathVariable UUID notificationId) {
        UUID uid = securityHelper.getCurrentUserId();
        notificationService.markRead(uid, notificationId);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllRead() {
        UUID uid = securityHelper.getCurrentUserId();
        int updated = notificationService.markAllRead(uid);
        return ResponseEntity.ok(Map.of("ok", true, "updated", updated));
    }
}
