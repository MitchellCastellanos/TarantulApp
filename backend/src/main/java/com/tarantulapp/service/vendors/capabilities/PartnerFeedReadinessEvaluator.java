package com.tarantulapp.service.vendors.capabilities;

import com.tarantulapp.service.vendors.csv.CsvPartnerFeedProbe;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class PartnerFeedReadinessEvaluator {

    private final PartnerFeedCapabilityRegistry registry;
    private final CsvPartnerFeedProbe csvProbe;

    public PartnerFeedReadinessEvaluator(PartnerFeedCapabilityRegistry registry, CsvPartnerFeedProbe csvProbe) {
        this.registry = registry;
        this.csvProbe = csvProbe;
    }

    public Map<String, Object> evaluate(
            String detectedStoreType,
            boolean wooStoreApiOk,
            String optionalFeedUrl,
            Map<String, Object> vendorFeedConfig) {
        String recommended = registry.recommendFeedType(detectedStoreType, wooStoreApiOk);
        Map<String, Object> config = vendorFeedConfig == null ? Map.of() : vendorFeedConfig;

        String csvUrl = firstNonBlank(optionalFeedUrl, stringConfig(config, "feedUrl"), stringConfig(config, "csvUrl"));
        CsvPartnerFeedProbe.ProbeResult csvResult = csvUrl == null
                ? CsvPartnerFeedProbe.ProbeResult.fail("sin feedUrl")
                : csvProbe.probe(csvUrl);

        List<String> missing = new ArrayList<>();
        boolean autosyncReady = false;
        String activeFeedType = recommended;

        if (wooStoreApiOk) {
            activeFeedType = "woocommerce";
            autosyncReady = true;
        } else if (csvResult.ok()) {
            activeFeedType = "csv";
            autosyncReady = true;
        } else if ("csv".equals(recommended) && csvUrl == null) {
            missing.add("feedUrl");
        } else if ("shopify".equals(recommended)) {
            if (isBlank(stringConfig(config, "shopifyAccessToken"))) {
                missing.add("shopifyAccessToken");
            } else {
                autosyncReady = true;
                activeFeedType = "shopify";
            }
        } else if ("lightspeed".equals(detectedStoreType)) {
            if (!isBlank(stringConfig(config, "lightspeedApiKey"))) {
                autosyncReady = true;
                activeFeedType = "lightspeed";
            } else if (csvUrl == null) {
                missing.add("feedUrl (CSV) o lightspeedApiKey");
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("recommendedFeedType", recommended);
        out.put("activeFeedType", activeFeedType);
        out.put("autosyncSupportedToday", autosyncReady);
        out.put("syncSupport", registry.buildSyncSupport(activeFeedType, autosyncReady, missing));
        out.put("missingRequirements", missing);
        out.put("csvFeedProbe", csvResult.toMap());
        return out;
    }

    private static String stringConfig(Map<String, Object> config, String key) {
        Object raw = config.get(key);
        return raw == null ? null : raw.toString().trim();
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return null;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
