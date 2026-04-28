package com.tarantulapp.service;

import com.tarantulapp.entity.MarketplaceListing;
import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.PartnerListing;
import com.tarantulapp.entity.PartnerListingAvailability;
import com.tarantulapp.entity.PartnerListingStatus;
import com.tarantulapp.entity.PartnerProgramTier;
import com.tarantulapp.entity.User;
import com.tarantulapp.repository.BehaviorLogRepository;
import com.tarantulapp.repository.FeedingLogRepository;
import com.tarantulapp.repository.MarketplaceListingRepository;
import com.tarantulapp.repository.MoltLogRepository;
import com.tarantulapp.repository.OfficialVendorRepository;
import com.tarantulapp.repository.PartnerListingRepository;
import com.tarantulapp.repository.SellerReviewRepository;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.util.FileStorageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarketplaceServicePublicListingsTest {

    @Mock private MarketplaceListingRepository marketplaceListingRepository;
    @Mock private PartnerListingRepository partnerListingRepository;
    @Mock private OfficialVendorRepository officialVendorRepository;
    @Mock private SellerReviewRepository sellerReviewRepository;
    @Mock private UserRepository userRepository;
    @Mock private TarantulaRepository tarantulaRepository;
    @Mock private FeedingLogRepository feedingLogRepository;
    @Mock private MoltLogRepository moltLogRepository;
    @Mock private BehaviorLogRepository behaviorLogRepository;
    @Mock private FileStorageService fileStorageService;
    @Mock private BillingService billingService;

    @InjectMocks
    private MarketplaceService marketplaceService;

    @Test
    void publicListingsReturnsPartnerFirstThenPeerWithSourceMetadata() {
        UUID vendorId = UUID.randomUUID();
        OfficialVendor vendor = new OfficialVendor();
        vendor.setId(vendorId);
        vendor.setName("Test Partner");
        vendor.setSlug("test-partner");
        vendor.setWebsiteUrl("https://example.com");
        vendor.setBadge("Certified partner");
        vendor.setPartnerProgramTier(PartnerProgramTier.STRATEGIC_FOUNDER);

        PartnerListing partner = new PartnerListing();
        partner.setId(UUID.randomUUID());
        partner.setOfficialVendorId(vendorId);
        partner.setTitle("Partner listing");
        partner.setDescription("");
        partner.setSpeciesNameRaw("Brachypelma hamorii");
        partner.setSpeciesNormalized("Brachypelma hamorii");
        partner.setCurrency("USD");
        partner.setPriceAmount(new BigDecimal("10.00"));
        partner.setStatus(PartnerListingStatus.ACTIVE);
        partner.setAvailability(PartnerListingAvailability.IN_STOCK);
        partner.setProductCanonicalUrl("https://partner.example.com/p/1");
        partner.setLastSyncedAt(Instant.parse("2026-01-01T12:00:00Z"));
        partner.setCountry("Mexico");

        UUID sellerId = UUID.randomUUID();
        MarketplaceListing peer = new MarketplaceListing();
        peer.setId(UUID.randomUUID());
        peer.setSellerUserId(sellerId);
        peer.setTitle("Peer listing");
        peer.setStatus("active");
        peer.setCurrency("MXN");

        User seller = new User();
        seller.setId(sellerId);
        seller.setEmail("keeper@example.com");
        seller.setDisplayName("Keeper");

        when(officialVendorRepository.findByPartnerProgramTierInAndListingImportEnabledTrueAndEnabledTrueOrderByInfluenceScoreDesc(
                eq(List.of(PartnerProgramTier.STRATEGIC_FOUNDER, PartnerProgramTier.STRATEGIC_PARTNER))))
                .thenReturn(List.of(vendor));
        when(partnerListingRepository.findTop200ByStatusOrderByLastSyncedAtDesc(PartnerListingStatus.ACTIVE))
                .thenReturn(List.of(partner));
        when(marketplaceListingRepository.findTop100ByStatusOrderByCreatedAtDesc("active"))
                .thenReturn(List.of(peer));
        when(userRepository.findById(sellerId)).thenReturn(Optional.of(seller));

        List<Map<String, Object>> out = marketplaceService.publicListings(
                null, "active", null, null, null, null, null, null);

        assertEquals(2, out.size());
        assertEquals("partner", out.get(0).get("source"));
        assertTrue(Boolean.TRUE.equals(out.get(0).get("isPartner")));
        assertEquals("https://partner.example.com/p/1", out.get(0).get("canonicalUrl"));

        assertEquals("peer", out.get(1).get("source"));
        assertFalse(Boolean.TRUE.equals(out.get(1).get("isPartner")));
    }

    @Test
    void publicListingsDropsPartnerRowsWhenNoEligibleStrategicVendor() {
        UUID vendorId = UUID.randomUUID();
        PartnerListing partner = new PartnerListing();
        partner.setId(UUID.randomUUID());
        partner.setOfficialVendorId(vendorId);
        partner.setTitle("Orphan partner");
        partner.setStatus(PartnerListingStatus.ACTIVE);
        partner.setAvailability(PartnerListingAvailability.UNKNOWN);
        partner.setProductCanonicalUrl("https://partner.example.com/p/x");
        partner.setCurrency("USD");
        partner.setLastSyncedAt(Instant.now());

        UUID sellerId = UUID.randomUUID();
        MarketplaceListing peer = new MarketplaceListing();
        peer.setId(UUID.randomUUID());
        peer.setSellerUserId(sellerId);
        peer.setTitle("Peer only");
        peer.setStatus("active");
        peer.setCurrency("MXN");

        User seller = new User();
        seller.setId(sellerId);
        seller.setEmail("k2@example.com");

        when(officialVendorRepository.findByPartnerProgramTierInAndListingImportEnabledTrueAndEnabledTrueOrderByInfluenceScoreDesc(
                eq(List.of(PartnerProgramTier.STRATEGIC_FOUNDER, PartnerProgramTier.STRATEGIC_PARTNER))))
                .thenReturn(List.of());
        when(partnerListingRepository.findTop200ByStatusOrderByLastSyncedAtDesc(PartnerListingStatus.ACTIVE))
                .thenReturn(List.of(partner));
        when(marketplaceListingRepository.findTop100ByStatusOrderByCreatedAtDesc("active"))
                .thenReturn(List.of(peer));
        when(userRepository.findById(sellerId)).thenReturn(Optional.of(seller));

        List<Map<String, Object>> out = marketplaceService.publicListings(
                null, "active", null, null, null, null, null, null);

        assertEquals(1, out.size());
        assertEquals("peer", out.get(0).get("source"));
    }

    @Test
    void publicListingsReducesPartnerShareAsPeerSupplyGrows() {
        UUID vendorId = UUID.randomUUID();
        OfficialVendor vendor = new OfficialVendor();
        vendor.setId(vendorId);
        vendor.setName("Founder Vendor");
        vendor.setPartnerProgramTier(PartnerProgramTier.STRATEGIC_FOUNDER);

        List<PartnerListing> partners = new ArrayList<>();
        for (int i = 0; i < 40; i++) {
            PartnerListing p = new PartnerListing();
            p.setId(UUID.randomUUID());
            p.setOfficialVendorId(vendorId);
            p.setTitle("Partner " + i);
            p.setStatus(PartnerListingStatus.ACTIVE);
            p.setAvailability(PartnerListingAvailability.IN_STOCK);
            p.setCurrency("USD");
            p.setProductCanonicalUrl("https://partner.example.com/p/" + i);
            p.setLastSyncedAt(Instant.now().minusSeconds(i));
            partners.add(p);
        }

        List<MarketplaceListing> peers = new ArrayList<>();
        for (int i = 0; i < 60; i++) {
            MarketplaceListing m = new MarketplaceListing();
            m.setId(UUID.randomUUID());
            m.setSellerUserId(UUID.randomUUID());
            m.setTitle("Peer " + i);
            m.setStatus("active");
            m.setCurrency("MXN");
            peers.add(m);
        }

        when(officialVendorRepository.findByPartnerProgramTierInAndListingImportEnabledTrueAndEnabledTrueOrderByInfluenceScoreDesc(
                eq(List.of(PartnerProgramTier.STRATEGIC_FOUNDER, PartnerProgramTier.STRATEGIC_PARTNER))))
                .thenReturn(List.of(vendor));
        when(partnerListingRepository.findTop200ByStatusOrderByLastSyncedAtDesc(PartnerListingStatus.ACTIVE))
                .thenReturn(partners);
        when(marketplaceListingRepository.findTop100ByStatusOrderByCreatedAtDesc("active"))
                .thenReturn(peers);
        when(userRepository.findById(org.mockito.ArgumentMatchers.any(UUID.class))).thenReturn(Optional.empty());

        List<Map<String, Object>> out = marketplaceService.publicListings(
                null, "active", null, null, null, null, null, null);

        long partnerCount = out.stream().filter(row -> "partner".equals(row.get("source"))).count();
        long peerCount = out.stream().filter(row -> "peer".equals(row.get("source"))).count();
        assertTrue(peerCount >= 60);
        assertTrue(partnerCount <= 10, "Partner rows should shrink to <=15% share at high peer inventory");
    }
}
