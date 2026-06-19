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
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Adapter for Montreal Spider Co's custom Next.js catalog API.
 *
 * <p>Montreal Spider Co runs a proprietary stack (no Shopify/WooCommerce), exposing a single
 * {@code GET /api/catalog} endpoint that returns the full catalog as a JSON array of products.
 * Each product carries bilingual {@code {en, fr}} fields and 1–N {@code sizes[]} tiers, each with
 * its own price and warehouse stock. We flatten every size into an individual partner listing keyed
 * by {@code {slug}:{sizeId}} so price/stock track per tier.
 *
 * <p>Configuration (all on the official vendor record, set from the admin UI):
 * <ul>
 *   <li>{@code feedType = "montreal_spider_co"}</li>
 *   <li>{@code feedBaseUrl} — the catalog endpoint, e.g. {@code https://montrealspider.ca/api/catalog}
 *       (a site origin without {@code /api/catalog} is also accepted and the path is appended)</li>
 *   <li>{@code feedConfig.apiKey} — optional; sent as {@code x-api-key} when the partner enables
 *       {@code CATALOG_API_KEY} on their side. Omitted while the endpoint is public.</li>
 *   <li>{@code feedConfig.siteBaseUrl} — optional override for product page links; defaults to the
 *       vendor website or the catalog origin.</li>
 * </ul>
 */
@Component
@Order(20)
public class MontrealSpiderCoStrategicPartnerListingAdapter implements StrategicPartnerListingAdapter {

    public static final String FEED_TYPE = "montreal_spider_co";

    private static final Logger log = LoggerFactory.getLogger(MontrealSpiderCoStrategicPartnerListingAdapter.class);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final boolean enabled;

    public MontrealSpiderCoStrategicPartnerListingAdapter(
            ObjectMapper objectMapper,
            @Value("${app.partner-sync.adapters.montreal-spider-co.enabled:true}") boolean enabled) {
        this.objectMapper = objectMapper;
        this.enabled = enabled;
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
        if (!FEED_TYPE.equalsIgnoreCase(String.valueOf(vendor.getFeedType()).trim())) {
            return false;
        }
        return resolveCatalogUrl(vendor) != null;
    }

    @Override
    public List<StrategicVendorRawListing> fetch(OfficialVendor vendor) {
        String catalogUrl = resolveCatalogUrl(vendor);
        if (catalogUrl == null) {
            return List.of();
        }
        Map<String, Object> config = vendor.getFeedConfig() == null ? Map.of() : vendor.getFeedConfig();
        String apiKey = stringVal(config, "apiKey");
        String siteBase = resolveSiteBaseUrl(vendor, catalogUrl);

        JsonNode root;
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(catalogUrl))
                    .timeout(Duration.ofSeconds(45))
                    .header("Accept", "application/json")
                    .GET();
            if (!apiKey.isBlank()) {
                builder.header("x-api-key", apiKey);
            }
            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status == 401 || status == 403) {
                log.warn("Montreal Spider Co fetch unauthorized (HTTP {}) for {} at {} — check feedConfig.apiKey",
                        status, vendor.getSlug(), catalogUrl);
                return List.of();
            }
            if (status == 404) {
                log.warn("Montreal Spider Co fetch HTTP 404 for {} at {} — endpoint not found. "
                                + "Verify the catalog API is deployed at this URL (set feedBaseUrl or feedConfig.catalogUrl).",
                        vendor.getSlug(), catalogUrl);
                return List.of();
            }
            if (status < 200 || status >= 300) {
                log.warn("Montreal Spider Co fetch HTTP {} for {} at {}", status, vendor.getSlug(), catalogUrl);
                return List.of();
            }
            root = objectMapper.readTree(response.body());
        } catch (Exception ex) {
            log.warn("Montreal Spider Co fetch failed {} at {}: {}", vendor.getSlug(), catalogUrl, ex.getMessage());
            return List.of();
        }

        List<StrategicVendorRawListing> out = mapCatalog(root, vendor, siteBase);
        log.info("Montreal Spider Co adapter fetched {} listings for {}", out.size(), vendor.getSlug());
        return out;
    }

    /** Maps a parsed catalog array into raw listings. Package-private for offline mapping tests. */
    List<StrategicVendorRawListing> mapCatalog(JsonNode root, OfficialVendor vendor, String siteBase) {
        if (root == null || !root.isArray()) {
            log.warn("Montreal Spider Co catalog for {} was not a JSON array",
                    vendor == null ? "?" : vendor.getSlug());
            return List.of();
        }
        List<StrategicVendorRawListing> out = new ArrayList<>();
        for (JsonNode product : root) {
            mapProduct(product, vendor, siteBase, out);
        }
        return out;
    }

    private void mapProduct(JsonNode product, OfficialVendor vendor, String siteBase,
                            List<StrategicVendorRawListing> out) {
        String slug = text(product, "slug");
        JsonNode sizes = product.get("sizes");
        if (slug == null || sizes == null || !sizes.isArray() || sizes.isEmpty()) {
            return;
        }
        String scientific = text(product, "scientific");
        String commonEn = localized(product.get("common"));
        String descriptionEn = localized(product.get("description"));
        String imageUrl = absolutizeUrl(text(product, "image"), siteBase);
        String productUrl = siteBase + "/en/product/" + slug;
        boolean promoted = product.path("featured").asBoolean(false);

        for (JsonNode size : sizes) {
            String sizeId = text(size, "id");
            if (sizeId == null) {
                continue;
            }
            String sizeLabelEn = localized(size.get("label"));
            String title = buildTitle(commonEn, scientific, sizeLabelEn);
            if (title == null) {
                continue;
            }
            // Defensive: respect the shared partner gates (blocked specimen terms / categories),
            // even though Montreal Spider Co only sells captive-bred tarantulas today.
            if (!PartnerListingCatalogRules.isAllowedListing(
                    title, descriptionEn, MarketplaceListingCategories.TARANTULAS, vendor.getFeedConfig())) {
                continue;
            }
            out.add(new StrategicVendorRawListing(
                    slug + ":" + sizeId,
                    title,
                    descriptionEn,
                    scientific,
                    parseDecimal(size.get("price")),
                    "CAD",
                    parseInt(size.get("stock")),
                    imageUrl,
                    productUrl,
                    vendor.getCountry(),
                    vendor.getState(),
                    vendor.getCity(),
                    MarketplaceListingCategories.TARANTULAS,
                    promoted,
                    null
            ));
        }
    }

    private static String buildTitle(String commonEn, String scientific, String sizeLabelEn) {
        String base = firstNonBlank(commonEn, scientific);
        if (base == null) {
            return null;
        }
        return sizeLabelEn == null || sizeLabelEn.isBlank() ? base : base + " — " + sizeLabelEn;
    }

    /** Reads either a bilingual {@code {en, fr}} object (preferring {@code en}) or a plain string. */
    private static String localized(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isObject()) {
            String en = textValue(node.get("en"));
            if (en != null) {
                return en;
            }
            return textValue(node.get("fr"));
        }
        return textValue(node);
    }

    private String resolveCatalogUrl(OfficialVendor vendor) {
        Map<String, Object> config = vendor.getFeedConfig() == null ? Map.of() : vendor.getFeedConfig();
        String fromConfig = stringVal(config, "catalogUrl");
        String base = firstNonBlank(fromConfig, vendor.getFeedBaseUrl(), vendor.getWebsiteUrl());
        if (base == null) {
            return null;
        }
        String trimmed = trimTrailingSlash(base);
        String lower = trimmed.toLowerCase(Locale.ROOT);
        if (!(lower.startsWith("http://") || lower.startsWith("https://"))) {
            return null;
        }
        return lower.endsWith("/api/catalog") ? trimmed : trimmed + "/api/catalog";
    }

    private String resolveSiteBaseUrl(OfficialVendor vendor, String catalogUrl) {
        Map<String, Object> config = vendor.getFeedConfig() == null ? Map.of() : vendor.getFeedConfig();
        String configured = trimTrailingSlash(firstNonBlank(stringVal(config, "siteBaseUrl"), vendor.getWebsiteUrl()));
        if (configured != null) {
            return configured;
        }
        // Fall back to the scheme://host of the catalog endpoint.
        try {
            URI uri = URI.create(catalogUrl);
            return uri.getScheme() + "://" + uri.getAuthority();
        } catch (Exception ex) {
            return trimTrailingSlash(catalogUrl);
        }
    }

    private static String absolutizeUrl(String raw, String siteBase) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String trimmed = raw.trim();
        String lower = trimmed.toLowerCase(Locale.ROOT);
        if (lower.startsWith("http://") || lower.startsWith("https://")) {
            return trimmed;
        }
        if (trimmed.startsWith("//")) {
            return "https:" + trimmed;
        }
        if (trimmed.startsWith("/") && siteBase != null) {
            return siteBase + trimmed;
        }
        return null;
    }

    private static BigDecimal parseDecimal(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isNumber()) {
            return node.decimalValue();
        }
        try {
            return new BigDecimal(node.asText().trim());
        } catch (Exception ex) {
            return null;
        }
    }

    private static Integer parseInt(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isNumber()) {
            return node.asInt();
        }
        try {
            return Integer.parseInt(node.asText().trim());
        } catch (Exception ex) {
            return null;
        }
    }

    private static String text(JsonNode node, String field) {
        if (node == null) {
            return null;
        }
        return textValue(node.get(field));
    }

    private static String textValue(JsonNode v) {
        if (v == null || v.isNull()) {
            return null;
        }
        String s = v.asText().trim();
        return s.isEmpty() ? null : s;
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
        if (url == null || url.isBlank()) {
            return null;
        }
        String trimmed = url.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }

    @Override
    public String id() {
        return "montreal-spider-co-catalog-api";
    }
}
