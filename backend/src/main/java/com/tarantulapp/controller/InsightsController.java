package com.tarantulapp.controller;

import com.tarantulapp.dto.CollectionInsightsResponse;
import com.tarantulapp.service.InsightsService;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/insights")
public class InsightsController {

    private final InsightsService insightsService;
    private final SecurityHelper securityHelper;

    public InsightsController(InsightsService insightsService, SecurityHelper securityHelper) {
        this.insightsService = insightsService;
        this.securityHelper = securityHelper;
    }

    @GetMapping("/collection")
    public ResponseEntity<CollectionInsightsResponse> collection() {
        return ResponseEntity.ok(insightsService.getCollectionInsights(securityHelper.getCurrentUserId()));
    }
}
