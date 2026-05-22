package com.tarantulapp.service.vendors.adapters;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.marketplace.MarketplaceListingCategories;
import com.tarantulapp.service.vendors.sources.StrategicVendorRawListing;
import com.tarantulapp.service.vendors.woocommerce.MonarchWooCommerceCategoryMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
@Order(1)
public class WooCommerceStrategicPartnerListingAdapter implements StrategicPartnerListingAdapter {
    private static final Logger log = LoggerFactory.getLogger(WooCommerceStrategicPartnerListingAdapter.class);
    private static final Set<String> SUPPORTED_SLUGS = Set.of("monarch-reptiles");

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;
    private final boolean enabled;
    private final String storeBaseUrl;
    private final int pageSize;
    private final int maxPages;

    public WooCommerceStrategicPartnerListingAdapter(
            ObjectMapper objectMapper,
            @Value("${app.partner-sync.adapters.woocommerce.enabled:true}") boolean enabled,
            @Value("${app.partner-sync.adapters.woocommerce.monarch-base-url:https://monarchreptiles.com}") String storeBaseUrl,
            @Value("${app.partner-sync.adapters.woocommerce.page-size:100}") int pageSize,
            @Value("${app.partner-sync.adapters.woocommerce.max-pages:80}") int maxPages) {
        this.objectMapper = objectMapper;
        this.restTemplate = new RestTemplate();
        this.enabled = enabled;
        this.storeBaseUrl = trimTrailingSlash(storeBaseUrl);
        this.pageSize = Math.max(10, Math.min(pageSize, 100));
        this.maxPages = Math.max(1, Math.min(maxPages, 200));
    }

    @Override
    public boolean supports(OfficialVendor vendor) {
        if (!enabled || vendor == null || vendor.getSlug() == null) {
            return false;
        }
        return SUPPORTED_SLUGS.contains(vendor.getSlug().toLowerCase(Locale.ROOT));
    }

    @Override
    public List<StrategicVendorRawListing> fetch(OfficialVendor vendor) {
        List<StrategicVendorRawListing> out = new ArrayList<>();
        for (int page = 1; page <= maxPages; page++) {
            String url = UriComponentsBuilder
                    .fromHttpUrl(storeBaseUrl + "/wp-json/wc/store/v1/products")
                    .queryParam("per_page", pageSize)
                    .queryParam("page", page)
                    .build(true)
                    .toUriString();
            try {
                String body = restTemplate.getForObject(url, String.class);
                JsonNode root = objectMapper.readTree(body);
                if (!root.isArray() || root.isEmpty()) {
                    break;
                }
                for (JsonNode product : root) {
                    StrategicVendorRawListing mapped = mapProduct(product, vendor);
                    if (mapped != null) {
                        out.add(mapped);
                    }
                }
                if (root.size() < pageSize) {
                    break;
                }
            } catch (Exception ex) {
                log.warn("WooCommerce fetch failed vendor {} page {}: {}", vendor.getSlug(), page, ex.getMessage());
                break;
            }
        }
        log.info("WooCommerce adapter fetched {} listings for {}", out.size(), vendor.getSlug());
        return out;
    }

    private StrategicVendorRawListing mapProduct(JsonNode product, OfficialVendor vendor) {
        MonarchWooCommerceCategoryMapper.MappedProduct mapped = MonarchWooCommerceCategoryMapper.map(product);
        if (mapped == null) {
            return null;
        }
        String externalId = product.has("id") ? String.valueOf(product.get("id").asLong()) : null;
        String title = decodeHtml(text(product, "name"));
        String permalink = text(product, "permalink");
        if (externalId == null || title == null || permalink == null) {
            return null;
        }
        JsonNode prices = product.get("prices");
        BigDecimal price = parseStorePrice(prices == null ? null : prices.get("price"));
        String currency = prices == null ? "CAD" : text(prices, "currency_code");
        Integer stock = parseStock(product);
        String imageUrl = firstImageUrl(product.get("images"));
        String species = guessSpeciesFromTitle(title);

        return new StrategicVendorRawListing(
                externalId,
                title,
                stripHtml(text(product, "short_description")),
                species,
                price,
                currency == null ? "CAD" : currency,
                stock,
                imageUrl,
                permalink,
                vendor.getCountry(),
                vendor.getState(),
                vendor.getCity(),
                MarketplaceListingCategories.normalizeOrDefault(mapped.listingCategory()),
                mapped.promoted(),
                mapped.brandSlug()
        );
    }

    private Integer parseStock(JsonNode product) {
        if (product == null) {
            return null;
        }
        if (!product.path("is_in_stock").asBoolean(true)) {
            return 0;
        }
        JsonNode low = product.get("low_stock_remaining");
        if (low != null && !low.isNull() && low.isNumber()) {
            return low.asInt();
        }
        JsonNode max = product.path("add_to_cart").get("maximum");
        if (max != null && max.isNumber() && max.asInt() > 0) {
            return max.asInt();
        }
        return 1;
    }

    private BigDecimal parseStorePrice(JsonNode minorUnits) {
        if (minorUnits == null || minorUnits.isNull()) {
            return null;
        }
        long raw;
        if (minorUnits.isNumber()) {
            raw = minorUnits.asLong();
        } else {
            try {
                raw = Long.parseLong(minorUnits.asText().trim());
            } catch (Exception ignored) {
                return null;
            }
        }
        return BigDecimal.valueOf(raw).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    private String firstImageUrl(JsonNode images) {
        if (images == null || !images.isArray() || images.isEmpty()) {
            return null;
        }
        JsonNode first = images.get(0);
        String thumb = text(first, "thumbnail");
        if (thumb != null) {
            return thumb;
        }
        return text(first, "src");
    }

    private String guessSpeciesFromTitle(String title) {
        if (title == null) {
            return null;
        }
        String cleaned = title.replaceAll("(?i)\\(.*?(new world|old world).*?\\)", "").trim();
        int dash = cleaned.indexOf('–');
        if (dash < 0) {
            dash = cleaned.indexOf('-');
        }
        if (dash > 0 && dash < 80) {
            String head = cleaned.substring(0, dash).trim();
            if (head.split("\\s+").length >= 2) {
                return head;
            }
        }
        return null;
    }

    private String stripHtml(String raw) {
        if (raw == null) {
            return null;
        }
        return raw.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
    }

    private String decodeHtml(String raw) {
        if (raw == null) {
            return null;
        }
        return raw
                .replace("&#8211;", "–")
                .replace("&amp;", "&")
                .replace("&quot;", "\"")
                .replace("&#8221;", "\"")
                .replace("&#8220;", "\"");
    }

    private String text(JsonNode node, String field) {
        if (node == null) {
            return null;
        }
        JsonNode v = node.get(field);
        if (v == null || v.isNull()) {
            return null;
        }
        String s = v.asText().trim();
        return s.isEmpty() ? null : s;
    }

    private String trimTrailingSlash(String url) {
        if (url == null) {
            return "https://monarchreptiles.com";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    @Override
    public String id() {
        return "woocommerce-store-api";
    }
}
