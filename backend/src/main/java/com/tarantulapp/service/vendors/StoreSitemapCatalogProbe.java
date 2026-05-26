package com.tarantulapp.service.vendors;

import java.net.URI;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Estimates catalog size and navigation categories from public sitemap.xml (Lightspeed and others).
 */
public final class StoreSitemapCatalogProbe {

    private static final Pattern LOC_PATTERN = Pattern.compile("<loc>([^<]+)</loc>", Pattern.CASE_INSENSITIVE);

    private StoreSitemapCatalogProbe() {
    }

    public static SitemapCatalogSnapshot parse(String sitemapXml, String storeOrigin) {
        if (sitemapXml == null || sitemapXml.isBlank()) {
            return SitemapCatalogSnapshot.empty("Sitemap vacío");
        }
        List<String> urls = new ArrayList<>();
        Matcher matcher = LOC_PATTERN.matcher(sitemapXml);
        while (matcher.find()) {
            urls.add(matcher.group(1).trim());
        }
        if (urls.isEmpty()) {
            return SitemapCatalogSnapshot.empty("Sin URLs en sitemap");
        }

        List<String> productUrls = new ArrayList<>();
        Map<String, CategoryAgg> categories = new LinkedHashMap<>();
        String hostPrefix = storeOrigin == null ? "" : storeOrigin;

        for (String url : urls) {
            if (isProductUrl(url)) {
                productUrls.add(url);
                continue;
            }
            String categoryKey = categoryKeyFromUrl(url, hostPrefix);
            if (categoryKey != null) {
                CategoryAgg agg = categories.computeIfAbsent(categoryKey,
                        k -> new CategoryAgg(k, categoryLabel(k)));
                agg.urlCount++;
            }
        }

        List<Map<String, Object>> categoryRows = categories.values().stream()
                .sorted(Comparator.comparingInt((CategoryAgg a) -> a.urlCount).reversed())
                .limit(25)
                .map(a -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("slug", a.slug);
                    row.put("name", a.name);
                    row.put("urlCount", a.urlCount);
                    return row;
                })
                .toList();

        List<String> sampleNames = productUrls.stream()
                .limit(10)
                .map(StoreSitemapCatalogProbe::productNameFromUrl)
                .filter(n -> n != null && !n.isBlank())
                .toList();

        return new SitemapCatalogSnapshot(
                !productUrls.isEmpty() || !categoryRows.isEmpty(),
                productUrls.size(),
                urls.size(),
                categoryRows,
                sampleNames,
                "OK"
        );
    }

    static boolean isProductUrl(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }
        String lower = url.toLowerCase(Locale.ROOT);
        if (lower.contains("/service/") || lower.contains("/account/") || lower.contains("/cart/")) {
            return false;
        }
        // Lightspeed: /products/name-p123456789
        if (lower.matches("https?://[^/]+/products/[^/]+-p\\d+.*")) {
            return true;
        }
        // Lightspeed / legacy: /product-name-tarantula.html at site root
        if (lower.matches("https?://[^/]+/[^/]+\\.html$")
                && !lower.contains("/brands/")
                && !lower.contains("/tags/")
                && !lower.contains("/service/")) {
            String path = URI.create(url).getPath();
            if (path != null && path.length() > 2 && path.contains("-")) {
                return true;
            }
        }
        // Shopify-style product path (when sitemap lists them)
        if (lower.matches("https?://[^/]+/products/[^/]+$") && !lower.endsWith("/products/")) {
            // Lightspeed category pages: /products/Tarantulas-c141853044
            if (lower.matches("https?://[^/]+/products/[^/]+-c\\d+$")) {
                return false;
            }
            return true;
        }
        return false;
    }

    private static String categoryKeyFromUrl(String url, String hostPrefix) {
        if (url == null) {
            return null;
        }
        String path;
        try {
            path = URI.create(url).getPath();
        } catch (Exception ex) {
            return null;
        }
        if (path == null || path.isBlank() || "/".equals(path)) {
            return null;
        }
        String lower = path.toLowerCase(Locale.ROOT);
        if (isProductUrl(url)) {
            return null;
        }
        if (lower.contains("/products/") && lower.matches(".*/products/[^/]+-c\\d+/?$")) {
            return trimSlashes(path);
        }
        if (lower.startsWith("/animals/") && lower.split("/").length >= 3) {
            return trimSlashes(path);
        }
        if (lower.startsWith("/collection/") && lower.length() > "/collection/".length()) {
            return trimSlashes(path);
        }
        if (lower.startsWith("/catalog/") && lower.length() > "/catalog/".length()) {
            return trimSlashes(path);
        }
        return null;
    }

    private static String trimSlashes(String path) {
        String p = path;
        while (p.startsWith("/")) {
            p = p.substring(1);
        }
        while (p.endsWith("/")) {
            p = p.substring(0, p.length() - 1);
        }
        return p.isEmpty() ? null : p;
    }

    private static String categoryLabel(String key) {
        if (key == null) {
            return "";
        }
        String leaf = key.contains("/") ? key.substring(key.lastIndexOf('/') + 1) : key;
        return leaf.replace('-', ' ').replace('_', ' ');
    }

    private static String productNameFromUrl(String url) {
        if (url == null) {
            return null;
        }
        try {
            String path = URI.create(url).getPath();
            if (path == null) {
                return null;
            }
            String slug = path;
            if (slug.contains("/products/")) {
                slug = slug.substring(slug.indexOf("/products/") + "/products/".length());
                int pIdx = slug.lastIndexOf("-p");
                if (pIdx > 0 && slug.substring(pIdx + 2).matches("\\d+.*")) {
                    slug = slug.substring(0, pIdx);
                }
            } else if (slug.endsWith(".html")) {
                slug = slug.substring(slug.lastIndexOf('/') + 1, slug.length() - 5);
            } else {
                slug = slug.substring(slug.lastIndexOf('/') + 1);
            }
            slug = slug.replace('-', ' ').trim();
            if (slug.length() > 80) {
                slug = slug.substring(0, 77) + "...";
            }
            return slug.isEmpty() ? null : slug;
        } catch (Exception ex) {
            return null;
        }
    }

    public record SitemapCatalogSnapshot(
            boolean found,
            int productCountEstimate,
            int totalUrlCount,
            List<Map<String, Object>> storeCategories,
            List<String> sampleProductNames,
            String detail
    ) {
        static SitemapCatalogSnapshot empty(String detail) {
            return new SitemapCatalogSnapshot(false, 0, 0, List.of(), List.of(), detail);
        }
    }

    private static final class CategoryAgg {
        final String slug;
        final String name;
        int urlCount;

        CategoryAgg(String slug, String name) {
            this.slug = slug;
            this.name = name;
        }
    }
}
