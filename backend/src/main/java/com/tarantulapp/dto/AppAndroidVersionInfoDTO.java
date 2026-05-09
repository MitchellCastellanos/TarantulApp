package com.tarantulapp.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Datos públicos para que la app Android compare {@code versionCode} con la última publicada en Play.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AppAndroidVersionInfoDTO(
        int latestVersionCode,
        String latestVersionName,
        String playStoreUrl
) {}
