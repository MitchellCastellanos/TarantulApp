package com.tarantulapp.controller;

import com.tarantulapp.dto.PublicProfileDTO;
import com.tarantulapp.dto.TimelineEventDTO;
import com.tarantulapp.service.TarantulaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final TarantulaService tarantulaService;

    public PublicController(TarantulaService tarantulaService) {
        this.tarantulaService = tarantulaService;
    }

    @GetMapping("/t/{shortId}")
    public ResponseEntity<PublicProfileDTO> getPublicProfile(@PathVariable String shortId) {
        return ResponseEntity.ok(tarantulaService.getPublicProfile(shortId));
    }

    @GetMapping("/t/{shortId}/timeline")
    public ResponseEntity<List<TimelineEventDTO>> getPublicTimeline(@PathVariable String shortId) {
        return ResponseEntity.ok(tarantulaService.getPublicTimeline(shortId));
    }
}
