package com.tarantulapp.service;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.PartnerCartHandoffEvent;
import com.tarantulapp.repository.OfficialVendorRepository;
import com.tarantulapp.repository.PartnerCartHandoffEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PartnerHandoffAnalyticsService {

    private final PartnerCartHandoffEventRepository handoffEventRepository;
    private final OfficialVendorRepository officialVendorRepository;

    public PartnerHandoffAnalyticsService(PartnerCartHandoffEventRepository handoffEventRepository,
                                          OfficialVendorRepository officialVendorRepository) {
        this.handoffEventRepository = handoffEventRepository;
        this.officialVendorRepository = officialVendorRepository;
    }

    @Transactional
    public void recordHandoff(OfficialVendor vendor, int lineCount, int totalQuantity, String handoffMode) {
        if (vendor == null || vendor.getId() == null) {
            return;
        }
        PartnerCartHandoffEvent event = new PartnerCartHandoffEvent();
        event.setOfficialVendorId(vendor.getId());
        event.setVendorSlug(vendor.getSlug() == null ? "" : vendor.getSlug());
        event.setLineCount(Math.max(0, lineCount));
        event.setTotalQuantity(Math.max(0, totalQuantity));
        event.setHandoffMode(handoffMode == null ? "" : handoffMode.trim());
        handoffEventRepository.save(event);
    }

    @Transactional(readOnly = true)
    public Map<UUID, Map<String, Object>> adminHandoffByVendorSince(Instant since) {
        Map<UUID, Map<String, Object>> out = new LinkedHashMap<>();
        for (Object[] row : handoffEventRepository.aggregateByVendorSince(since)) {
            UUID vendorId = (UUID) row[0];
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("vendorSlug", row[1] == null ? "" : row[1]);
            m.put("handoffs", ((Number) row[2]).longValue());
            m.put("linesSent", ((Number) row[3]).longValue());
            m.put("itemsSent", ((Number) row[4]).longValue());
            out.put(vendorId, m);
        }
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> publicHandoffStats() {
        Instant since7d = Instant.now().minus(7, ChronoUnit.DAYS);
        Instant since30d = Instant.now().minus(30, ChronoUnit.DAYS);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("handoffs7d", handoffEventRepository.countByCreatedAtAfter(since7d));
        out.put("handoffs30d", handoffEventRepository.countByCreatedAtAfter(since30d));
        out.put("linesSent7d", sumLines(handoffEventRepository.sumLinesAndQtySince(since7d)));
        out.put("linesSent30d", sumLines(handoffEventRepository.sumLinesAndQtySince(since30d)));
        out.put("itemsSent7d", sumQty(handoffEventRepository.sumLinesAndQtySince(since7d)));
        out.put("itemsSent30d", sumQty(handoffEventRepository.sumLinesAndQtySince(since30d)));
        out.put("byVendor30d", mapVendorAgg(handoffEventRepository.aggregateByVendorSince(since30d)));
        return out;
    }

    private static long sumLines(List<Object[]> rows) {
        if (rows == null || rows.isEmpty()) {
            return 0L;
        }
        Object[] row = rows.get(0);
        return row[0] == null ? 0L : ((Number) row[0]).longValue();
    }

    private static long sumQty(List<Object[]> rows) {
        if (rows == null || rows.isEmpty()) {
            return 0L;
        }
        Object[] row = rows.get(0);
        return row.length < 2 || row[1] == null ? 0L : ((Number) row[1]).longValue();
    }

    private List<Map<String, Object>> mapVendorAgg(List<Object[]> rows) {
        List<Map<String, Object>> list = new ArrayList<>();
        if (rows == null) {
            return list;
        }
        for (Object[] row : rows) {
            UUID vendorId = (UUID) row[0];
            String slug = (String) row[1];
            long handoffs = ((Number) row[2]).longValue();
            long lines = ((Number) row[3]).longValue();
            long qty = ((Number) row[4]).longValue();
            String name = officialVendorRepository.findById(vendorId)
                    .map(OfficialVendor::getName)
                    .orElse(slug);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("vendorSlug", slug);
            m.put("vendorName", name);
            m.put("handoffs", handoffs);
            m.put("linesSent", lines);
            m.put("itemsSent", qty);
            list.add(m);
        }
        return list;
    }
}
