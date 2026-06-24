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
 * Each product carries bilingual {@code {en, fr}} fields and 1–N price/stock tiers. The live feed
 * uses {@code availability[]} ({@code key}, {@code sizeLabel}, {@code price}, {@code stock}); the
 * integration brief used {@code sizes[]} ({@code id}, {@code label}). Both shapes are supported.
 * Every tier becomes its own partner listing keyed by {@code {slug}:{tierId}}.
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
        long withImages = out.stream().filter(r -> r.imageUrl() != null).count();
        long withStock = out.stream().filter(r -> r.stockQuantity() != null).count();
        log.info("Montreal Spider Co adapter fetched {} listings ({} with images, {} with stock) for {}",
                out.size(), withImages, withStock, vendor.getSlug());
        // If images or stock didn't resolve, the live JSON likely uses field names other than the
        // documented ones. Dump the actual product/size field names so the mapping can be corrected
        // without needing direct network access to the feed.
        if (!out.isEmpty() && (withImages == 0 || withStock == 0) && root.isArray() && !root.isEmpty()) {
            logSchemaHint(root.get(0), vendor.getSlug());
        }
        return out;
    }

    private void logSchemaHint(JsonNode product, String slug) {
        JsonNode tiers = product == null ? null : resolveTierArray(product);
        List<String> tierFields = tiers != null && tiers.isArray() && !tiers.isEmpty()
                ? fieldNames(tiers.get(0)) : List.of();
        log.warn("Montreal Spider Co schema hint for {} — product fields={} ; tier fields={}. "
                        + "Image and/or stock did not resolve; adapter field mapping may need adjusting.",
                slug, fieldNames(product), tierFields);
    }

    private static List<String> fieldNames(JsonNode node) {
        if (node == null || !node.isObject()) {
            return List.of();
        }
        List<String> names = new ArrayList<>();
        node.fieldNames().forEachRemaining(names::add);
        return names;
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
        JsonNode tiers = resolveTierArray(product);
        if (slug == null || tiers == null || !tiers.isArray() || tiers.isEmpty()) {
            return;
        }
        String scientific = text(product, "scientific");
        String commonEn = localized(product.get("common"));
        String descriptionEn = localized(product.get("description"));
        String defaultImageUrl = resolveImageUrl(product, siteBase);
        String productUrl = siteBase + "/en/product/" + slug;
        boolean promoted = product.path("featured").asBoolean(false);

        for (JsonNode tier : tiers) {
            String tierId = resolveTierId(tier);
            if (tierId == null) {
                continue;
            }
            String tierLabel = resolveTierLabel(tier);
            String title = buildTitle(commonEn, scientific, tierLabel);
            if (title == null) {
                continue;
            }
            String imageUrl = firstNonBlank(
                    imageFromNode(tier.get("photo"), siteBase),
                    defaultImageUrl);
            // Defensive: respect the shared partner gates (blocked specimen terms / categories),
            // even though Montreal Spider Co only sells captive-bred tarantulas today.
            if (!PartnerListingCatalogRules.isAllowedListing(
                    title, descriptionEn, MarketplaceListingCategories.TARANTULAS, vendor.getFeedConfig())) {
                continue;
            }
            out.add(new StrategicVendorRawListing(
                    slug + ":" + tierId,
                    title,
                    descriptionEn,
                    scientific,
                    parseDecimal(tier.get("price")),
                    "CAD",
                    parseInt(tier.get("stock")),
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

    /** Live feed uses {@code availability[]}; the integration brief documented {@code sizes[]}. */
    private static JsonNode resolveTierArray(JsonNode product) {
        if (product == null) {
            return null;
        }
        JsonNode availability = product.get("availability");
        if (availability != null && availability.isArray() && !availability.isEmpty()) {
            return availability;
        }
        return product.get("sizes");
    }

    private static String resolveTierId(JsonNode tier) {
        return firstNonBlank(text(tier, "key"), text(tier, "id"));
    }

    private static String resolveTierLabel(JsonNode tier) {
        return firstNonBlank(
                text(tier, "sizeLabel"),
                localized(tier.get("label")));
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

    /**
     * Resolves the site origin (scheme://host) used to build product page links and absolutize
     * relative images. We deliberately reduce to the origin and ignore any path/locale segment so a
     * configured value like {@code https://www.montrealspider.ca/en} cannot produce a doubled
     * {@code /en/en/product/...} URL.
     */
    String resolveSiteBaseUrl(OfficialVendor vendor, String catalogUrl) {
        Map<String, Object> config = vendor.getFeedConfig() == null ? Map.of() : vendor.getFeedConfig();
        String candidate = firstNonBlank(
                stringVal(config, "siteBaseUrl"), vendor.getWebsiteUrl(), catalogUrl);
        String origin = originOf(candidate);
        return origin != null ? origin : trimTrailingSlash(candidate);
    }

    private static String originOf(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        try {
            URI uri = URI.create(url.trim());
            if (uri.getScheme() != null && uri.getAuthority() != null) {
                return uri.getScheme() + "://" + uri.getAuthority();
            }
        } catch (Exception ignored) {
            // fall through
        }
        return null;
    }

    /**
     * Resolves a product image across the field shapes Montreal Spider Co's catalog may use.
     * The documented {@code image} string is tried first, then common single-image aliases (any of
     * which may be a plain string or a Cloudinary-style object with {@code secure_url}/{@code url}),
     * then the first entry of common image arrays. Relative paths are absolutized against the site.
     */
    static String resolveImageUrl(JsonNode product, String siteBase) {
        if (product == null) {
            return null;
        }
        for (String field : List.of(
                "image", "imageUrl", "image_url", "mainImage", "thumbnail", "photo", "cover")) {
            String url = imageFromNode(product.get(field), siteBase);
            if (url != null) {
                return url;
            }
        }
        for (String field : List.of("images", "photos", "gallery", "media")) {
            JsonNode arr = product.get(field);
            if (arr != null && arr.isArray() && !arr.isEmpty()) {
                String url = imageFromNode(arr.get(0), siteBase);
                if (url != null) {
                    return url;
                }
            }
        }
        return null;
    }

    /** Extracts a usable image URL from either a string node or an object node ({secure_url|url|src|path}). */
    private static String imageFromNode(JsonNode node, String siteBase) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isTextual()) {
            return absolutizeUrl(node.asText().trim(), siteBase);
        }
        if (node.isObject()) {
            for (String key : List.of("secure_url", "url", "src", "path")) {
                String url = absolutizeUrl(text(node, key), siteBase);
                if (url != null) {
                    return url;
                }
            }
        }
        return null;
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
