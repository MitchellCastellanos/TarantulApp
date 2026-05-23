package com.tarantulapp.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record SpeciesSeoSnapshotDTO(
        SpeciesDTO species,
        long activeListingCount,
        List<Map<String, Object>> recentListings,
        long communityMoltCount,
        Instant lastCommunityMoltAt,
        List<Map<String, Object>> tradeNotes
) {}
