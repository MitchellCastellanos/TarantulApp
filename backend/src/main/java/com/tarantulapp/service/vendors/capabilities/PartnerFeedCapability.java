package com.tarantulapp.service.vendors.capabilities;

import java.util.List;

/**
 * Declarative partner catalog feed contract (preview + sync use the same rules).
 */
public record PartnerFeedCapability(
        String feedType,
        String label,
        boolean autosyncWithoutCredentials,
        List<String> requiredConfigKeysForAutosync,
        List<String> recommendedForDetectedStoreTypes,
        String autosyncReadyHeadline,
        String autosyncBlockedHeadline,
        String autosyncBlockedDetail
) {
}
