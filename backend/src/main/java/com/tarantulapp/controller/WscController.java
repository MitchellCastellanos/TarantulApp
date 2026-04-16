package com.tarantulapp.controller;

import com.tarantulapp.dto.SpeciesDTO;
import com.tarantulapp.dto.WscSearchResultDTO;
import com.tarantulapp.service.WscService;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wsc")
public class WscController {

    private final WscService wscService;
    private final SecurityHelper securityHelper;

    public WscController(WscService wscService, SecurityHelper securityHelper) {
        this.wscService = wscService;
        this.securityHelper = securityHelper;
    }

    @GetMapping("/search")
    public ResponseEntity<List<WscSearchResultDTO>> search(@RequestParam String q) {
        return ResponseEntity.ok(wscService.search(q));
    }

    @PostMapping("/import")
    public ResponseEntity<SpeciesDTO> importSpecies(@RequestBody Map<String, String> body) {
        String name   = body.get("name");
        String family = body.get("family");
        SpeciesDTO imported = wscService.importSpecies(name, family, securityHelper.getCurrentUserId());
        return ResponseEntity.ok(imported);
    }
}
