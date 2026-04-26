package com.tarantulapp.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class SexIdCaseSettlementScheduler {

    private static final Logger log = LoggerFactory.getLogger(SexIdCaseSettlementScheduler.class);

    private final SexIdCaseService sexIdCaseService;

    @Value("${app.sex-id.settlement.enabled:true}")
    private boolean enabled;

    public SexIdCaseSettlementScheduler(SexIdCaseService sexIdCaseService) {
        this.sexIdCaseService = sexIdCaseService;
    }

    @Scheduled(cron = "${app.sex-id.settlement.cron:0 */10 * * * *}")
    public void settleCases() {
        if (!enabled) {
            return;
        }
        int changed = sexIdCaseService.settleDueCases();
        if (changed > 0) {
            log.info("Sex ID settlement processed {} case(s)", changed);
        }
    }
}
