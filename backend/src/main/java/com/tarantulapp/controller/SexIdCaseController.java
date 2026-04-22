package com.tarantulapp.controller;

import com.tarantulapp.service.SexIdCaseService;
import com.tarantulapp.util.SecurityHelper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/sex-id-cases")
public class SexIdCaseController {

    private final SexIdCaseService sexIdCaseService;
    private final SecurityHelper securityHelper;

    public SexIdCaseController(SexIdCaseService sexIdCaseService, SecurityHelper securityHelper) {
        this.sexIdCaseService = sexIdCaseService;
        this.securityHelper = securityHelper;
    }

    record CreateCaseRequest(
            @Size(max = 200) String title,
            @jakarta.validation.constraints.NotBlank @Size(max = 500) String imageUrl,
            @Size(max = 200) String speciesHint
    ) {}

    record VoteRequest(
            @jakarta.validation.constraints.NotBlank @Size(max = 20) String choice
    ) {}

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody CreateCaseRequest req) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(sexIdCaseService.create(uid, req.title(), req.imageUrl(), req.speciesHint()));
    }

    @GetMapping("/mine")
    public ResponseEntity<Map<String, Object>> mine(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(sexIdCaseService.myCases(uid, page, size));
    }

    @PostMapping("/{caseId}/vote")
    public ResponseEntity<Map<String, Object>> vote(
            @PathVariable UUID caseId,
            @Valid @RequestBody VoteRequest req) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(sexIdCaseService.vote(uid, caseId, req.choice()));
    }
}
