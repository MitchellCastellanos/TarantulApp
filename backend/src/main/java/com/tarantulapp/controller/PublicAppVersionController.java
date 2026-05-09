package com.tarantulapp.controller;

import com.tarantulapp.dto.AppAndroidVersionInfoDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Versión publicada en Play Store (configurable por env). La app nativa compara su {@code versionCode}.
 */
@RestController
@RequestMapping("/api/public/app")
public class PublicAppVersionController {

    private static final String PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.tarantulapp.app";

    private final int latestVersionCode;
    private final String latestVersionName;

    public PublicAppVersionController(
            @Value("${app.android.latest-version-code:21}") int latestVersionCode,
            @Value("${app.android.latest-version-name:1.0.20}") String latestVersionName) {
        this.latestVersionCode = latestVersionCode;
        this.latestVersionName = latestVersionName != null ? latestVersionName.trim() : "";
    }

    @GetMapping("/android")
    public ResponseEntity<AppAndroidVersionInfoDTO> getAndroidVersionInfo() {
        return ResponseEntity.ok(new AppAndroidVersionInfoDTO(
                latestVersionCode,
                latestVersionName.isEmpty() ? null : latestVersionName,
                PLAY_STORE_URL));
    }
}
