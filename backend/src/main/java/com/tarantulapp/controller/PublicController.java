package com.tarantulapp.controller;

import com.tarantulapp.dto.PublicProfileDTO;
import com.tarantulapp.service.TarantulaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final TarantulaService tarantulaService;

    public PublicController(TarantulaService tarantulaService) {
        this.tarantulaService = tarantulaService;
    }

    // Accesible sin autenticación (configurado en SecurityConfig)
    @GetMapping("/t/{shortId}")
    public ResponseEntity<PublicProfileDTO> getPublicProfile(@PathVariable String shortId) {
        return ResponseEntity.ok(tarantulaService.getPublicProfile(shortId));
    }
}
