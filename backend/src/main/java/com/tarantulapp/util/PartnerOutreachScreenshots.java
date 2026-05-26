package com.tarantulapp.util;

import java.util.List;

/** Public URLs for Monarch founding-partner screenshots (see frontend/public/outreach/monarch/). */
public final class PartnerOutreachScreenshots {

    public static final String MONARCH_SLUG = "monarch-reptiles";
    public static final String PUBLIC_PATH_PREFIX = "/outreach/monarch/";

    public static final String STOREFRONT_WIDE = "01-storefront-wide.webp";
    public static final String MARKETPLACE_CARD = "02-marketplace-card.webp";
    public static final String CART_HANDOFF = "03-cart-handoff.webp";

    private PartnerOutreachScreenshots() {
    }

    public static String publicUrl(String appBaseUrl, String filename) {
        String base = appBaseUrl == null || appBaseUrl.isBlank() ? BetaMailBodies.DEFAULT_APP_URL : appBaseUrl.trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + PUBLIC_PATH_PREFIX + filename;
    }

    /** Images included in partner_outreach_intro when deployed. */
    public static List<String> introEmailImageUrls(String appBaseUrl) {
        return List.of(
                publicUrl(appBaseUrl, STOREFRONT_WIDE),
                publicUrl(appBaseUrl, MARKETPLACE_CARD));
    }

    public static String monarchStorefrontUrl(String appBaseUrl) {
        String base = appBaseUrl == null || appBaseUrl.isBlank() ? BetaMailBodies.DEFAULT_APP_URL : appBaseUrl.trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/partner/" + MONARCH_SLUG;
    }
}
