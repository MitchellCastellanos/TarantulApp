package com.tarantulapp.controller;

import com.tarantulapp.service.ChatService;
import com.tarantulapp.util.SecurityHelper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;
    private final SecurityHelper securityHelper;

    public ChatController(ChatService chatService, SecurityHelper securityHelper) {
        this.chatService = chatService;
        this.securityHelper = securityHelper;
    }

    record OpenThreadRequest(UUID otherUserId, UUID listingId) {}

    record SendMessageRequest(@NotBlank @Size(max = 4000) String body) {}

    @GetMapping("/threads")
    public ResponseEntity<Map<String, Object>> threads(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(chatService.listThreads(uid, page, size));
    }

    @PostMapping("/threads/open")
    public ResponseEntity<Map<String, Object>> open(@Valid @RequestBody OpenThreadRequest req) {
        UUID uid = securityHelper.getCurrentUserId();
        if (req.otherUserId() == null) {
            throw new IllegalArgumentException("otherUserId requerido");
        }
        return ResponseEntity.ok(chatService.openOrGetThread(uid, req.otherUserId(), req.listingId()));
    }

    @GetMapping("/threads/{threadId}/messages")
    public ResponseEntity<Map<String, Object>> messages(
            @PathVariable UUID threadId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(chatService.listMessages(uid, threadId, page, size));
    }

    @PostMapping("/threads/{threadId}/messages")
    public ResponseEntity<Map<String, Object>> send(
            @PathVariable UUID threadId,
            @Valid @RequestBody SendMessageRequest req) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(chatService.sendMessage(uid, threadId, req.body()));
    }
}
