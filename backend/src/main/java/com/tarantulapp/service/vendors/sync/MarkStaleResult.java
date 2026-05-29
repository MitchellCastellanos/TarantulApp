package com.tarantulapp.service.vendors.sync;

import java.util.List;

public record MarkStaleResult(
        int count,
        List<StaleListingRef> items
) {
    public static MarkStaleResult empty() {
        return new MarkStaleResult(0, List.of());
    }
}
