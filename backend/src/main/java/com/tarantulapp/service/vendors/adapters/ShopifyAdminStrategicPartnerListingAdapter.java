package com.tarantulapp.service.vendors.adapters;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.marketplace.MarketplaceListingCategories;
import com.tarantulapp.service.vendors.PartnerListingCatalogRules;
import com.tarantulapp.service.vendors.csv.ShopifyPartnerFeedProbe;
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
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
@Order(10)
public class ShopifyAdminStrategicPartnerListingAdapter implements StrategicPartnerListingAdapter {

    private static final Logger log = LoggerFactory.getLogger(ShopifyAdminStrategicPartnerListingAdapter.class);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final boolean enabled;
    private final int maxPages;

    public ShopifyAdminStrategicPartnerListingAdapter(
            ObjectMapper objectMapper,
            @Value("${app.partner-sync.adapters.shopify.enabled:true}") boolean enabled,
            @Value("${app.partner-sync.adapters.shopify.max-pages:20}") int maxPages) {
        this.objectMapper = objectMapper;
        this.enabled = enabled;
        this.maxPages = Math.max(1, Math.min(maxPages, 50));
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
        if (!"shopify".equalsIgnoreCase(String.valueOf(vendor.getFeedType()).trim())) {
            return false;
        }
        Map<String, Object> config = vendor.getFeedConfig();
        return config != null
                && !stringVal(config, "shopifyAccessToken").isBlank()
                && ShopifyPartnerFeedProbe.normalizeShopDomain(
                        firstNonBlank(stringVal(config, "shopifyShopDomain"), vendor.getFeedBaseUrl(), vendor.getWebsiteUrl()))
                != null;
    }

    @Override
    public List<StrategicVendorRawListing> fetch(OfficialVendor vendor) {
        Map<String, Object> config = vendor.getFeedConfig() == null ? Map.of() : vendor.getFeedConfig();
        String shop = ShopifyPartnerFeedProbe.normalizeShopDomain(
                firstNonBlank(stringVal(config, "shopifyShopDomain"), vendor.getFeedBaseUrl(), vendor.getWebsiteUrl()));
        String token = stringVal(config, "shopifyAccessToken");
        if (shop == null || token.isBlank()) {
            return List.of();
        }
        List<StrategicVendorRawListing> out = new ArrayList<>();
        String pageInfo = null;
        for (int page = 0; page < maxPages; page++) {
            String url = "https://" + shop + "/admin/api/2024-10/products.json?limit=250"
                    + (pageInfo == null ? "" : "&page_info=" + pageInfo);
            try {
                HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
                        .timeout(Duration.ofSeconds(45))
                        .header("X-Shopify-Access-Token", token)
                        .header("Accept", "application/json")
                        .GET();
                HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() < 200 || response.statusCode() >= 300) {
                    log.warn("Shopify fetch HTTP {} vendor {}", response.statusCode(), vendor.getSlug());
                    break;
                }
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode products = root.get("products");
                if (products == null || !products.isArray() || products.isEmpty()) {
                    break;
                }
                for (JsonNode product : products) {
                    StrategicVendorRawListing mapped = mapProduct(product, vendor, config, shop);
                    if (mapped != null) {
                        out.add(mapped);
                    }
                }
                pageInfo = nextPageInfo(response);
                if (pageInfo == null) {
                    break;
                }
            } catch (Exception ex) {
                log.warn("Shopify fetch failed {}: {}", vendor.getSlug(), ex.getMessage());
                break;
            }
        }
        log.info("Shopify adapter fetched {} listings for {}", out.size(), vendor.getSlug());
        return out;
    }

    private StrategicVendorRawListing mapProduct(
            JsonNode product, OfficialVendor vendor, Map<String, Object> feedConfig, String shop) {
        String externalId = product.has("id") ? product.get("id").asText() : null;
        String title = text(product, "title");
        if (externalId == null || title == null) {
            return null;
        }
        String description = stripHtml(text(product, "body_html"));
        if (PartnerListingCatalogRules.looksLikeBlockedSpecimen(title, description, feedConfig)) {
            return null;
        }
        String category = resolveCategory(text(product, "product_type"), feedConfig);
        if (category == null || !PartnerListingCatalogRules.isAllowedCategory(category, feedConfig)) {
            return null;
        }
        JsonNode variant = firstVariant(product.get("variants"));
        BigDecimal price = variant == null ? null : parseDecimal(text(variant, "price"));
        Integer stock = variant == null ? null : parseInt(text(variant, "inventory_quantity"));
        String handle = text(product, "handle");
        String productUrl = handle == null ? vendor.getWebsiteUrl()
                : "https://" + shop + "/products/" + handle;
        String imageUrl = firstImage(product.get("images"));
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

    private static String resolveCategory(String productType, Map<String, Object> feedConfig) {
        if (productType == null || productType.isBlank()) {
            return MarketplaceListingCategories.SUPPLIES;
        }
        String slug = productType.toLowerCase(Locale.ROOT).replace(' ', '-');
        Object mapping = feedConfig.get("categoryMapping");
        if (mapping instanceof Map<?, ?> map) {
            Object mapped = map.get(slug);
            if (mapped != null) {
                return MarketplaceListingCategories.normalizeOrDefault(mapped.toString());
            }
        }
        if (slug.contains("tarantula")) {
            return MarketplaceListingCategories.TARANTULAS;
        }
        if (slug.contains("feeder")) {
            return MarketplaceListingCategories.LIVE_FOOD;
        }
        return MarketplaceListingCategories.SUPPLIES;
    }

    private static String nextPageInfo(HttpResponse<String> response) {
        return response.headers().allValues("link").stream()
                .flatMap(v -> java.util.Arrays.stream(v.split(",")))
                .map(String::trim)
                .filter(s -> s.contains("rel=\"next\""))
                .map(s -> {
                    int start = s.indexOf("page_info=");
                    if (start < 0) {
                        return null;
                    }
                    String part = s.substring(start + "page_info=".length());
                    int end = part.indexOf('>');
                    if (end > 0) {
                        part = part.substring(0, end);
                    }
                    return part.replace("\"", "").trim();
                })
                .findFirst()
                .orElse(null);
    }

    private static JsonNode firstVariant(JsonNode variants) {
        if (variants != null && variants.isArray() && !variants.isEmpty()) {
            return variants.get(0);
        }
        return null;
    }

    private static String firstImage(JsonNode images) {
        if (images != null && images.isArray() && !images.isEmpty()) {
            return text(images.get(0), "src");
        }
        return null;
    }

    private static BigDecimal parseDecimal(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(raw.trim());
        } catch (Exception ex) {
            return null;
        }
    }

    private static Integer parseInt(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Integer.parseInt(raw.trim());
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

    @Override
    public String id() {
        return "shopify-admin-api";
    }
}
