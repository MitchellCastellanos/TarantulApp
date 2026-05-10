package com.tarantulapp.service;

/**
 * Stored in {@code users.google_group_sync_status} for beta testers targeted by Play closed-testing group sync.
 */
public final class GoogleGroupSyncStatus {

    public static final String SYNCED = "synced";
    /** Needs retry (API error, misconfiguration, transient failure). */
    public static final String FAILED = "google_group_failed";
    /** Queued / not successfully synced yet (optional; retry script includes NULL as pending). */
    public static final String PENDING = "pending";

    private GoogleGroupSyncStatus() {}
}
