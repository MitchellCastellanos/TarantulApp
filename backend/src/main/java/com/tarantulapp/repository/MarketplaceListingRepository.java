package com.tarantulapp.repository;

import com.tarantulapp.entity.MarketplaceListing;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MarketplaceListingRepository extends JpaRepository<MarketplaceListing, UUID> {
    List<MarketplaceListing> findTop100ByStatusOrderByCreatedAtDesc(String status);
    List<MarketplaceListing> findTop100ByStatusAndTitleContainingIgnoreCaseOrderByCreatedAtDesc(String status, String title);
    List<MarketplaceListing> findTop100ByStatusAndSpeciesNameContainingIgnoreCaseOrderByCreatedAtDesc(String status, String speciesName);
    List<MarketplaceListing> findTop100BySellerUserIdOrderByCreatedAtDesc(UUID sellerUserId);
}
