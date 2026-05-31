package com.tarantulapp.service;

import com.tarantulapp.entity.MarketplaceListing;
import com.tarantulapp.entity.VendorBoostCredit;
import com.tarantulapp.repository.MarketplaceListingRepository;
import com.tarantulapp.repository.VendorBoostCreditRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class VendorBoostCreditService {

    private static final Logger log = LoggerFactory.getLogger(VendorBoostCreditService.class);
    public static final String SOURCE_VENDOR_REFERRAL_SIGNUP = "vendor_referral_signup";
    public static final String SOURCE_ADMIN_GRANT = "admin_grant";
    private static final int BOOST_DAYS = 7;

    private final VendorBoostCreditRepository vendorBoostCreditRepository;
    private final MarketplaceListingRepository marketplaceListingRepository;

    public VendorBoostCreditService(VendorBoostCreditRepository vendorBoostCreditRepository,
                                    MarketplaceListingRepository marketplaceListingRepository) {
        this.vendorBoostCreditRepository = vendorBoostCreditRepository;
        this.marketplaceListingRepository = marketplaceListingRepository;
    }

    @Transactional(readOnly = true)
    public long countAvailable(UUID userId) {
        if (userId == null) {
            return 0L;
        }
        return vendorBoostCreditRepository.countByUserIdAndConsumedAtIsNull(userId);
    }

    @Transactional(readOnly = true)
    public Map<UUID, Long> countAvailable(Collection<UUID> userIds) {
        Map<UUID, Long> out = new HashMap<>();
        if (userIds == null || userIds.isEmpty()) {
            return out;
        }
        for (Object[] row : vendorBoostCreditRepository.countAvailableByUserIds(userIds)) {
            if (row == null || row.length < 2 || !(row[0] instanceof UUID uid)) {
                continue;
            }
            long n = row[1] instanceof Number num ? num.longValue() : 0L;
            out.put(uid, n);
        }
        return out;
    }

    @Transactional
    public void grantFromVendorReferral(UUID vendorUserId, UUID referralRedemptionId) {
        if (vendorUserId == null || referralRedemptionId == null) {
            return;
        }
        if (vendorBoostCreditRepository.existsByReferralRedemptionId(referralRedemptionId)) {
            return;
        }
        VendorBoostCredit credit = new VendorBoostCredit();
        credit.setUserId(vendorUserId);
        credit.setSource(SOURCE_VENDOR_REFERRAL_SIGNUP);
        credit.setReferralRedemptionId(referralRedemptionId);
        vendorBoostCreditRepository.save(credit);
        log.info("Vendor boost credit granted vendor={} redemption={}", vendorUserId, referralRedemptionId);
    }

    @Transactional
    public long grantAdminCredits(UUID userId, int count) {
        if (userId == null) {
            throw new IllegalArgumentException("USER_NOT_FOUND");
        }
        int n = Math.min(Math.max(count, 1), 100);
        for (int i = 0; i < n; i++) {
            VendorBoostCredit credit = new VendorBoostCredit();
            credit.setUserId(userId);
            credit.setSource(SOURCE_ADMIN_GRANT);
            vendorBoostCreditRepository.save(credit);
        }
        log.info("Vendor boost credits admin-granted user={} count={}", userId, n);
        return countAvailable(userId);
    }

    @Transactional
    public boolean consumeForListing(UUID userId, UUID listingId) {
        if (userId == null || listingId == null) {
            return false;
        }
        MarketplaceListing listing = marketplaceListingRepository.findById(listingId).orElse(null);
        if (listing == null || !listing.getSellerUserId().equals(userId)) {
            return false;
        }
        VendorBoostCredit credit = vendorBoostCreditRepository.findOldestAvailable(userId).orElse(null);
        if (credit == null) {
            return false;
        }
        applyBoostWindow(listing);
        marketplaceListingRepository.save(listing);
        credit.setConsumedAt(Instant.now());
        credit.setListingId(listingId);
        vendorBoostCreditRepository.save(credit);
        log.info("Vendor boost credit consumed user={} listing={} credit={}", userId, listingId, credit.getId());
        return true;
    }

    private void applyBoostWindow(MarketplaceListing listing) {
        Instant now = Instant.now();
        Instant start = listing.getBoostedUntil() != null && listing.getBoostedUntil().isAfter(now)
                ? listing.getBoostedUntil()
                : now;
        listing.setBoostedUntil(start.plus(BOOST_DAYS, ChronoUnit.DAYS));
    }
}
