package com.tarantulapp.service.vendors;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tarantulapp.marketplace.MarketplaceListingCategories;
import com.tarantulapp.service.vendors.woocommerce.GenericWooCommerceCategoryMapper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Admin-only partner viability preview before outreach (no DB writes, no sync).
 */
@Service
public class PartnerReadinessReportService {

    private static final int SAMPLE_SIZE = 50;
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

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("websiteUrl", base);
        out.put("analyzedAt", Instant.now().toString());

        Map<String, Object> platform = new LinkedHashMap<>();
        platform.put("woocommerceStoreApi", probeJsonGet(base + "/wp-json/wc/store/v1/products?per_page=1", "\"id\""));
        platform.put("wordpressRest", probeJsonGet(base + "/wp-json/", "\"name\""));
        platform.put("shopifyProducts", probeJsonGet(base + "/products.json?limit=1", "\"id\""));
        out.put("platform", platform);

        String detected = detectPlatform(platform);
        out.put("detectedPlatform", detected);

        Map<String, Object> catalog = new LinkedHashMap<>();
        List<JsonNode> products = List.of();
        if ("woocommerce".equals(detected)) {
            FetchResult fetch = fetchWooProducts(base, SAMPLE_SIZE);
            products = fetch.products();
            catalog.put("hasCatalog", !products.isEmpty());
            catalog.put("source", "woocommerce_store_api");
            catalog.put("productsSampled", products.size());
            catalog.put("productsTotalEstimate", fetch.totalEstimate());
            catalog.put("fetchDetail", fetch.detail());
        } else if ("shopify".equals(detected)) {
            FetchResult fetch = fetchShopifyProducts(base, SAMPLE_SIZE);
            products = fetch.products();
            catalog.put("hasCatalog", !products.isEmpty());
            catalog.put("source", "shopify_products_json");
            catalog.put("productsSampled", products.size());
            catalog.put("productsTotalEstimate", fetch.totalEstimate());
            catalog.put("fetchDetail", fetch.detail());
            catalog.put("note", "Shopify detectado; autosync actual solo soporta WooCommerce.");
        } else {
            catalog.put("hasCatalog", false);
            catalog.put("source", "none");
            catalog.put("productsSampled", 0);
            catalog.put("productsTotalEstimate", null);
            catalog.put("fetchDetail", "No se encontró catálogo vía Woo Store API ni Shopify products.json");
        }
        out.put("catalog", catalog);

        Map<String, Object> emptyConfig = Map.of();
        Map<String, Object> fitDefault = classifyProducts(products, emptyConfig);
        out.put("fit", fitDefault);

        @SuppressWarnings("unchecked")
        Collection<String> unmappedRaw = (Collection<String>) fitDefault.get("unmappedCategorySlugs");
        Set<String> unmappedSlugs = unmappedRaw == null ? Set.of() : new LinkedHashSet<>(unmappedRaw);
        Map<String, Object> suggestedFeedConfig = suggestFeedConfig(unmappedSlugs);
        out.put("suggestedFeedConfig", suggestedFeedConfig);

        Map<String, Object> fitWithSuggested = null;
        if (!products.isEmpty() && !suggestedFeedConfig.isEmpty()) {
            fitWithSuggested = classifyProducts(products, suggestedFeedConfig);
            out.put("fitWithSuggestedConfig", fitWithSuggested);
        }

        Map<String, Object> categories = new LinkedHashMap<>();
        categories.put("unmappedSlugs", new ArrayList<>(unmappedSlugs));
        categories.put("importableByCategory", fitDefault.get("importableByCategory"));
        out.put("categories", categories);

        String verdict = resolveVerdict(detected, catalog, fitDefault, fitWithSuggested);
        out.put("verdict", verdict);
        out.put("verdictSummary", verdictSummary(verdict, detected, catalog, fitDefault,
                out.containsKey("fitWithSuggestedConfig") ? (Map<String, Object>) out.get("fitWithSuggestedConfig") : null));
        out.put("pitchHints", pitchHints(detected, catalog, fitDefault,
                out.containsKey("fitWithSuggestedConfig") ? (Map<String, Object>) out.get("fitWithSuggestedConfig") : null,
                suggestedFeedConfig));

        return out;
    }

    private Map<String, Object> classifyProducts(List<JsonNode> products, Map<String, Object> feedConfig) {
        int importable = 0;
        int blockedSpecimen = 0;
        int blockedCategory = 0;
        int unmapped = 0;
        Set<String> unmappedSlugs = new LinkedHashSet<>();
        Map<String, Integer> importableByCategory = new LinkedHashMap<>();

        for (JsonNode product : products) {
            ProductFit fit = classifyProduct(product, feedConfig);
            switch (fit.reason()) {
                case IMPORTABLE -> {
                    importable++;
                    importableByCategory.merge(fit.category(), 1, Integer::sum);
                }
                case BLOCKED_SPECIMEN -> blockedSpecimen++;
                case BLOCKED_CATEGORY -> blockedCategory++;
                case UNMAPPED_CATEGORY -> {
                    unmapped++;
                    unmappedSlugs.addAll(fit.categorySlugs());
                }
            }
        }

        int total = products.size();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("totalSampled", total);
        out.put("importable", importable);
        out.put("blockedSpecimen", blockedSpecimen);
        out.put("blockedCategory", blockedCategory);
        out.put("unmappedCategory", unmapped);
        out.put("importablePercent", percent(importable, total));
        out.put("blockedPercent", percent(blockedSpecimen + blockedCategory, total));
        out.put("unmappedPercent", percent(unmapped, total));
        out.put("unmappedCategorySlugs", unmappedSlugs);
        out.put("importableByCategory", importableByCategory);
        return out;
    }

    private ProductFit classifyProduct(JsonNode product, Map<String, Object> feedConfig) {
        GenericWooCommerceCategoryMapper.MappedProduct mapped =
                GenericWooCommerceCategoryMapper.map(product, feedConfig);
        if (mapped != null) {
            return new ProductFit(FitReason.IMPORTABLE, mapped.listingCategory(), Set.of());
        }

        String title = text(product, "name");
        String description = stripHtml(text(product, "short_description"));
        if (PartnerListingCatalogRules.looksLikeBlockedSpecimen(title, description, feedConfig)) {
            return new ProductFit(FitReason.BLOCKED_SPECIMEN, null, Set.of());
        }

        Set<String> slugs = collectCategorySlugs(product);
        if (hasBlockedCategory(slugs, feedConfig)) {
            return new ProductFit(FitReason.BLOCKED_CATEGORY, null, slugs);
        }

        return new ProductFit(FitReason.UNMAPPED_CATEGORY, null, slugs);
    }

    private static boolean hasBlockedCategory(Set<String> slugs, Map<String, Object> feedConfig) {
        Set<String> blocked = PartnerListingCatalogRules.blockedCategorySlugs(feedConfig);
        for (String slug : slugs) {
            if (blocked.contains(slug)) {
                return true;
            }
            for (String blockedSlug : blocked) {
                if (blockedSlug.length() > 4 && slug.contains(blockedSlug)) {
                    return true;
                }
            }
        }
        return false;
    }

    private static Set<String> collectCategorySlugs(JsonNode product) {
        Set<String> out = new LinkedHashSet<>();
        JsonNode categories = product.get("categories");
        if (categories != null && categories.isArray()) {
            for (JsonNode node : categories) {
                String slug = normalizeSlug(text(node, "slug"));
                if (slug != null) {
                    out.add(slug);
                }
            }
        }
        return out;
    }

    private Map<String, Object> suggestFeedConfig(Set<String> unmappedSlugs) {
        Map<String, String> mapping = new LinkedHashMap<>();
        for (String slug : unmappedSlugs) {
            String guessed = guessCategoryForSlug(slug);
            if (guessed != null) {
                mapping.put(slug, guessed);
            }
        }
        if (mapping.isEmpty()) {
            return Map.of();
        }
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("categoryMapping", mapping);
        config.put("allowedCategories", List.of(
                MarketplaceListingCategories.TARANTULAS,
                MarketplaceListingCategories.TERRARIUMS,
                MarketplaceListingCategories.SUBSTRATES,
                MarketplaceListingCategories.LIVE_FOOD,
                MarketplaceListingCategories.SUPPLIES,
                MarketplaceListingCategories.BREEDING_PROJECTS
        ));
        config.put("blockedCategorySlugs", new ArrayList<>(PartnerListingCatalogRules.blockedCategorySlugs(Map.of())));
        config.put("cartHandoffMode", "woocommerce");
        config.put("notes", "Borrador sugerido por Partner readiness preview — revisar antes de promover.");
        return config;
    }

    private static String guessCategoryForSlug(String slug) {
        if (slug == null) {
            return null;
        }
        String s = slug.toLowerCase(Locale.ROOT);
        if (s.contains("tarantula") || s.contains("theraphos") || s.contains("new-world")
                || s.contains("old-world") || s.contains("sling")) {
            return MarketplaceListingCategories.TARANTULAS;
        }
        if (s.contains("terrarium") || s.contains("enclosure") || s.contains("cage")
                || s.contains("vivarium") || s.contains("exo-terra")) {
            return MarketplaceListingCategories.TERRARIUMS;
        }
        if (s.contains("substrate") || s.contains("moss") || s.contains("litter")
                || s.contains("bioactive") || s.contains("isopod") || s.contains("springtail")) {
            return MarketplaceListingCategories.SUBSTRATES;
        }
        if (s.contains("feeder") || s.contains("cricket") || s.contains("roach")
                || s.contains("mealworm") || s.contains("frozen")) {
            return MarketplaceListingCategories.LIVE_FOOD;
        }
        if (s.contains("supply") || s.contains("supplies") || s.contains("heating")
                || s.contains("thermometer") || s.contains("humidity") || s.contains("decor")) {
            return MarketplaceListingCategories.SUPPLIES;
        }
        if (s.contains("breeding") || s.contains("project")) {
            return MarketplaceListingCategories.BREEDING_PROJECTS;
        }
        return null;
    }

    private String detectPlatform(Map<String, Object> platform) {
        if (isProbeOk(platform.get("woocommerceStoreApi"))) {
            return "woocommerce";
        }
        if (isProbeOk(platform.get("shopifyProducts"))) {
            return "shopify";
        }
        if (isProbeOk(platform.get("wordpressRest"))) {
            return "wordpress";
        }
        return "unknown";
    }

    @SuppressWarnings("unchecked")
    private static boolean isProbeOk(Object probe) {
        return probe instanceof Map<?, ?> map && Boolean.TRUE.equals(map.get("ok"));
    }

    private String resolveVerdict(String platform, Map<String, Object> catalog,
                                  Map<String, Object> fit,
                                  Map<String, Object> fitWithSuggested) {
        boolean hasCatalog = Boolean.TRUE.equals(catalog.get("hasCatalog"));
        if (!"woocommerce".equals(platform)) {
            if (hasCatalog && "shopify".equals(platform)) {
                return "shopify_no_autosync";
            }
            return hasCatalog ? "unknown_platform" : "no_catalog";
        }
        if (!hasCatalog) {
            return "no_catalog";
        }
        int importable = intVal(fit.get("importable"));
        int total = intVal(fit.get("totalSampled"));
        if (total == 0) {
            return "no_catalog";
        }
        double importablePct = intVal(fit.get("importablePercent"));
        if (importablePct >= 70) {
            return "ready";
        }
        if (fitWithSuggested != null) {
            double withConfig = intVal(fitWithSuggested.get("importablePercent"));
            if (withConfig >= 55 && withConfig > importablePct + 10) {
                return "needs_feed_config";
            }
        }
        if (importablePct >= 40) {
            return "needs_feed_config";
        }
        return "low_fit";
    }

    private static String verdictSummary(String verdict, String platform, Map<String, Object> catalog,
                                         Map<String, Object> fit, Map<String, Object> fitWithSuggested) {
        int sampled = intVal(catalog.get("productsSampled"));
        Integer totalEst = catalog.get("productsTotalEstimate") instanceof Number n ? n.intValue() : null;
        int importable = intVal(fit.get("importable"));
        int importablePct = intVal(fit.get("importablePercent"));

        String sizeHint = totalEst != null && totalEst > sampled
                ? " (~" + totalEst + " en tienda, muestra " + sampled + ")"
                : " (muestra " + sampled + ")";

        return switch (verdict) {
            case "ready" -> "WooCommerce con catálogo" + sizeHint + ". ~" + importablePct + "% importable ("
                    + importable + " de " + sampled + ") con reglas por defecto — buen candidato para Official Partner + autosync.";
            case "needs_feed_config" -> {
                int withConfig = fitWithSuggested == null ? importablePct : intVal(fitWithSuggested.get("importablePercent"));
                yield "WooCommerce con catálogo" + sizeHint + ". Fit inicial " + importablePct + "%, mejora estimada ~"
                        + withConfig + "% con feed_config sugerido — viable con mapping custom (tipo Monarch).";
            }
            case "low_fit" -> "WooCommerce con catálogo" + sizeHint + ", pero solo ~" + importablePct
                    + "% encaja con categorías TarantulApp — catálogo muy mixto o fuera de nicho.";
            case "no_catalog" -> "No se pudo leer catálogo público (API bloqueada, vacía o URL incorrecta).";
            case "shopify_no_autosync" -> "Shopify detectado" + sizeHint + " — catálogo visible, pero hoy solo autosync WooCommerce.";
            case "unknown_platform" -> "Catálogo no confirmado vía Woo/Shopify — investigar manualmente antes del pitch.";
            default -> "Plataforma: " + platform + ", catálogo: " + (Boolean.TRUE.equals(catalog.get("hasCatalog")) ? "sí" : "no");
        };
    }

    private static List<String> pitchHints(String platform, Map<String, Object> catalog,
                                           Map<String, Object> fit, Map<String, Object> fitWithSuggested,
                                           Map<String, Object> suggestedFeedConfig) {
        List<String> hints = new ArrayList<>();
        if ("woocommerce".equals(platform) && Boolean.TRUE.equals(catalog.get("hasCatalog"))) {
            hints.add("Mencionar espejo de catálogo + badge Official Partner; sync vía Woo Store API sin contraseñas si la API pública está abierta.");
        }
        int unmapped = intVal(fit.get("unmappedCategory"));
        if (unmapped > 0) {
            hints.add(unmapped + " productos en la muestra sin categoría mapeada — llevar propuesta de mapping (ver feed_config sugerido).");
        }
        int blocked = intVal(fit.get("blockedSpecimen")) + intVal(fit.get("blockedCategory"));
        if (blocked > 0) {
            hints.add(blocked + " ítems filtrados (reptiles/otros invertebrados) — normal; el catálogo en app será subset del nicho tarántulas.");
        }
        if (fitWithSuggested != null && intVal(fitWithSuggested.get("importablePercent")) > intVal(fit.get("importablePercent"))) {
            hints.add("Con feed_config custom el import sube a ~" + intVal(fitWithSuggested.get("importablePercent")) + "%.");
        }
        if ("shopify".equals(platform)) {
            hints.add("No prometer autosync en la llamada; ofrecer vitrina manual o roadmap si encaja estratégicamente.");
        }
        if (suggestedFeedConfig != null && suggestedFeedConfig.containsKey("categoryMapping")) {
            hints.add("Adjuntar internamente el JSON de feed_config sugerido al promover en admin.");
        }
        if (hints.isEmpty()) {
            hints.add("Validar URL, país de envío y mix de catálogo antes del correo de outreach.");
        }
        return hints;
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
            out.put("status", ok ? "reachable" : (code == 403 || code == 429 ? "blocked" : "failed"));
            out.put("detail", ok ? "OK" : summarizeHttpFailure(code, body));
        } catch (Exception ex) {
            out.put("ok", false);
            out.put("status", "error");
            out.put("detail", ex.getMessage() == null ? "Request failed" : ex.getMessage());
        }
        return out;
    }

    private static String summarizeHttpFailure(int code, String body) {
        if (code == 403) {
            return "HTTP 403 — posible Cloudflare o API deshabilitada";
        }
        if (code == 429) {
            return "HTTP 429 — rate limit";
        }
        if (body != null && body.toLowerCase(Locale.ROOT).contains("cloudflare")) {
            return "HTTP " + code + " — respuesta sugiere Cloudflare";
        }
        return "HTTP " + code;
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
                return new FetchResult(List.of(), null, "Unexpected JSON shape");
            }
            List<JsonNode> products = new ArrayList<>();
            for (JsonNode node : root) {
                products.add(node);
                if (products.size() >= limit) {
                    break;
                }
            }
            Integer total = parseTotalHeader(response);
            return new FetchResult(products, total, products.isEmpty() ? "Array vacío" : "OK");
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
                return new FetchResult(List.of(), null, "No products array");
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

    /** Minimal Woo-shaped node so GenericWooCommerceCategoryMapper can run on Shopify samples. */
    private JsonNode normalizeShopifyProduct(JsonNode shopify) {
        Map<String, Object> wrapper = new LinkedHashMap<>();
        wrapper.put("name", text(shopify, "title"));
        wrapper.put("short_description", text(shopify, "body_html"));
        List<Map<String, String>> categories = new ArrayList<>();
        categories.add(Map.of("slug", "shopify-product"));
        String ptype = text(shopify, "product_type");
        if (ptype != null && !ptype.isBlank()) {
            categories.add(Map.of("slug", ptype.toLowerCase(Locale.ROOT).replace(' ', '-')));
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

    private static int percent(int part, int total) {
        if (total <= 0) {
            return 0;
        }
        return (int) Math.round(100.0 * part / total);
    }

    private static int intVal(Object value) {
        if (value instanceof Number n) {
            return n.intValue();
        }
        return 0;
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

    private static String stripHtml(String raw) {
        if (raw == null) {
            return null;
        }
        return raw.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
    }

    private static String normalizeSlug(String slug) {
        if (slug == null) {
            return null;
        }
        String s = slug.trim().toLowerCase(Locale.ROOT);
        return s.isEmpty() ? null : s;
    }

    private enum FitReason { IMPORTABLE, BLOCKED_SPECIMEN, BLOCKED_CATEGORY, UNMAPPED_CATEGORY }

    private record ProductFit(FitReason reason, String category, Set<String> categorySlugs) {}

    private record FetchResult(List<JsonNode> products, Integer totalEstimate, String detail) {}
}
