package com.tarantulapp.service.vendors.csv;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class ShopifyPartnerFeedProbe {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public ShopifyPartnerFeedProbe(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(8))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public Map<String, Object> probe(String shopDomain, String accessToken) {
        String shop = normalizeShopDomain(shopDomain);
        if (shop == null || accessToken == null || accessToken.isBlank()) {
            return Map.of("ok", false, "detail", "shopifyShopDomain y shopifyAccessToken requeridos");
        }
        String url = "https://" + shop + "/admin/api/2024-10/products.json?limit=5";
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(20))
                    .header("X-Shopify-Access-Token", accessToken.trim())
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return Map.of("ok", false, "httpStatus", response.statusCode(),
                        "detail", "HTTP " + response.statusCode());
            }
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode products = root.get("products");
            int count = products != null && products.isArray() ? products.size() : 0;
            List<String> samples = new java.util.ArrayList<>();
            if (products != null && products.isArray()) {
                for (JsonNode p : products) {
                    if (p.has("title")) {
                        samples.add(p.get("title").asText());
                    }
                    if (samples.size() >= 5) {
                        break;
                    }
                }
            }
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("ok", count > 0);
            out.put("rowCount", count);
            out.put("sampleTitles", samples);
            out.put("detail", count > 0 ? "OK" : "Sin productos en respuesta");
            return out;
        } catch (Exception ex) {
            return Map.of("ok", false, "detail", ex.getMessage() == null ? "Error Shopify" : ex.getMessage());
        }
    }

    public static String normalizeShopDomain(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String s = raw.trim().toLowerCase(Locale.ROOT)
                .replace("https://", "")
                .replace("http://", "");
        int slash = s.indexOf('/');
        if (slash > 0) {
            s = s.substring(0, slash);
        }
        if (!s.contains(".") && !s.isBlank()) {
            s = s + ".myshopify.com";
        }
        return s.isBlank() ? null : s;
    }
}
