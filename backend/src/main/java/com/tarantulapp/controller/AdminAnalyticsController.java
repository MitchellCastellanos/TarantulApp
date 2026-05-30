package com.tarantulapp.controller;

import com.tarantulapp.service.AdminAccessService;
import com.tarantulapp.service.AppAnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Admin-only app usage analytics dashboard data: visits, time spent, and
 * breakdowns by country/city/platform plus a daily trend. Kept in its own
 * controller so the large {@code AdminController} constructor stays untouched.
 */
@RestController
@RequestMapping("/api/admin/analytics")
public class AdminAnalyticsController {

    private final AdminAccessService adminAccessService;
    private final AppAnalyticsService analyticsService;

    public AdminAnalyticsController(AdminAccessService adminAccessService,
                                    AppAnalyticsService analyticsService) {
        this.adminAccessService = adminAccessService;
        this.analyticsService = analyticsService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> overview(
            @RequestParam(defaultValue = "30d") String range) {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(analyticsService.adminOverview(range));
    }
}
