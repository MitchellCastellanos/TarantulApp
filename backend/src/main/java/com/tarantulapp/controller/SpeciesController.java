package com.tarantulapp.controller;

import com.tarantulapp.dto.SpeciesDTO;
import com.tarantulapp.service.SpeciesService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/species")
public class SpeciesController {

    private final SpeciesService speciesService;

    public SpeciesController(SpeciesService speciesService) {
        this.speciesService = speciesService;
    }

    @GetMapping
    public ResponseEntity<List<SpeciesDTO>> list(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(q != null ? speciesService.search(q) : speciesService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SpeciesDTO> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(speciesService.findById(id));
    }
}
