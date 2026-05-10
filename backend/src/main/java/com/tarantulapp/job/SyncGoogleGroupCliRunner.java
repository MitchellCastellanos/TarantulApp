package com.tarantulapp.job;

import com.tarantulapp.service.BetaTesterGoogleGroupSyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * CLI retry job: {@code mvn spring-boot:run -Dspring-boot.run.profiles=sync-google-group}
 * (see {@code scripts/sync-testers-to-google-group.*}).
 */
@Component
@Profile("sync-google-group")
@Order(Integer.MAX_VALUE)
public class SyncGoogleGroupCliRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SyncGoogleGroupCliRunner.class);

    private final BetaTesterGoogleGroupSyncService betaTesterGoogleGroupSyncService;

    public SyncGoogleGroupCliRunner(BetaTesterGoogleGroupSyncService betaTesterGoogleGroupSyncService) {
        this.betaTesterGoogleGroupSyncService = betaTesterGoogleGroupSyncService;
    }

    @Override
    public void run(ApplicationArguments args) {
        BetaTesterGoogleGroupSyncService.SyncGoogleGroupBatchResult r =
                betaTesterGoogleGroupSyncService.retryAllPending();
        log.info("sync-testers-to-google-group: attempted={} synced={} failed={}",
                r.attempted(), r.synced(), r.failed());
        int code = r.failed() > 0 ? 1 : 0;
        System.exit(code);
    }
}
