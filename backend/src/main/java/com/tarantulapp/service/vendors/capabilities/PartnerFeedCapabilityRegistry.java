package com.tarantulapp.service.vendors.capabilities;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Component
public class PartnerFeedCapabilityRegistry {

    private static final List<PartnerFeedCapability> CAPABILITIES = List.of(
            new PartnerFeedCapability(
                    "woocommerce",
                    "WooCommerce Store API",
                    true,
                    List.of("feedBaseUrl"),
                    List.of("woocommerce", "wordpress"),
                    "Autosync WooCommerce disponible hoy",
                    "WooCommerce sin Store API pública",
                    "La Store API no responde — revisar URL, firewall o plugin Woo."
            ),
            new PartnerFeedCapability(
                    "csv",
                    "CSV / feed URL",
                    false,
                    List.of("feedUrl"),
                    List.of("lightspeed", "unknown", "bigcommerce", "wix", "magento"),
                    "Autosync por CSV/URL configurado",
                    "Autosync por CSV — falta feed URL",
                    "Añade feedUrl en feed_config (o feed base URL) con export del catálogo del socio."
            ),
            new PartnerFeedCapability(
                    "shopify",
                    "Shopify Admin API",
                    false,
                    List.of("shopifyAccessToken", "shopifyShopDomain"),
                    List.of("shopify"),
                    "Autosync Shopify (token configurado)",
                    "Shopify — requiere token de admin",
                    "products.json público no basta; configurar shopifyAccessToken en feed_config."
            ),
            new PartnerFeedCapability(
                    "lightspeed",
                    "Lightspeed eCom API",
                    false,
                    List.of("lightspeedApiKey", "lightspeedApiSecret"),
                    List.of("lightspeed"),
                    "Autosync Lightspeed (API configurada)",
                    "Lightspeed — requiere API del comercio",
                    "Usar CSV mientras tanto, o API key Lightspeed en feed_config."
            ),
            new PartnerFeedCapability(
                    "static",
                    "JSON estático (bootstrap)",
                    false,
                    List.of(),
                    List.of(),
                    "Import desde archivo JSON en repo",
                    "JSON estático",
                    "Solo para vendors con slug en resources/vendors/sources/."
            )
    );

    public List<PartnerFeedCapability> all() {
        return CAPABILITIES;
    }

    public Optional<PartnerFeedCapability> find(String feedType) {
        if (feedType == null || feedType.isBlank()) {
            return Optional.empty();
        }
        String key = feedType.trim().toLowerCase(Locale.ROOT);
        return CAPABILITIES.stream().filter(c -> c.feedType().equals(key)).findFirst();
    }

    public String recommendFeedType(String detectedStoreType, boolean wooStoreApiOk) {
        if (wooStoreApiOk) {
            return "woocommerce";
        }
        return switch (detectedStoreType == null ? "unknown" : detectedStoreType) {
            case "woocommerce", "wordpress" -> "woocommerce";
            case "shopify" -> "shopify";
            case "lightspeed" -> "lightspeed";
            default -> "csv";
        };
    }

    public Map<String, Object> buildSyncSupport(
            String recommendedFeedType,
            boolean autosyncReady,
            List<String> missingRequirements) {
        PartnerFeedCapability cap = find(recommendedFeedType).orElse(null);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("recommendedFeedType", recommendedFeedType);
        out.put("autosyncToday", autosyncReady);
        out.put("missingRequirements", missingRequirements == null ? List.of() : missingRequirements);
        if (cap == null) {
            out.put("headline", autosyncReady ? "Autosync disponible" : "Sin autosync automático detectado");
            out.put("detail", "Revisar plataforma y feed_config.");
            return out;
        }
        if (autosyncReady) {
            out.put("headline", cap.autosyncReadyHeadline());
            out.put("detail", "feedType=" + cap.feedType());
        } else {
            out.put("headline", cap.autosyncBlockedHeadline());
            String missing = missingRequirements == null || missingRequirements.isEmpty()
                    ? cap.autosyncBlockedDetail()
                    : cap.autosyncBlockedDetail() + " Falta: " + String.join(", ", missingRequirements) + ".";
            out.put("detail", missing);
        }
        return out;
    }
}
