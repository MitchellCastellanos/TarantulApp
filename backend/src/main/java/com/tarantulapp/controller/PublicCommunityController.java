package com.tarantulapp.controller;

import com.tarantulapp.service.ActivityPostService;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/public/community")
public class PublicCommunityController {

    private final ActivityPostService activityPostService;
    private final SecurityHelper securityHelper;

    public PublicCommunityController(ActivityPostService activityPostService, SecurityHelper securityHelper) {
        this.activityPostService = activityPostService;
        this.securityHelper = securityHelper;
    }

    @GetMapping("/feed")
    public ResponseEntity<Map<String, Object>> publicFeed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Optional<UUID> viewer = securityHelper.tryGetCurrentUserId();
        return ResponseEntity.ok(activityPostService.publicFeed(page, size, viewer));
    }

    @GetMapping("/posts/{postId}/likes")
    public ResponseEntity<List<Map<String, Object>>> postLikes(
            @PathVariable UUID postId,
            @RequestParam(defaultValue = "40") int limit) {
        Optional<UUID> viewer = securityHelper.tryGetCurrentUserId();
        return ResponseEntity.ok(activityPostService.listLikes(postId, viewer, limit));
    }

    @GetMapping("/posts/{postId}")
    public ResponseEntity<Map<String, Object>> postById(@PathVariable UUID postId) {
        Optional<UUID> viewer = securityHelper.tryGetCurrentUserId();
        return ResponseEntity.ok(activityPostService.publicPost(postId, viewer));
    }

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<List<Map<String, Object>>> postComments(@PathVariable UUID postId) {
        Optional<UUID> viewer = securityHelper.tryGetCurrentUserId();
        return ResponseEntity.ok(activityPostService.listComments(viewer, postId));
    }
}
