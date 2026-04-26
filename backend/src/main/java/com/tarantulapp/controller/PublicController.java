package com.tarantulapp.controller;

import com.tarantulapp.dto.PublicProfileDTO;
import com.tarantulapp.dto.PhotoResponse;
import com.tarantulapp.dto.SpoodToggleResponse;
import com.tarantulapp.dto.TimelineEventDTO;
import com.tarantulapp.service.TarantulaService;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final TarantulaService tarantulaService;
    private final SecurityHelper securityHelper;

    public PublicController(TarantulaService tarantulaService, SecurityHelper securityHelper) {
        this.tarantulaService = tarantulaService;
        this.securityHelper = securityHelper;
    }

    @GetMapping("/t/{shortId}")
    public ResponseEntity<PublicProfileDTO> getPublicProfile(@PathVariable String shortId) {
        return ResponseEntity.ok(tarantulaService.getPublicProfile(shortId));
    }

    @GetMapping("/t/{shortId}/timeline")
    public ResponseEntity<List<TimelineEventDTO>> getPublicTimeline(@PathVariable String shortId) {
        return ResponseEntity.ok(tarantulaService.getPublicTimeline(shortId));
    }

    @GetMapping("/t/{shortId}/photos")
    public ResponseEntity<List<PhotoResponse>> getPublicPhotos(@PathVariable String shortId) {
        return ResponseEntity.ok(tarantulaService.getPublicPhotos(shortId));
    }

    @PostMapping("/t/{shortId}/spood")
    public ResponseEntity<SpoodToggleResponse> toggleTarantulaSpood(@PathVariable String shortId) {
        UUID userId = securityHelper.tryGetCurrentUserId()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized"));
        return ResponseEntity.ok(tarantulaService.togglePublicTarantulaSpood(shortId, userId));
    }

    @PostMapping("/t/{shortId}/photos/{photoId}/spood")
    public ResponseEntity<SpoodToggleResponse> togglePhotoSpood(@PathVariable String shortId, @PathVariable UUID photoId) {
        UUID userId = securityHelper.tryGetCurrentUserId()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized"));
        return ResponseEntity.ok(tarantulaService.togglePublicPhotoSpood(shortId, photoId, userId));
    }
}
