package com.tarantulapp.service.vendors.capabilities;

import com.tarantulapp.service.vendors.csv.CsvPartnerFeedProbe;
import com.tarantulapp.service.vendors.csv.LightspeedPartnerFeedProbe;
import com.tarantulapp.service.vendors.csv.ShopifyPartnerFeedProbe;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class PartnerFeedReadinessEvaluator {

    private final PartnerFeedCapabilityRegistry registry;
    private final CsvPartnerFeedProbe csvProbe;
    private final ShopifyPartnerFeedProbe shopifyProbe;
    private final LightspeedPartnerFeedProbe lightspeedProbe;

    public PartnerFeedReadinessEvaluator(
            PartnerFeedCapabilityRegistry registry,
            CsvPartnerFeedProbe csvProbe,
            ShopifyPartnerFeedProbe shopifyProbe,
            LightspeedPartnerFeedProbe lightspeedProbe) {
        this.registry = registry;
        this.csvProbe = csvProbe;
        this.shopifyProbe = shopifyProbe;
        this.lightspeedProbe = lightspeedProbe;
    }

    public Map<String, Object> evaluate(
            String detectedStoreType,
            boolean wooStoreApiOk,
            String optionalFeedUrl,
            Map<String, Object> vendorFeedConfig) {
        String storeType = detectedStoreType == null ? "unknown" : detectedStoreType.trim().toLowerCase(Locale.ROOT);
        String recommended = registry.recommendFeedType(storeType, wooStoreApiOk);
        Map<String, Object> config = vendorFeedConfig == null ? Map.of() : vendorFeedConfig;

        String csvUrl = firstNonBlank(optionalFeedUrl, stringConfig(config, "feedUrl"), stringConfig(config, "csvUrl"));
        CsvPartnerFeedProbe.ProbeResult csvResult = csvUrl == null
                ? CsvPartnerFeedProbe.ProbeResult.fail("sin feedUrl")
                : csvProbe.probe(csvUrl);

        List<String> missing = new ArrayList<>();
        boolean autosyncReady = false;
        String activeFeedType = recommended;

        Map<String, Object> shopifyFeedProbe = Map.of();
        Map<String, Object> lightspeedFeedProbe = Map.of();

        if (wooStoreApiOk) {
            activeFeedType = "woocommerce";
            autosyncReady = true;
        } else if (csvResult.ok()) {
            activeFeedType = "csv";
            autosyncReady = true;
        } else if ("shopify".equals(storeType) || "shopify".equals(recommended)) {
            String domain = firstNonBlank(stringConfig(config, "shopifyShopDomain"));
            String token = stringConfig(config, "shopifyAccessToken");
            if (!isBlank(token)) {
                shopifyFeedProbe = shopifyProbe.probe(domain, token);
                if (Boolean.TRUE.equals(shopifyFeedProbe.get("ok"))) {
                    autosyncReady = true;
                    activeFeedType = "shopify";
                } else {
                    missing.add("shopifyAccessToken válido");
                }
            } else {
                missing.add("shopifyAccessToken");
            }
        } else if ("lightspeed".equals(storeType) || "lightspeed".equals(recommended)) {
            String apiKey = stringConfig(config, "lightspeedApiKey");
            String apiSecret = stringConfig(config, "lightspeedApiSecret");
            if (!isBlank(apiKey) && !isBlank(apiSecret)) {
                lightspeedFeedProbe = lightspeedProbe.probe(
                        apiKey, apiSecret, stringConfig(config, "lightspeedLang"));
                if (Boolean.TRUE.equals(lightspeedFeedProbe.get("ok"))) {
                    autosyncReady = true;
                    activeFeedType = "lightspeed";
                } else {
                    missing.add("lightspeedApiKey/Secret válidos");
                }
            } else if (csvUrl == null) {
                missing.add("feedUrl (CSV) o lightspeedApiKey + lightspeedApiSecret");
            } else if (!csvResult.ok()) {
                missing.add("feedUrl CSV válido o credenciales Lightspeed");
            }
        } else if ("csv".equals(recommended) && csvUrl == null) {
            missing.add("feedUrl");
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("recommendedFeedType", recommended);
        out.put("activeFeedType", activeFeedType);
        out.put("autosyncSupportedToday", autosyncReady);
        out.put("syncSupport", registry.buildSyncSupport(activeFeedType, autosyncReady, missing));
        out.put("missingRequirements", missing);
        out.put("csvFeedProbe", csvResult.toMap());
        if (!shopifyFeedProbe.isEmpty()) {
            out.put("shopifyFeedProbe", shopifyFeedProbe);
        }
        if (!lightspeedFeedProbe.isEmpty()) {
            out.put("lightspeedFeedProbe", lightspeedFeedProbe);
        }
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
