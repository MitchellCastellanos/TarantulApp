package com.tarantulapp.controller;

import com.tarantulapp.dto.*;
import com.tarantulapp.service.TarantulaService;
import com.tarantulapp.util.SecurityHelper;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/tarantulas")
public class TarantulaController {

    private final TarantulaService tarantulaService;
    private final SecurityHelper securityHelper;

    public TarantulaController(TarantulaService tarantulaService, SecurityHelper securityHelper) {
        this.tarantulaService = tarantulaService;
        this.securityHelper = securityHelper;
    }

    /**
     * Collection list. Without {@code page}/{@code size} returns the same JSON array shape as before.
     * With pagination params returns {@link TarantulaCollectionPageResponse} (object with {@code content}).
     */
    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) Integer page,
                                  @RequestParam(required = false) Integer size) {
        UUID userId = securityHelper.getCurrentUserId();
        if (page == null && size == null) {
            return ResponseEntity.ok(tarantulaService.findByUser(userId));
        }
        int p = page != null ? Math.max(0, page) : 0;
        int sz = size != null ? Math.min(100, Math.max(1, size)) : 24;
        return ResponseEntity.ok(tarantulaService.findByUserPaged(userId, p, sz));
    }

    @PostMapping
    public ResponseEntity<TarantulaResponse> create(@Valid @RequestBody TarantulaRequest req) {
        return ResponseEntity.ok(tarantulaService.create(req, securityHelper.getCurrentUserId()));
    }

    record BulkVisibilityRequest(boolean isPublic) {}

    @PatchMapping("/bulk-visibility")
    public ResponseEntity<Map<String, Object>> bulkSetVisibility(@RequestBody BulkVisibilityRequest req) {
        return ResponseEntity.ok(tarantulaService.bulkSetVisibility(
                securityHelper.getCurrentUserId(), req.isPublic()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TarantulaResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(tarantulaService.findById(id, securityHelper.getCurrentUserId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TarantulaResponse> update(@PathVariable UUID id,
                                                     @Valid @RequestBody TarantulaRequest req) {
        return ResponseEntity.ok(tarantulaService.update(id, req, securityHelper.getCurrentUserId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        tarantulaService.delete(id, securityHelper.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TarantulaResponse> uploadPhoto(@PathVariable UUID id,
                                                          @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(tarantulaService.uploadPhoto(id, file, securityHelper.getCurrentUserId()));
    }

    @PatchMapping("/{id}/visibility")
    public ResponseEntity<TarantulaResponse> togglePublic(@PathVariable UUID id) {
        return ResponseEntity.ok(tarantulaService.togglePublic(id, securityHelper.getCurrentUserId()));
    }

    @PatchMapping("/{id}/deceased")
    public ResponseEntity<TarantulaResponse> markDeceased(@PathVariable UUID id,
                                                           @RequestBody DeceasedRequest req) {
        return ResponseEntity.ok(tarantulaService.markDeceased(id, securityHelper.getCurrentUserId(), req));
    }

    /**
     * Sin {@code page}/{@code size}: mismo array JSON que antes. Con paginación: objeto con {@code content}, {@code totalElements}, etc.
     */
    @GetMapping("/{id}/timeline")
    public ResponseEntity<?> getTimeline(@PathVariable UUID id,
                                         @RequestParam(required = false) Integer page,
                                         @RequestParam(required = false) Integer size) {
        UUID uid = securityHelper.getCurrentUserId();
        if (page == null && size == null) {
            return ResponseEntity.ok(tarantulaService.getTimeline(id, uid));
        }
        int p = page != null ? Math.max(0, page) : 0;
        int sz = size != null ? Math.min(60, Math.max(1, size)) : 24;
        return ResponseEntity.ok(tarantulaService.getTimelinePaged(id, uid, p, sz));
    }

    @GetMapping("/{id}/photos")
    public ResponseEntity<?> getPhotos(@PathVariable UUID id,
                                       @RequestParam(required = false) Integer page,
                                       @RequestParam(required = false) Integer size) {
        UUID uid = securityHelper.getCurrentUserId();
        if (page == null && size == null) {
            return ResponseEntity.ok(tarantulaService.getPhotos(id, uid));
        }
        int p = page != null ? Math.max(0, page) : 0;
        int sz = size != null ? Math.min(60, Math.max(1, size)) : 24;
        return ResponseEntity.ok(tarantulaService.getPhotosPaged(id, uid, p, sz));
    }

    @PostMapping(value = "/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PhotoResponse> addPhoto(@PathVariable UUID id,
                                                   @RequestParam("file") MultipartFile file,
                                                   @RequestParam(value = "caption", required = false) String caption) throws IOException {
        return ResponseEntity.ok(tarantulaService.addPhoto(id, file, caption, securityHelper.getCurrentUserId()));
    }

    @DeleteMapping("/{id}/photos/{photoId}")
    public ResponseEntity<Void> deletePhoto(@PathVariable UUID id, @PathVariable UUID photoId) {
        tarantulaService.deletePhoto(id, photoId, securityHelper.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }
}
