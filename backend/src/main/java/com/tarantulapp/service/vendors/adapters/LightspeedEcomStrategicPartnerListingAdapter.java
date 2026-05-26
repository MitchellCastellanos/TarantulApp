package com.tarantulapp.service.vendors.adapters;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.marketplace.MarketplaceListingCategories;
import com.tarantulapp.service.vendors.PartnerListingCatalogRules;
import com.tarantulapp.service.vendors.sources.StrategicVendorRawListing;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
@Order(15)
public class LightspeedEcomStrategicPartnerListingAdapter implements StrategicPartnerListingAdapter {

    private static final Logger log = LoggerFactory.getLogger(LightspeedEcomStrategicPartnerListingAdapter.class);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final boolean enabled;
    private final int maxPages;

    public LightspeedEcomStrategicPartnerListingAdapter(
            ObjectMapper objectMapper,
            @Value("${app.partner-sync.adapters.lightspeed.enabled:true}") boolean enabled,
            @Value("${app.partner-sync.adapters.lightspeed.max-pages:40}") int maxPages) {
        this.objectMapper = objectMapper;
        this.enabled = enabled;
        this.maxPages = Math.max(1, Math.min(maxPages, 80));
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    @Override
    public boolean supports(OfficialVendor vendor) {
        if (!enabled || vendor == null) {
            return false;
        }
        String feedType = vendor.getFeedType();
        if (feedType == null) {
            return false;
        }
        String t = feedType.trim().toLowerCase(Locale.ROOT);
        if (!"lightspeed".equals(t) && !"lightspeed_ecom".equals(t)) {
            return false;
        }
        Map<String, Object> config = vendor.getFeedConfig();
        return config != null
                && !stringVal(config, "lightspeedApiKey").isBlank()
                && !stringVal(config, "lightspeedApiSecret").isBlank();
    }

    @Override
    public List<StrategicVendorRawListing> fetch(OfficialVendor vendor) {
        Map<String, Object> config = vendor.getFeedConfig() == null ? Map.of() : vendor.getFeedConfig();
        String apiKey = stringVal(config, "lightspeedApiKey");
        String apiSecret = stringVal(config, "lightspeedApiSecret");
        if (apiKey.isBlank() || apiSecret.isBlank()) {
            return List.of();
        }
        String lang = stringVal(config, "lightspeedLang").isBlank() ? "en" : stringVal(config, "lightspeedLang");
        String apiBase = stringVal(config, "lightspeedApiBase").isBlank()
                ? "https://api.shoplightspeed.com"
                : trimTrailingSlash(stringVal(config, "lightspeedApiBase"));
        String storeBase = trimTrailingSlash(firstNonBlank(vendor.getFeedBaseUrl(), vendor.getWebsiteUrl()));
        String auth = Base64.getEncoder().encodeToString((apiKey + ":" + apiSecret).getBytes(StandardCharsets.UTF_8));

        List<StrategicVendorRawListing> out = new ArrayList<>();
        for (int page = 1; page <= maxPages; page++) {
            String url = apiBase + "/" + lang + "/catalog.json?page=" + page + "&limit=250";
            try {
                HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                        .timeout(Duration.ofSeconds(45))
                        .header("Authorization", "Basic " + auth)
                        .header("Accept", "application/json")
                        .GET()
                        .build();
                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() < 200 || response.statusCode() >= 300) {
                    log.warn("Lightspeed fetch HTTP {} page {} vendor {}", response.statusCode(), page, vendor.getSlug());
                    break;
                }
                JsonNode items = extractCatalogItems(objectMapper.readTree(response.body()));
                if (items == null || !items.isArray() || items.isEmpty()) {
                    break;
                }
                for (JsonNode item : items) {
                    StrategicVendorRawListing mapped = mapItem(item, vendor, config, storeBase);
                    if (mapped != null) {
                        out.add(mapped);
                    }
                }
                if (items.size() < 250) {
                    break;
                }
            } catch (Exception ex) {
                log.warn("Lightspeed fetch failed {} page {}: {}", vendor.getSlug(), page, ex.getMessage());
                break;
            }
        }
        log.info("Lightspeed adapter fetched {} listings for {}", out.size(), vendor.getSlug());
        return out;
    }

    private static JsonNode extractCatalogItems(JsonNode root) {
        if (root == null) {
            return null;
        }
        if (root.isArray()) {
            return root;
        }
        for (String key : List.of("catalog", "products", "items")) {
            JsonNode node = root.get(key);
            if (node != null && node.isArray()) {
                return node;
            }
        }
        return null;
    }

    private StrategicVendorRawListing mapItem(
            JsonNode item, OfficialVendor vendor, Map<String, Object> feedConfig, String storeBase) {
        String externalId = item.has("id") ? item.get("id").asText() : null;
        String title = firstNonBlank(text(item, "title"), text(item, "fulltitle"));
        if (externalId == null || title == null) {
            return null;
        }
        String description = stripHtml(firstNonBlank(text(item, "description"), text(item, "content")));
        if (PartnerListingCatalogRules.looksLikeBlockedSpecimen(title, description, feedConfig)) {
            return null;
        }
        String category = resolveCategory(item, feedConfig);
        if (category == null || !PartnerListingCatalogRules.isAllowedCategory(category, feedConfig)) {
            return null;
        }
        JsonNode variant = firstVariant(item.get("variants"));
        BigDecimal price = variant == null ? null : parseDecimal(text(variant, "price"));
        Integer stock = variant == null ? parseStock(item) : parseInt(text(variant, "stockLevel"));
        String slug = text(item, "url");
        String productUrl = buildProductUrl(storeBase, slug);
        String imageUrl = text(item, "image");
        if (imageUrl == null && item.has("image")) {
            JsonNode image = item.get("image");
            imageUrl = text(image, "src");
            if (imageUrl == null) {
                imageUrl = text(image, "url");
            }
        }
        return new StrategicVendorRawListing(
                externalId,
                title,
                description,
                null,
                price,
                stringVal(feedConfig, "currency").isBlank() ? "CAD" : stringVal(feedConfig, "currency"),
                stock,
                imageUrl,
                productUrl,
                vendor.getCountry(),
                vendor.getState(),
                vendor.getCity(),
                category,
                false,
                null
        );
    }

    private static String buildProductUrl(String storeBase, String slug) {
        if (storeBase == null || slug == null || slug.isBlank()) {
            return storeBase;
        }
        String path = slug.startsWith("/") ? slug : "/" + slug;
        if (!path.endsWith(".html") && !path.contains(".")) {
            path = path + ".html";
        }
        return storeBase + path;
    }

    private static String resolveCategory(JsonNode item, Map<String, Object> feedConfig) {
        JsonNode categories = item.get("categories");
        if (categories != null && categories.isArray() && !categories.isEmpty()) {
            String title = text(categories.get(0), "title");
            if (title != null) {
                String slug = title.toLowerCase(Locale.ROOT).replace(' ', '-');
                Object mapping = feedConfig.get("categoryMapping");
                if (mapping instanceof Map<?, ?> map && map.get(slug) != null) {
                    return MarketplaceListingCategories.normalizeOrDefault(map.get(slug).toString());
                }
                if (slug.contains("tarantula")) {
                    return MarketplaceListingCategories.TARANTULAS;
                }
            }
        }
        return MarketplaceListingCategories.SUPPLIES;
    }

    private static Integer parseStock(JsonNode item) {
        JsonNode stock = item.get("stock");
        if (stock != null && stock.isNumber()) {
            return stock.asInt();
        }
        return null;
    }

    private static JsonNode firstVariant(JsonNode variants) {
        if (variants != null && variants.isArray() && !variants.isEmpty()) {
            return variants.get(0);
        }
        return null;
    }

    private static BigDecimal parseDecimal(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(raw.trim().replace(',', '.'));
        } catch (Exception ex) {
            return null;
        }
    }

    private static Integer parseInt(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return (int) Math.round(Double.parseDouble(raw.trim()));
        } catch (Exception ex) {
            return null;
        }
    }

    private static String text(JsonNode node, String field) {
        if (node == null) {
            return null;
        }
        JsonNode v = node.get(field);
        return v == null || v.isNull() ? null : v.asText().trim();
    }

    private static String stripHtml(String raw) {
        if (raw == null) {
            return null;
        }
        return raw.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
    }

    private static String stringVal(Map<String, Object> config, String key) {
        Object raw = config.get(key);
        return raw == null ? "" : raw.toString().trim();
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return null;
    }

    private static String trimTrailingSlash(String url) {
        if (url == null) {
            return null;
        }
        String t = url.trim();
        while (t.endsWith("/")) {
            t = t.substring(0, t.length() - 1);
        }
        return t.isBlank() ? null : t;
    }

    @Override
    public String id() {
        return "lightspeed-ecom-api";
    }
}
