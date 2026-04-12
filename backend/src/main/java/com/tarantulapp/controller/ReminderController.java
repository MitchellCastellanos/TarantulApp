package com.tarantulapp.controller;

import com.tarantulapp.dto.ReminderRequest;
import com.tarantulapp.dto.ReminderResponse;
import com.tarantulapp.service.ReminderService;
import com.tarantulapp.util.SecurityHelper;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reminders")
public class ReminderController {

    private final ReminderService reminderService;
    private final SecurityHelper securityHelper;

    public ReminderController(ReminderService reminderService, SecurityHelper securityHelper) {
        this.reminderService = reminderService;
        this.securityHelper = securityHelper;
    }

    @GetMapping
    public ResponseEntity<List<ReminderResponse>> list() {
        return ResponseEntity.ok(reminderService.findByUser(securityHelper.getCurrentUserId()));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<ReminderResponse>> pending() {
        return ResponseEntity.ok(reminderService.findPending(securityHelper.getCurrentUserId()));
    }

    @PostMapping
    public ResponseEntity<ReminderResponse> create(@Valid @RequestBody ReminderRequest req) {
        return ResponseEntity.ok(reminderService.create(req, securityHelper.getCurrentUserId()));
    }

    @PatchMapping("/{id}/done")
    public ResponseEntity<ReminderResponse> markDone(@PathVariable UUID id) {
        return ResponseEntity.ok(reminderService.markDone(id, securityHelper.getCurrentUserId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        reminderService.delete(id, securityHelper.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }
}
