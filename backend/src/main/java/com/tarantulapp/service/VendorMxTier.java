package com.tarantulapp.service;

/**
 * México vendor subscription tiers — sales reported via listings marked {@code sold} in the last 30 days.
 */
public enum VendorMxTier {
    STARTER("starter", 0, 3, 0),
    ACTIVO("activo", 4, 12, 199),
    PLUS("plus", 13, 30, 499),
    PRO_SHOP("pro_shop", 31, Integer.MAX_VALUE, 999);

    private final String key;
    private final int minSales;
    private final int maxSales;
    private final int monthlyMxn;

    VendorMxTier(String key, int minSales, int maxSales, int monthlyMxn) {
        this.key = key;
        this.minSales = minSales;
        this.maxSales = maxSales;
        this.monthlyMxn = monthlyMxn;
    }

    public String getKey() {
        return key;
    }

    public int getMinSales() {
        return minSales;
    }

    public int getMaxSales() {
        return maxSales;
    }

    public int getMonthlyMxn() {
        return monthlyMxn;
    }

    public boolean requiresPaidSubscription() {
        return monthlyMxn > 0;
    }

    public static VendorMxTier fromSoldCount(long soldCount) {
        long n = Math.max(0, soldCount);
        if (n <= STARTER.maxSales) {
            return STARTER;
        }
        if (n <= ACTIVO.maxSales) {
            return ACTIVO;
        }
        if (n <= PLUS.maxSales) {
            return PLUS;
        }
        return PRO_SHOP;
    }
}
