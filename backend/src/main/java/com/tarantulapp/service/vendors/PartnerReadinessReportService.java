package com.tarantulapp.service.vendors;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tarantulapp.service.vendors.capabilities.PartnerFeedReadinessEvaluator;
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
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(20);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final PartnerFeedReadinessEvaluator feedReadinessEvaluator;

    public PartnerReadinessReportService(
            ObjectMapper objectMapper,
            PartnerFeedReadinessEvaluator feedReadinessEvaluator) {
        this.objectMapper = objectMapper;
        this.feedReadinessEvaluator = feedReadinessEvaluator;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public Map<String, Object> analyze(String websiteUrl) {
        return analyze(websiteUrl, null, null);
    }

    public Map<String, Object> analyze(String websiteUrl, String optionalFeedUrl, Map<String, Object> vendorFeedConfig) {
        String storeOrigin = resolveStoreOrigin(websiteUrl);
        if (storeOrigin == null || storeOrigin.isBlank()) {
            throw new IllegalArgumentException("WEBSITE_URL_REQUIRED");
        }

        Map<String, Object> wooProbe = probeJsonGet(storeOrigin + "/wp-json/wc/store/v1/products?per_page=1", "\"id\"");
        Map<String, Object> shopifyProbe = probeJsonGet(storeOrigin + "/products.json?limit=1", "\"id\"");
        Map<String, Object> wpProbe = probeJsonGet(storeOrigin + "/wp-json/", "\"name\"");

        String homepageHtml = fetchHtml(storeOrigin + "/");
        String htmlPlatform = StoreHtmlPlatformProbe.detect(homepageHtml);
        StoreSitemapCatalogProbe.SitemapCatalogSnapshot sitemap = fetchAndParseSitemap(storeOrigin);

        String storeType = detectStoreType(wooProbe, shopifyProbe, wpProbe, htmlPlatform, sitemap);
        boolean wooApiOk = Boolean.TRUE.equals(wooProbe.get("ok"));
        Map<String, Object> feedReadiness = feedReadinessEvaluator.evaluate(
                storeType, wooApiOk, optionalFeedUrl, vendorFeedConfig);
        boolean autosyncToday = Boolean.TRUE.equals(feedReadiness.get("autosyncSupportedToday"));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("websiteUrl", websiteUrl.trim());
        out.put("storeOrigin", storeOrigin);
        out.put("previewedAt", Instant.now().toString());
        out.put("storeType", storeType);
        out.put("storeTypeLabel", storeTypeLabel(storeType));
        out.put("autosyncSupportedToday", autosyncToday);
        out.put("recommendedFeedType", feedReadiness.get("recommendedFeedType"));
        out.put("activeFeedType", feedReadiness.get("activeFeedType"));
        out.put("missingRequirements", feedReadiness.get("missingRequirements"));
        out.put("syncSupport", feedReadiness.get("syncSupport"));
        out.put("csvFeedProbe", feedReadiness.get("csvFeedProbe"));
        out.put("api", Map.of(
                "woocommerceStoreApi", wooProbe,
                "shopifyProductsJson", shopifyProbe,
                "wordpressRest", wpProbe
        ));

        List<JsonNode> products = List.of();
        Integer totalEstimate = null;
        String fetchDetail = "";
        String dataSource = "none";

        if ("woocommerce".equals(storeType) && wooApiOk) {
            FetchResult fetch = fetchWooProducts(storeOrigin, SAMPLE_SIZE);
            products = fetch.products();
            totalEstimate = fetch.totalEstimate();
            fetchDetail = fetch.detail();
            dataSource = "woocommerce_store_api";
        } else if ("shopify".equals(storeType) && Boolean.TRUE.equals(shopifyProbe.get("ok"))) {
            FetchResult fetch = fetchShopifyProducts(storeOrigin, SAMPLE_SIZE);
            products = fetch.products();
            totalEstimate = fetch.totalEstimate();
            fetchDetail = fetch.detail();
            dataSource = "shopify_products_json";
        }

        Map<String, Object> productsBlock = new LinkedHashMap<>();
        List<Map<String, Object>> storeCategories;

        if (!products.isEmpty()) {
            productsBlock.put("found", true);
            productsBlock.put("countInSample", products.size());
            productsBlock.put("countTotalEstimate", totalEstimate);
            productsBlock.put("dataSource", dataSource);
            productsBlock.put("fetchDetail", fetchDetail);
            storeCategories = summarizeStoreCategories(products);
            out.put("sampleProductNames", sampleProductNames(products, SAMPLE_NAMES));
        } else if (sitemap.found()) {
            productsBlock.put("found", true);
            productsBlock.put("countInSample", null);
            productsBlock.put("countTotalEstimate", sitemap.productCountEstimate());
            productsBlock.put("dataSource", "sitemap");
            productsBlock.put("fetchDetail", "Catálogo estimado desde sitemap.xml (sin API de productos pública)");
            productsBlock.put("sitemapUrlCount", sitemap.totalUrlCount());
            storeCategories = sitemap.storeCategories();
            out.put("sampleProductNames", sitemap.sampleProductNames());
            mergeCsvProbeIntoProducts(productsBlock, feedReadiness);
        } else {
            productsBlock.put("found", false);
            productsBlock.put("countInSample", 0);
            productsBlock.put("countTotalEstimate", null);
            productsBlock.put("dataSource", dataSource);
            productsBlock.put("fetchDetail", fetchDetail.isBlank() ? "Sin API ni sitemap legible" : fetchDetail);
            storeCategories = List.of();
            out.put("sampleProductNames", List.of());
        }
        out.put("products", productsBlock);
        out.put("storeCategories", storeCategories);

        Map<String, Integer> appCategoryCounts = summarizeAppCategoryCounts(products);
        if (!appCategoryCounts.isEmpty()) {
            out.put("appCategoryCounts", appCategoryCounts);
        }

        out.put("checklistNotes", buildChecklistNotes(storeType, autosyncToday, wooProbe, productsBlock, storeCategories));
        out.put("summaryLine", buildSummaryLine(storeType, autosyncToday, productsBlock, storeCategories));

        return out;
    }

    private static String resolveStoreOrigin(String websiteUrl) {
        String trimmed = trimTrailingSlash(websiteUrl);
        if (trimmed == null || trimmed.isBlank()) {
            return null;
        }
        try {
            URI uri = URI.create(trimmed);
            if (uri.getScheme() == null || uri.getHost() == null) {
                uri = URI.create("https://" + trimmed);
            }
            String scheme = uri.getScheme() == null ? "https" : uri.getScheme();
            String host = uri.getHost();
            int port = uri.getPort();
            if (port > 0 && port != 80 && port != 443) {
                return scheme + "://" + host + ":" + port;
            }
            return scheme + "://" + host;
        } catch (Exception ex) {
            return trimmed;
        }
    }

    private StoreSitemapCatalogProbe.SitemapCatalogSnapshot fetchAndParseSitemap(String storeOrigin) {
        String xml = fetchHtml(storeOrigin + "/sitemap.xml");
        if (xml == null || !xml.contains("<loc>")) {
            return StoreSitemapCatalogProbe.SitemapCatalogSnapshot.empty("sitemap.xml no disponible");
        }
        return StoreSitemapCatalogProbe.parse(xml, storeOrigin);
    }

    private String fetchHtml(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(REQUEST_TIMEOUT)
                    .header("Accept", "text/html,application/xml,text/xml,*/*")
                    .header("User-Agent", "TarantulApp-PartnerPreview/1.0")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return response.body();
            }
        } catch (Exception ignored) {
            // fall through
        }
        return "";
    }

    @SuppressWarnings("unchecked")
    private static void mergeCsvProbeIntoProducts(Map<String, Object> productsBlock, Map<String, Object> feedReadiness) {
        Object raw = feedReadiness.get("csvFeedProbe");
        if (!(raw instanceof Map<?, ?> probe) || !Boolean.TRUE.equals(probe.get("ok"))) {
            return;
        }
        Object rowCount = probe.get("rowCount");
        if (rowCount instanceof Number n && n.intValue() > 0) {
            productsBlock.put("countTotalEstimate", n.intValue());
            productsBlock.put("dataSource", "csv_feed");
            productsBlock.put("fetchDetail", "CSV/feed URL legible — listo para feedType=csv");
        }
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
        return toCategoryRows(bySlug);
    }

    private static List<Map<String, Object>> toCategoryRows(Map<String, CategoryAgg> bySlug) {
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
                                                           boolean autosyncToday,
                                                           Map<String, Object> wooProbe,
                                                           Map<String, Object> products,
                                                           List<Map<String, Object>> storeCategories) {
        Map<String, String> notes = new LinkedHashMap<>();
        notes.put("wooCommerce", autosyncToday
                ? "Woo Store API pública — autosync posible hoy."
                : ("lightspeed".equals(storeType)
                ? "Lightspeed (no Woo Store API). No marcar autosync en pitch."
                : "Woo Store API no responde en esta URL."));
        Object estimate = products.get("countTotalEstimate");
        boolean found = Boolean.TRUE.equals(products.get("found"));
        String source = String.valueOf(products.getOrDefault("dataSource", ""));
        notes.put("catalogRelevant", found && estimate != null
                ? "Catálogo estimado: " + estimate + ("sitemap".equals(source) ? " (vía sitemap)" : " (API)")
                + " — tú validas nicho tarántulas / feeders / equipo."
                : (found ? "Catálogo parcial en preview — revisar web." : "Sin catálogo legible en preview."));
        notes.put("shippingFit", "No detectable desde URL — confirmar en llamada.");
        notes.put("syncPath", autosyncToday
                ? "Autosync según feed configurado (Woo o CSV)."
                : ("lightspeed".equals(storeType)
                ? "Recomendado: feedType=csv + feedUrl al export del socio."
                : "Definir feedType y credenciales según plataforma."));
        if (!storeCategories.isEmpty()) {
            List<String> top = storeCategories.stream().limit(8)
                    .map(c -> String.valueOf(c.get("slug")))
                    .toList();
            notes.put("categoriesSeen", String.join(", ", top));
        }
        return notes;
    }

    private static String buildSummaryLine(String storeType,
                                           boolean autosyncToday,
                                           Map<String, Object> products,
                                           List<Map<String, Object>> storeCategories) {
        Integer total = products.get("countTotalEstimate") instanceof Number n ? n.intValue() : null;
        Object sample = products.get("countInSample");
        String countPart;
        if (total != null && total > 0) {
            countPart = sample instanceof Number s && s.intValue() > 0
                    ? s.intValue() + " en muestra / ~" + total + " estimados"
                    : "~" + total + " productos (estimado)";
        } else {
            countPart = "sin conteo de productos";
        }
        String syncPart = autosyncToday ? "autosync Woo sí" : "autosync Woo no";
        String cats = storeCategories.isEmpty()
                ? "sin categorías listadas"
                : storeCategories.size() + " categorías/nav";
        return storeTypeLabel(storeType) + " · " + countPart + " · " + syncPart + " · " + cats;
    }

    private static String storeTypeLabel(String storeType) {
        return switch (storeType) {
            case "woocommerce" -> "WooCommerce";
            case "shopify" -> "Shopify";
            case "lightspeed" -> "Lightspeed eCom";
            case "wordpress" -> "WordPress";
            case "bigcommerce" -> "BigCommerce";
            case "squarespace" -> "Squarespace";
            case "wix" -> "Wix";
            case "magento" -> "Magento";
            default -> "Desconocida";
        };
    }

    private static String detectStoreType(Map<String, Object> wooProbe,
                                          Map<String, Object> shopifyProbe,
                                          Map<String, Object> wpProbe,
                                          String htmlPlatform,
                                          StoreSitemapCatalogProbe.SitemapCatalogSnapshot sitemap) {
        if (Boolean.TRUE.equals(wooProbe.get("ok"))) {
            return "woocommerce";
        }
        if (Boolean.TRUE.equals(shopifyProbe.get("ok"))) {
            return "shopify";
        }
        if ("woocommerce".equals(htmlPlatform)) {
            return "woocommerce";
        }
        if ("shopify".equals(htmlPlatform)) {
            return "shopify";
        }
        if ("lightspeed".equals(htmlPlatform)) {
            return "lightspeed";
        }
        if (sitemap.found() && sitemap.productCountEstimate() > 0) {
            // Heuristic: Mini Beasts style URLs → Lightspeed
            if (sitemap.sampleProductNames().isEmpty() || htmlPlatform == null) {
                return "lightspeed";
            }
        }
        if (htmlPlatform != null && !htmlPlatform.isBlank()) {
            return htmlPlatform;
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
