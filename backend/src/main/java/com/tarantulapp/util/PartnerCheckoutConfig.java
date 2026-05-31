package com.tarantulapp.util;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.PartnerProgramTier;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Reads the in-app checkout settings a partner/admin stores inside the vendor
 * {@code feedConfig} jsonb and resolves them against the beta eligibility rules.
 *
 * <p>Shape stored under {@code feedConfig}:
 * <pre>
 * {
 *   "checkoutMode": "website" | "tarantulapp",   // partner's preferred channel
 *   "inAppCheckout": {
 *     "enabled": true,                            // admin master switch (Canada only)
 *     "payoutMode": "platform" | "connect",
 *     "stripeAccountId": "acct_...",              // for connect payouts (scaffold)
 *     "commissionPercent": 5,                      // our cut
 *     "commissionWaived": false,                   // admin waive / coupon
 *     "providers": ["stripe", "paypal", "klarna"]
 *   }
 * }
 * </pre>
 */
public final class PartnerCheckoutConfig {

    public static final String MODE_WEBSITE = "website";
    public static final String MODE_IN_APP = "tarantulapp";

    private final boolean inAppEnabled;
    private final boolean eligibleCountryAndTier;
    private final String preferredMode;
    private final String payoutMode;
    private final String stripeAccountId;
    private final BigDecimal commissionPercent;
    private final boolean commissionWaived;
    private final List<String> providers;

    private PartnerCheckoutConfig(boolean inAppEnabled, boolean eligibleCountryAndTier, String preferredMode,
                                  String payoutMode, String stripeAccountId, BigDecimal commissionPercent,
                                  boolean commissionWaived, List<String> providers) {
        this.inAppEnabled = inAppEnabled;
        this.eligibleCountryAndTier = eligibleCountryAndTier;
        this.preferredMode = preferredMode;
        this.payoutMode = payoutMode;
        this.stripeAccountId = stripeAccountId;
        this.commissionPercent = commissionPercent;
        this.commissionWaived = commissionWaived;
        this.providers = providers;
    }

    @SuppressWarnings("unchecked")
    public static PartnerCheckoutConfig fromVendor(OfficialVendor vendor) {
        Map<String, Object> feed = vendor.getFeedConfig() == null ? Map.of() : vendor.getFeedConfig();
        Object inAppRaw = feed.get("inAppCheckout");
        Map<String, Object> inApp = inAppRaw instanceof Map ? (Map<String, Object>) inAppRaw : Map.of();

        boolean enabled = asBool(inApp.get("enabled"), false);
        PartnerProgramTier tier = vendor.getPartnerProgramTier();
        boolean eligible = RegionPolicy.isInAppCheckoutCountry(vendor.getCountry())
                && tier != null && tier.isOfficialPartner();

        String preferred = asString(feed.get("checkoutMode"), MODE_WEBSITE).toLowerCase(Locale.ROOT);
        if (!MODE_IN_APP.equals(preferred)) {
            preferred = MODE_WEBSITE;
        }
        String payout = asString(inApp.get("payoutMode"), "platform").toLowerCase(Locale.ROOT);
        if (!"connect".equals(payout)) {
            payout = "platform";
        }
        String acct = asString(inApp.get("stripeAccountId"), "").trim();
        BigDecimal pct = asDecimal(inApp.get("commissionPercent"));
        boolean waived = asBool(inApp.get("commissionWaived"), false);

        List<String> providers = new ArrayList<>();
        Object provRaw = inApp.get("providers");
        if (provRaw instanceof List<?> list) {
            for (Object o : list) {
                if (o != null) {
                    providers.add(String.valueOf(o).trim().toLowerCase(Locale.ROOT));
                }
            }
        }
        if (providers.isEmpty()) {
            providers.add("stripe");
        }
        return new PartnerCheckoutConfig(enabled, eligible, preferred, payout, acct, pct, waived, providers);
    }

    /** True when an admin enabled in-app AND the vendor meets the Canada + official-tier gate. */
    public boolean inAppAvailable() {
        return inAppEnabled && eligibleCountryAndTier;
    }

    /** Resolved channel after applying availability: where checkout actually happens. */
    public String effectiveMode() {
        return inAppAvailable() && MODE_IN_APP.equals(preferredMode) ? MODE_IN_APP : MODE_WEBSITE;
    }

    public boolean usesInAppCheckout() {
        return MODE_IN_APP.equals(effectiveMode());
    }

    public String preferredMode() {
        return preferredMode;
    }

    public String payoutMode() {
        return payoutMode;
    }

    public String stripeAccountId() {
        return stripeAccountId;
    }

    public List<String> providers() {
        return providers;
    }

    public boolean commissionWaived() {
        return commissionWaived;
    }

    /** Commission rate actually applied (0 when waived), as a fraction (e.g. 0.05). */
    public BigDecimal effectiveCommissionRate() {
        if (commissionWaived || commissionPercent == null) {
            return BigDecimal.ZERO;
        }
        return commissionPercent.movePointLeft(2);
    }

    public BigDecimal commissionPercent() {
        return commissionPercent == null ? BigDecimal.ZERO : commissionPercent;
    }

    private static boolean asBool(Object o, boolean def) {
        if (o instanceof Boolean b) return b;
        if (o instanceof String s) return "true".equalsIgnoreCase(s.trim());
        return def;
    }

    private static String asString(Object o, String def) {
        return o == null ? def : String.valueOf(o);
    }

    private static BigDecimal asDecimal(Object o) {
        if (o instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        if (o instanceof String s && !s.isBlank()) {
            try {
                return new BigDecimal(s.trim());
            } catch (NumberFormatException ignored) {
                return BigDecimal.ZERO;
            }
        }
        return BigDecimal.ZERO;
    }
}
