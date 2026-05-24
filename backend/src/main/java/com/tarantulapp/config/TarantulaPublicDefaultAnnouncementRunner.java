package com.tarantulapp.config;

import com.tarantulapp.service.TarantulaPublicDefaultAnnouncementService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class TarantulaPublicDefaultAnnouncementRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(TarantulaPublicDefaultAnnouncementRunner.class);

    private final TarantulaPublicDefaultAnnouncementService announcementService;
    private final boolean sendOnStartup;

    public TarantulaPublicDefaultAnnouncementRunner(
            TarantulaPublicDefaultAnnouncementService announcementService,
            @Value("${app.tarantula-public-default.send-announcement-on-startup:true}") boolean sendOnStartup) {
        this.announcementService = announcementService;
        this.sendOnStartup = sendOnStartup;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!sendOnStartup) {
            return;
        }
        try {
            log.info("Sending tarantula public-default announcement to keepers with collections");
            var out = announcementService.sendToKeepersWithCollection();
            log.info("Tarantula public-default announcement: eligible={} sent={} skipped={} failed={}",
                    out.get("eligibleKeepers"), out.get("sent"), out.get("skipped"), out.get("failed"));
        } catch (Exception ex) {
            log.warn("Tarantula public-default announcement on startup failed: {}", ex.getMessage());
        }
    }
}
