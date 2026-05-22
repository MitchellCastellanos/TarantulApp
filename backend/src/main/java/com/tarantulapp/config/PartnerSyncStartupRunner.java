package com.tarantulapp.config;

import com.tarantulapp.service.vendors.sync.PartnerListingSyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class PartnerSyncStartupRunner implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(PartnerSyncStartupRunner.class);

    private final PartnerListingSyncService partnerListingSyncService;
    private final boolean runOnStartup;

    public PartnerSyncStartupRunner(
            PartnerListingSyncService partnerListingSyncService,
            @Value("${app.partner-sync.run-on-startup:false}") boolean runOnStartup) {
        this.partnerListingSyncService = partnerListingSyncService;
        this.runOnStartup = runOnStartup;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!runOnStartup) {
            return;
        }
        try {
            log.info("Partner catalog sync on startup requested");
            partnerListingSyncService.runManualSyncAllStrategic();
        } catch (Exception ex) {
            log.warn("Partner sync on startup failed: {}", ex.getMessage());
        }
    }
}
