package com.tarantulapp.controller;

import com.tarantulapp.dto.BehaviorLogResponse;
import com.tarantulapp.dto.BehaviorLogRequest;
import com.tarantulapp.dto.FeedingLogRequest;
import com.tarantulapp.dto.FeedingLogResponse;
import com.tarantulapp.dto.MoltLogRequest;
import com.tarantulapp.dto.MoltLogResponse;
import com.tarantulapp.dto.PublicProfileDTO;
import com.tarantulapp.dto.PhotoResponse;
import com.tarantulapp.dto.SpoodToggleResponse;
import com.tarantulapp.dto.TimelineEventDTO;
import com.tarantulapp.service.LogsService;
import com.tarantulapp.service.TarantulaService;
import com.tarantulapp.util.SecurityHelper;
import jakarta.validation.Valid;
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
    private final LogsService logsService;
    private final SecurityHelper securityHelper;

    public PublicController(TarantulaService tarantulaService, LogsService logsService, SecurityHelper securityHelper) {
        this.tarantulaService = tarantulaService;
        this.logsService = logsService;
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

    /** Dueño autenticado: registro rápido desde QR (requiere Pro o prueba activa). */
    @PostMapping("/t/{shortId}/owner/feedings")
    public ResponseEntity<FeedingLogResponse> addFeedingFromQr(@PathVariable String shortId,
                                                             @Valid @RequestBody FeedingLogRequest req) {
        UUID userId = securityHelper.tryGetCurrentUserId()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized"));
        return ResponseEntity.ok(logsService.addFeedingFromPublicQrCard(shortId, req, userId));
    }

    @PostMapping("/t/{shortId}/owner/molts")
    public ResponseEntity<MoltLogResponse> addMoltFromQr(@PathVariable String shortId,
                                                          @Valid @RequestBody MoltLogRequest req) {
        UUID userId = securityHelper.tryGetCurrentUserId()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized"));
        return ResponseEntity.ok(logsService.addMoltFromPublicQrCard(shortId, req, userId));
    }

    @PostMapping("/t/{shortId}/owner/behaviors")
    public ResponseEntity<BehaviorLogResponse> addBehaviorFromQr(@PathVariable String shortId,
                                                                   @Valid @RequestBody BehaviorLogRequest req) {
        UUID userId = securityHelper.tryGetCurrentUserId()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized"));
        return ResponseEntity.ok(logsService.addBehaviorFromPublicQrCard(shortId, req, userId));
    }
}
