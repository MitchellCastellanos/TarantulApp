package com.tarantulapp.service.vendors;

import java.util.Locale;

/**
 * Platform fingerprints from public storefront HTML (when JSON APIs are unavailable).
 */
public final class StoreHtmlPlatformProbe {

    private StoreHtmlPlatformProbe() {
    }

    public static String detect(String html) {
        if (html == null || html.isBlank()) {
            return null;
        }
        String lower = html.toLowerCase(Locale.ROOT);
        if (lower.contains("lightspeed")
                || lower.contains("webshopapp.com")
                || lower.contains("seo.shop")
                || lower.contains("powered by lightspeed")) {
            return "lightspeed";
        }
        if (lower.contains("cdn.shopify.com")
                || lower.contains("shopify.com/s/files")
                || (lower.contains("shopify") && lower.contains("shopify-section"))) {
            return "shopify";
        }
        if (lower.contains("woocommerce") || lower.contains("wp-content/plugins/woocommerce")) {
            return "woocommerce";
        }
        if (lower.contains("bigcommerce.com") || lower.contains("bigcommerce")) {
            return "bigcommerce";
        }
        if (lower.contains("squarespace")) {
            return "squarespace";
        }
        if (lower.contains("wix.com") || lower.contains("wixstatic.com")) {
            return "wix";
        }
        if (lower.contains("magento") || lower.contains("mage/cookies")) {
            return "magento";
        }
        return null;
    }
}
