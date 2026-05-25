package com.tarantulapp.service;

import com.tarantulapp.repository.MarketplaceListingRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class VendorMxTierService {

    private final MarketplaceListingRepository marketplaceListingRepository;

    public VendorMxTierService(MarketplaceListingRepository marketplaceListingRepository) {
        this.marketplaceListingRepository = marketplaceListingRepository;
    }

    public long countSoldLast30Days(UUID sellerUserId) {
        Instant since = Instant.now().minus(30, ChronoUnit.DAYS);
        return marketplaceListingRepository.countSoldBySellerSince(sellerUserId, since);
    }

    public VendorMxTier currentTier(UUID sellerUserId) {
        return VendorMxTier.fromSoldCount(countSoldLast30Days(sellerUserId));
    }

    public Map<String, Object> tierPayload(UUID sellerUserId) {
        long sold = countSoldLast30Days(sellerUserId);
        VendorMxTier tier = VendorMxTier.fromSoldCount(sold);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("soldLast30Days", sold);
        out.put("tier", tier.getKey());
        out.put("monthlyMxn", tier.getMonthlyMxn());
        out.put("requiresPaidSubscription", tier.requiresPaidSubscription());
        out.put("salesRangeMin", tier.getMinSales());
        out.put("salesRangeMax", tier.getMaxSales() == Integer.MAX_VALUE ? null : tier.getMaxSales());
        return out;
    }
}
