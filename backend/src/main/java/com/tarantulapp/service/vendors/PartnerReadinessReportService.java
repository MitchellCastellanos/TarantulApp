package com.tarantulapp.service.vendors;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tarantulapp.service.vendors.woocommerce.GenericWooCommerceCategoryMapper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Admin store preview before partner outreach: platform, product counts, categories (facts only).
 */
@Service
public class PartnerReadinessReportService {

    private static final int SAMPLE_SIZE = 50;
    private static final int SAMPLE_NAMES = 10;
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(8);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(15);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public PartnerReadinessReportService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public Map<String, Object> analyze(String websiteUrl) {
        String base = trimTrailingSlash(websiteUrl);
        if (base == null || base.isBlank()) {
            throw new IllegalArgumentException("WEBSITE_URL_REQUIRED");
        }

        Map<String, Object> wooProbe = probeJsonGet(base + "/wp-json/wc/store/v1/products?per_page=1", "\"id\"");
        Map<String, Object> shopifyProbe = probeJsonGet(base + "/products.json?limit=1", "\"id\"");
        Map<String, Object> wpProbe = probeJsonGet(base + "/wp-json/", "\"name\"");

        String storeType = detectStoreType(wooProbe, shopifyProbe, wpProbe);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("websiteUrl", base);
        out.put("previewedAt", Instant.now().toString());
        out.put("storeType", storeType);
        out.put("storeTypeLabel", storeTypeLabel(storeType));
        out.put("autosyncSupportedToday", "woocommerce".equals(storeType));
        out.put("api", Map.of(
                "woocommerceStoreApi", wooProbe,
                "shopifyProductsJson", shopifyProbe,
                "wordpressRest", wpProbe
        ));

        List<JsonNode> products = List.of();
        Integer totalEstimate = null;
        String fetchDetail = "";
        String dataSource = "none";

        if ("woocommerce".equals(storeType)) {
            FetchResult fetch = fetchWooProducts(base, SAMPLE_SIZE);
            products = fetch.products();
            totalEstimate = fetch.totalEstimate();
            fetchDetail = fetch.detail();
            dataSource = "woocommerce_store_api";
        } else if ("shopify".equals(storeType)) {
            FetchResult fetch = fetchShopifyProducts(base, SAMPLE_SIZE);
            products = fetch.products();
            totalEstimate = fetch.totalEstimate();
            fetchDetail = fetch.detail();
            dataSource = "shopify_products_json";
        }

        Map<String, Object> productsBlock = new LinkedHashMap<>();
        productsBlock.put("found", !products.isEmpty());
        productsBlock.put("countInSample", products.size());
        productsBlock.put("countTotalEstimate", totalEstimate);
        productsBlock.put("dataSource", dataSource);
        productsBlock.put("fetchDetail", fetchDetail);
        out.put("products", productsBlock);

        List<Map<String, Object>> storeCategories = summarizeStoreCategories(products);
        out.put("storeCategories", storeCategories);

        Map<String, Integer> appCategoryCounts = summarizeAppCategoryCounts(products);
        if (!appCategoryCounts.isEmpty()) {
            out.put("appCategoryCounts", appCategoryCounts);
        }

        out.put("sampleProductNames", sampleProductNames(products, SAMPLE_NAMES));

        out.put("checklistNotes", buildChecklistNotes(storeType, wooProbe, productsBlock, storeCategories));

        out.put("summaryLine", buildSummaryLine(storeType, productsBlock, storeCategories, totalEstimate));

        return out;
    }

    private static List<Map<String, Object>> summarizeStoreCategories(List<JsonNode> products) {
        Map<String, CategoryAgg> bySlug = new LinkedHashMap<>();
        for (JsonNode product : products) {
            JsonNode categories = product.get("categories");
            if (categories == null || !categories.isArray()) {
                continue;
            }
            for (JsonNode cat : categories) {
                String slug = normalizeSlug(text(cat, "slug"));
                if (slug == null) {
                    continue;
                }
                CategoryAgg agg = bySlug.computeIfAbsent(slug, s -> new CategoryAgg(s, text(cat, "name")));
                agg.productCount++;
            }
        }
        return bySlug.values().stream()
                .sorted(Comparator.comparingInt((CategoryAgg a) -> a.productCount).reversed())
                .map(a -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("slug", a.slug);
                    row.put("name", a.name == null ? a.slug : a.name);
                    row.put("productCount", a.productCount);
                    return row;
                })
                .toList();
    }

    private static Map<String, Integer> summarizeAppCategoryCounts(List<JsonNode> products) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        Map<String, Object> emptyConfig = Map.of();
        for (JsonNode product : products) {
            GenericWooCommerceCategoryMapper.MappedProduct mapped =
                    GenericWooCommerceCategoryMapper.map(product, emptyConfig);
            if (mapped != null && mapped.listingCategory() != null) {
                counts.merge(mapped.listingCategory(), 1, Integer::sum);
            }
        }
        return counts;
    }

    private static List<String> sampleProductNames(List<JsonNode> products, int max) {
        List<String> names = new ArrayList<>();
        for (JsonNode product : products) {
            String name = text(product, "name");
            if (name != null) {
                names.add(name);
            }
            if (names.size() >= max) {
                break;
            }
        }
        return names;
    }

    private static Map<String, String> buildChecklistNotes(String storeType,
                                                         Map<String, Object> wooProbe,
                                                         Map<String, Object> products,
                                                         List<Map<String, Object>> storeCategories) {
        Map<String, String> notes = new LinkedHashMap<>();
        boolean wooApi = Boolean.TRUE.equals(wooProbe.get("ok"));
        notes.put("wooCommerce", wooApi
                ? "Woo Store API pública responde — encaja con checklist autosync."
                : ("woocommerce".equals(storeType) ? "Woo detectado pero API no legible en preview." : "No Woo Store API en esta URL."));
        int sample = products.get("countInSample") instanceof Number n ? n.intValue() : 0;
        notes.put("catalogRelevant", sample > 0
                ? sample + " productos en muestra — revisa categorías abajo (tú marcas si encaja con tarántulas / feeders / equipo)."
                : "Sin productos leídos vía API pública.");
        notes.put("shippingFit", "No detectable desde URL — confirmar en llamada / web.");
        notes.put("syncPath", switch (storeType) {
            case "woocommerce" -> "Autosync WooCommerce soportado hoy (feedType=woocommerce + feed_config).";
            case "shopify" -> "Shopify visible; autosync Woo no aplica — otro camino o manual.";
            case "wordpress" -> "WordPress sin catálogo Woo en preview — investigar plugin/tienda.";
            default -> "Plataforma no clara — revisar manualmente antes del pitch.";
        });
        if (!storeCategories.isEmpty()) {
            List<String> top = storeCategories.stream().limit(6)
                    .map(c -> String.valueOf(c.get("slug")))
                    .toList();
            notes.put("categoriesSeen", String.join(", ", top));
        }
        return notes;
    }

    private static String buildSummaryLine(String storeType,
                                           Map<String, Object> products,
                                           List<Map<String, Object>> storeCategories,
                                           Integer totalEstimate) {
        int sample = products.get("countInSample") instanceof Number n ? n.intValue() : 0;
        String countPart = totalEstimate != null && totalEstimate > sample
                ? sample + " en muestra / ~" + totalEstimate + " en tienda"
                : String.valueOf(sample) + " en muestra";
        String cats = storeCategories.isEmpty()
                ? "sin categorías en muestra"
                : storeCategories.size() + " categorías Woo (" + storeCategories.stream().limit(4)
                        .map(c -> String.valueOf(c.get("slug"))).reduce((a, b) -> a + ", " + b).orElse("") + ")";
        return storeTypeLabel(storeType) + " · " + countPart + " · " + cats;
    }

    private static String storeTypeLabel(String storeType) {
        return switch (storeType) {
            case "woocommerce" -> "WooCommerce";
            case "shopify" -> "Shopify";
            case "wordpress" -> "WordPress";
            default -> "Desconocida";
        };
    }

    private static String detectStoreType(Map<String, Object> wooProbe,
                                          Map<String, Object> shopifyProbe,
                                          Map<String, Object> wpProbe) {
        if (Boolean.TRUE.equals(wooProbe.get("ok"))) {
            return "woocommerce";
        }
        if (Boolean.TRUE.equals(shopifyProbe.get("ok"))) {
            return "shopify";
        }
        if (Boolean.TRUE.equals(wpProbe.get("ok"))) {
            return "wordpress";
        }
        return "unknown";
    }

    private Map<String, Object> probeJsonGet(String url, String successMarker) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("probeUrl", url);
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(REQUEST_TIMEOUT)
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            int code = response.statusCode();
            String body = response.body() == null ? "" : response.body();
            boolean ok = code >= 200 && code < 300 && body.contains(successMarker);
            out.put("httpStatus", code);
            out.put("ok", ok);
            out.put("detail", ok ? "OK" : summarizeHttpFailure(code, body));
        } catch (Exception ex) {
            out.put("ok", false);
            out.put("httpStatus", null);
            out.put("detail", ex.getMessage() == null ? "Request failed" : ex.getMessage());
        }
        return out;
    }

    private static String summarizeHttpFailure(int code, String body) {
        if (code == 403) {
            return "HTTP 403 — posible Cloudflare o API cerrada";
        }
        if (code == 429) {
            return "HTTP 429 — rate limit";
        }
        if (body != null && body.toLowerCase(Locale.ROOT).contains("cloudflare")) {
            return "HTTP " + code + " — Cloudflare";
        }
        return code > 0 ? "HTTP " + code : "Sin respuesta";
    }

    private FetchResult fetchWooProducts(String base, int limit) {
        String url = base + "/wp-json/wc/store/v1/products?per_page=" + Math.min(limit, 100);
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(REQUEST_TIMEOUT)
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return new FetchResult(List.of(), null, "HTTP " + response.statusCode());
            }
            JsonNode root = objectMapper.readTree(response.body());
            if (!root.isArray()) {
                return new FetchResult(List.of(), null, "JSON inesperado");
            }
            List<JsonNode> products = new ArrayList<>();
            for (JsonNode node : root) {
                products.add(node);
                if (products.size() >= limit) {
                    break;
                }
            }
            Integer total = parseTotalHeader(response);
            return new FetchResult(products, total, products.isEmpty() ? "Sin productos" : "OK");
        } catch (Exception ex) {
            return new FetchResult(List.of(), null, ex.getMessage());
        }
    }

    private FetchResult fetchShopifyProducts(String base, int limit) {
        String url = base + "/products.json?limit=" + Math.min(limit, 250);
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(REQUEST_TIMEOUT)
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return new FetchResult(List.of(), null, "HTTP " + response.statusCode());
            }
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode productsNode = root.get("products");
            if (productsNode == null || !productsNode.isArray()) {
                return new FetchResult(List.of(), null, "Sin array products");
            }
            List<JsonNode> normalized = new ArrayList<>();
            for (JsonNode shopify : productsNode) {
                normalized.add(normalizeShopifyProduct(shopify));
                if (normalized.size() >= limit) {
                    break;
                }
            }
            return new FetchResult(normalized, productsNode.size(), normalized.isEmpty() ? "Sin productos" : "OK");
        } catch (Exception ex) {
            return new FetchResult(List.of(), null, ex.getMessage());
        }
    }

    private JsonNode normalizeShopifyProduct(JsonNode shopify) {
        Map<String, Object> wrapper = new LinkedHashMap<>();
        wrapper.put("name", text(shopify, "title"));
        wrapper.put("short_description", text(shopify, "body_html"));
        List<Map<String, String>> categories = new ArrayList<>();
        String ptype = text(shopify, "product_type");
        if (ptype != null && !ptype.isBlank()) {
            String slug = ptype.toLowerCase(Locale.ROOT).replace(' ', '-');
            categories.add(Map.of("slug", slug, "name", ptype));
        } else {
            categories.add(Map.of("slug", "shopify-product", "name", "Product"));
        }
        wrapper.put("categories", categories);
        return objectMapper.valueToTree(wrapper);
    }

    private static Integer parseTotalHeader(HttpResponse<?> response) {
        Optional<String> header = response.headers().firstValue("x-wp-total");
        return header.flatMap(PartnerReadinessReportService::parseInt).orElse(null);
    }

    private static Optional<Integer> parseInt(String raw) {
        try {
            return Optional.of(Integer.parseInt(raw.trim()));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    private static String trimTrailingSlash(String url) {
        if (url == null) {
            return null;
        }
        String t = url.trim();
        while (t.endsWith("/")) {
            t = t.substring(0, t.length() - 1);
        }
        return t;
    }

    private static String text(JsonNode node, String field) {
        if (node == null) {
            return null;
        }
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        String text = value.asText().trim();
        return text.isEmpty() ? null : text;
    }

    private static String normalizeSlug(String slug) {
        if (slug == null) {
            return null;
        }
        String s = slug.trim().toLowerCase(Locale.ROOT);
        return s.isEmpty() ? null : s;
    }

    private static final class CategoryAgg {
        final String slug;
        final String name;
        int productCount;

        CategoryAgg(String slug, String name) {
            this.slug = slug;
            this.name = name;
        }
    }

    private record FetchResult(List<JsonNode> products, Integer totalEstimate, String detail) {}
}
