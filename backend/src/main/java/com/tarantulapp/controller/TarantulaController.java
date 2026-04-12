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

    @GetMapping
    public ResponseEntity<List<TarantulaResponse>> list() {
        return ResponseEntity.ok(tarantulaService.findByUser(securityHelper.getCurrentUserId()));
    }

    @PostMapping
    public ResponseEntity<TarantulaResponse> create(@Valid @RequestBody TarantulaRequest req) {
        return ResponseEntity.ok(tarantulaService.create(req, securityHelper.getCurrentUserId()));
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

    @GetMapping("/{id}/timeline")
    public ResponseEntity<List<TimelineEventDTO>> getTimeline(@PathVariable UUID id) {
        return ResponseEntity.ok(tarantulaService.getTimeline(id, securityHelper.getCurrentUserId()));
    }

    @GetMapping("/{id}/photos")
    public ResponseEntity<List<PhotoResponse>> getPhotos(@PathVariable UUID id) {
        return ResponseEntity.ok(tarantulaService.getPhotos(id, securityHelper.getCurrentUserId()));
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
