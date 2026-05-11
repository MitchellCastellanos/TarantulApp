package com.tarantulapp.service;

import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

/**
 * Runs {@link BetaTesterGoogleGroupSyncService#ensureGoogleTestersGroupMember} off the HTTP thread so
 * register/login stay fast; schedules after DB commit when a transaction is open (e.g. admin provision).
 */
@Component
public class GoogleGroupSyncAsyncInvoker {

    private final BetaTesterGoogleGroupSyncService syncService;
    private final GoogleGroupSyncAsyncInvoker self;

    public GoogleGroupSyncAsyncInvoker(BetaTesterGoogleGroupSyncService syncService,
                                       @Lazy GoogleGroupSyncAsyncInvoker self) {
        this.syncService = syncService;
        this.self = self;
    }

    /**
     * If called inside a transaction, enqueue after commit so other threads see the new row.
     * Otherwise enqueue immediately (typical auth paths without an outer transaction).
     */
    public void scheduleAfterCommitOrNow(UUID userId) {
        if (userId == null) {
            return;
        }
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            self.enqueueEnsure(userId);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                self.enqueueEnsure(userId);
            }
        });
    }

    @Async("googleGroupExecutor")
    public void enqueueEnsure(UUID userId) {
        if (userId == null) {
            return;
        }
        syncService.ensureGoogleTestersGroupMember(userId);
    }
}
