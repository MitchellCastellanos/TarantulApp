package com.tarantulapp.service.vendors.csv;

import com.tarantulapp.marketplace.MarketplaceListingCategories;
import com.tarantulapp.service.vendors.PartnerListingCatalogRules;
import com.tarantulapp.service.vendors.sources.StrategicVendorRawListing;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Parses partner CSV exports (Lightspeed, Shopify export, Google Sheets, etc.).
 */
@Component
public class CsvPartnerFeedParser {

    private static final Pattern INT_PATTERN = Pattern.compile("-?\\d+");

    public ParseResult parse(String csvBody, Map<String, Object> feedConfig) {
        if (csvBody == null || csvBody.isBlank()) {
            return new ParseResult(List.of(), Map.of());
        }
        char delimiter = resolveDelimiter(feedConfig);
        List<String[]> table = readRows(csvBody, delimiter);
        if (table.size() < 2) {
            return new ParseResult(List.of(), Map.of());
        }
        String[] headers = table.get(0);
        Map<String, Integer> headerIndex = indexHeaders(headers);
        Map<String, String> columnMap = resolveColumnMap(feedConfig, headerIndex);
        Map<String, String> detected = new LinkedHashMap<>(columnMap);

        List<ParsedRow> rows = new ArrayList<>();
        for (int i = 1; i < table.size(); i++) {
            String[] cells = table.get(i);
            ParsedRow row = mapRow(cells, headerIndex, columnMap);
            if (row != null) {
                rows.add(row);
            }
        }
        return new ParseResult(rows, detected);
    }

    public List<StrategicVendorRawListing> toRawListings(
            List<ParsedRow> rows,
            Map<String, Object> feedConfig,
            String defaultCountry,
            String defaultState,
            String defaultCity,
            String defaultCurrency) {
        List<StrategicVendorRawListing> out = new ArrayList<>();
        Map<String, String> categoryMapping = categoryMapping(feedConfig);
        for (ParsedRow row : rows) {
            if (PartnerListingCatalogRules.looksLikeBlockedSpecimen(row.title(), row.description(), feedConfig)) {
                continue;
            }
            String category = resolveCategory(row.category(), categoryMapping, feedConfig);
            if (category == null || !PartnerListingCatalogRules.isAllowedCategory(category, feedConfig)) {
                continue;
            }
            String externalId = row.externalId() != null ? row.externalId()
                    : Integer.toHexString((row.title() + row.productUrl()).hashCode());
            out.add(new StrategicVendorRawListing(
                    externalId,
                    row.title(),
                    row.description(),
                    null,
                    row.price(),
                    row.currency() != null ? row.currency() : defaultCurrency,
                    row.stock(),
                    row.imageUrl(),
                    row.productUrl(),
                    defaultCountry,
                    defaultState,
                    defaultCity,
                    category,
                    false,
                    null
            ));
        }
        return out;
    }

    private ParsedRow mapRow(String[] cells, Map<String, Integer> headerIndex, Map<String, String> columnMap) {
        String title = cell(cells, headerIndex, columnMap.get("title"));
        String productUrl = cell(cells, headerIndex, columnMap.get("productUrl"));
        if (title == null && productUrl == null) {
            return null;
        }
        if (title == null) {
            title = productUrl;
        }
        return new ParsedRow(
                cell(cells, headerIndex, columnMap.get("externalId")),
                title,
                cell(cells, headerIndex, columnMap.get("description")),
                parsePrice(cell(cells, headerIndex, columnMap.get("price"))),
                cell(cells, headerIndex, columnMap.get("currency")),
                parseStock(cell(cells, headerIndex, columnMap.get("stock"))),
                cell(cells, headerIndex, columnMap.get("imageUrl")),
                productUrl,
                cell(cells, headerIndex, columnMap.get("category"))
        );
    }

    private static String resolveCategory(String rawCategory,
                                          Map<String, String> mapping,
                                          Map<String, Object> feedConfig) {
        if (rawCategory == null || rawCategory.isBlank()) {
            return null;
        }
        String slug = rawCategory.trim().toLowerCase(Locale.ROOT).replace(' ', '-');
        String mapped = mapping.get(slug);
        if (mapped != null) {
            return MarketplaceListingCategories.normalizeOrDefault(mapped);
        }
        for (Map.Entry<String, String> e : mapping.entrySet()) {
            if (slug.contains(e.getKey())) {
                return MarketplaceListingCategories.normalizeOrDefault(e.getValue());
            }
        }
        if (slug.contains("tarantula") || slug.contains("sling")) {
            return MarketplaceListingCategories.TARANTULAS;
        }
        if (slug.contains("feeder") || slug.contains("cricket")) {
            return MarketplaceListingCategories.LIVE_FOOD;
        }
        if (slug.contains("substrate")) {
            return MarketplaceListingCategories.SUBSTRATES;
        }
        if (slug.contains("terrarium") || slug.contains("enclosure")) {
            return MarketplaceListingCategories.TERRARIUMS;
        }
        if (slug.contains("supply")) {
            return MarketplaceListingCategories.SUPPLIES;
        }
        return PartnerListingCatalogRules.isAllowedCategory(MarketplaceListingCategories.SUPPLIES, feedConfig)
                ? MarketplaceListingCategories.SUPPLIES
                : null;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, String> categoryMapping(Map<String, Object> feedConfig) {
        Map<String, String> out = new LinkedHashMap<>();
        Object raw = feedConfig == null ? null : feedConfig.get("categoryMapping");
        if (raw instanceof Map<?, ?> map) {
            map.forEach((k, v) -> {
                if (k != null && v != null) {
                    out.put(k.toString().toLowerCase(Locale.ROOT), v.toString());
                }
            });
        }
        return out;
    }

    private static Map<String, String> resolveColumnMap(Map<String, Object> feedConfig, Map<String, Integer> headerIndex) {
        Map<String, String> out = new LinkedHashMap<>();
        Object configured = feedConfig == null ? null : feedConfig.get("csvColumns");
        if (configured instanceof Map<?, ?> map) {
            map.forEach((k, v) -> {
                if (k != null && v != null) {
                    out.put(k.toString(), v.toString());
                }
            });
        }
        out.putIfAbsent("title", findHeader(headerIndex, "title", "name", "product_name", "product title"));
        out.putIfAbsent("externalId", findHeader(headerIndex, "id", "sku", "product_id", "handle"));
        out.putIfAbsent("price", findHeader(headerIndex, "price", "regular_price", "variant price"));
        out.putIfAbsent("stock", findHeader(headerIndex, "stock", "quantity", "qty", "inventory"));
        out.putIfAbsent("imageUrl", findHeader(headerIndex, "image", "image_url", "image src", "image link"));
        out.putIfAbsent("productUrl", findHeader(headerIndex, "url", "link", "permalink", "product url"));
        out.putIfAbsent("category", findHeader(headerIndex, "category", "categories", "product_type", "type"));
        out.putIfAbsent("description", findHeader(headerIndex, "description", "short_description", "body"));
        out.putIfAbsent("currency", findHeader(headerIndex, "currency"));
        return out;
    }

    private static String findHeader(Map<String, Integer> headerIndex, String... candidates) {
        for (String c : candidates) {
            Integer idx = headerIndex.get(normalizeHeader(c));
            if (idx != null) {
                return normalizeHeader(c);
            }
        }
        return null;
    }

    private static String cell(String[] cells, Map<String, Integer> headerIndex, String headerName) {
        if (headerName == null) {
            return null;
        }
        Integer idx = headerIndex.get(normalizeHeader(headerName));
        if (idx == null || idx < 0 || idx >= cells.length) {
            return null;
        }
        String v = cells[idx].trim();
        return v.isEmpty() ? null : v;
    }

    private static Map<String, Integer> indexHeaders(String[] headers) {
        Map<String, Integer> out = new LinkedHashMap<>();
        for (int i = 0; i < headers.length; i++) {
            out.put(normalizeHeader(headers[i]), i);
        }
        return out;
    }

    private static String normalizeHeader(String h) {
        return h == null ? "" : h.trim().toLowerCase(Locale.ROOT);
    }

    private static char resolveDelimiter(Map<String, Object> feedConfig) {
        Object raw = feedConfig == null ? null : feedConfig.get("csvDelimiter");
        if (raw == null) {
            return ',';
        }
        String s = raw.toString();
        return s.isEmpty() ? ',' : s.charAt(0);
    }

    private static BigDecimal parsePrice(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String cleaned = raw.replaceAll("[^0-9.,-]", "").replace(',', '.');
        if (cleaned.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(cleaned).setScale(2, RoundingMode.HALF_UP);
        } catch (Exception ex) {
            return null;
        }
    }

    private static Integer parseStock(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        var m = INT_PATTERN.matcher(raw.trim());
        if (m.find()) {
            return Integer.parseInt(m.group());
        }
        return null;
    }

    static List<String[]> readRows(String body, char delimiter) {
        List<String[]> rows = new ArrayList<>();
        List<String> current = new ArrayList<>();
        StringBuilder cell = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < body.length(); i++) {
            char c = body.charAt(i);
            if (c == '"') {
                if (inQuotes && i + 1 < body.length() && body.charAt(i + 1) == '"') {
                    cell.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }
            if (!inQuotes && c == delimiter) {
                current.add(cell.toString());
                cell.setLength(0);
                continue;
            }
            if (!inQuotes && (c == '\n' || c == '\r')) {
                if (c == '\r' && i + 1 < body.length() && body.charAt(i + 1) == '\n') {
                    i++;
                }
                current.add(cell.toString());
                cell.setLength(0);
                if (!current.isEmpty() && current.stream().anyMatch(s -> !s.isBlank())) {
                    rows.add(current.toArray(new String[0]));
                }
                current = new ArrayList<>();
                continue;
            }
            cell.append(c);
        }
        current.add(cell.toString());
        if (!current.isEmpty() && current.stream().anyMatch(s -> !s.isBlank())) {
            rows.add(current.toArray(new String[0]));
        }
        return rows;
    }

    public record ParsedRow(
            String externalId,
            String title,
            String description,
            BigDecimal price,
            String currency,
            Integer stock,
            String imageUrl,
            String productUrl,
            String category
    ) {}

    public record ParseResult(List<ParsedRow> rows, Map<String, String> detectedColumns) {}
}
