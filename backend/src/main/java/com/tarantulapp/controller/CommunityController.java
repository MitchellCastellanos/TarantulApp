package com.tarantulapp.controller;

import com.tarantulapp.service.ActivityPostService;
import com.tarantulapp.util.SecurityHelper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/community")
public class CommunityController {

    private final ActivityPostService activityPostService;
    private final SecurityHelper securityHelper;

    public CommunityController(ActivityPostService activityPostService, SecurityHelper securityHelper) {
        this.activityPostService = activityPostService;
        this.securityHelper = securityHelper;
    }

    record CreatePostRequest(
            @NotBlank @Size(max = 2000) String body,
            String visibility,
            @Size(max = 40) String milestoneKind,
            @Size(max = 500) String imageUrl,
            UUID tarantulaId
    ) {}

    record CommentBodyRequest(@NotBlank @Size(max = 1500) String body) {}

    @PostMapping("/posts")
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody CreatePostRequest req) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(activityPostService.createPost(
                uid, req.body(), req.visibility(), req.milestoneKind(), req.imageUrl(), req.tarantulaId()));
    }

    @GetMapping("/posts/mine")
    public ResponseEntity<Map<String, Object>> myPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(activityPostService.myPosts(uid, page, size));
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<Map<String, String>> deletePost(@PathVariable UUID postId) {
        activityPostService.deleteMyPost(securityHelper.getCurrentUserId(), postId);
        return ResponseEntity.ok(Map.of("message", "ok"));
    }

    @PostMapping("/posts/{postId}/like")
    public ResponseEntity<Map<String, Object>> toggleLike(@PathVariable UUID postId) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(activityPostService.toggleLike(uid, postId));
    }

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<List<Map<String, Object>>> comments(@PathVariable UUID postId) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(activityPostService.listComments(uid, postId));
    }

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<Map<String, Object>> addComment(
            @PathVariable UUID postId,
            @Valid @RequestBody CommentBodyRequest req) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(activityPostService.addComment(uid, postId, req.body()));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Map<String, String>> deleteComment(@PathVariable UUID commentId) {
        activityPostService.deleteMyComment(securityHelper.getCurrentUserId(), commentId);
        return ResponseEntity.ok(Map.of("message", "ok"));
    }
}
