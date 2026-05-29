package com.tarantulapp.controller;

import com.tarantulapp.dto.BehaviorLogResponse;
import com.tarantulapp.dto.BehaviorLogRequest;
import com.tarantulapp.dto.FeedingLogRequest;
import com.tarantulapp.dto.FeedingLogResponse;
import com.tarantulapp.dto.MoltLogRequest;
import com.tarantulapp.dto.MoltLogResponse;
import com.tarantulapp.dto.PassportClaimRequest;
import com.tarantulapp.dto.PassportClaimResponse;
import com.tarantulapp.dto.PublicProfileDTO;
import com.tarantulapp.dto.PhotoResponse;
import com.tarantulapp.dto.SpoodToggleResponse;
import com.tarantulapp.dto.TimelineEventDTO;
import com.tarantulapp.service.LogsService;
import com.tarantulapp.service.PassportService;
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
    private final PassportService passportService;
    private final SecurityHelper securityHelper;

    public PublicController(TarantulaService tarantulaService,
                            LogsService logsService,
                            PassportService passportService,
                            SecurityHelper securityHelper) {
        this.tarantulaService = tarantulaService;
        this.logsService = logsService;
        this.passportService = passportService;
        this.securityHelper = securityHelper;
    }

    @GetMapping("/t/{shortId}")
    public ResponseEntity<PublicProfileDTO> getPublicProfile(@PathVariable String shortId) {
        return ResponseEntity.ok(tarantulaService.getPublicProfile(shortId));
    }

    /** Authenticated keeper claims an unclaimed passport label into their collection. */
    @PostMapping("/t/{shortId}/claim")
    public ResponseEntity<PassportClaimResponse> claimPassport(@PathVariable String shortId,
                                                               @RequestBody(required = false) PassportClaimRequest req) {
        UUID userId = securityHelper.tryGetCurrentUserId()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized"));
        PassportClaimRequest body = req != null ? req : new PassportClaimRequest();
        return ResponseEntity.ok(passportService.claimPassport(shortId, body, userId));
    }

    @GetMapping("/t/{shortId}/timeline")
    public ResponseEntity<?> getPublicTimeline(@PathVariable String shortId,
                                               @RequestParam(required = false) Integer page,
                                               @RequestParam(required = false) Integer size) {
        if (page == null && size == null) {
            return ResponseEntity.ok(tarantulaService.getPublicTimeline(shortId));
        }
        int p = page != null ? Math.max(0, page) : 0;
        int sz = size != null ? Math.min(60, Math.max(1, size)) : 24;
        return ResponseEntity.ok(tarantulaService.getPublicTimelinePaged(shortId, p, sz));
    }

    @GetMapping("/t/{shortId}/photos")
    public ResponseEntity<?> getPublicPhotos(@PathVariable String shortId,
                                             @RequestParam(required = false) Integer page,
                                             @RequestParam(required = false) Integer size) {
        if (page == null && size == null) {
            return ResponseEntity.ok(tarantulaService.getPublicPhotos(shortId));
        }
        int p = page != null ? Math.max(0, page) : 0;
        int sz = size != null ? Math.min(60, Math.max(1, size)) : 24;
        return ResponseEntity.ok(tarantulaService.getPublicPhotosPaged(shortId, p, sz));
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
