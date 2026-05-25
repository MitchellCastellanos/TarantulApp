package com.tarantulapp.repository;

import com.tarantulapp.entity.MarketplaceListing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface MarketplaceListingRepository extends JpaRepository<MarketplaceListing, UUID> {
    List<MarketplaceListing> findTop100ByStatusOrderByCreatedAtDesc(String status);
    List<MarketplaceListing> findTop100ByStatusAndTitleContainingIgnoreCaseOrderByCreatedAtDesc(String status, String title);
    List<MarketplaceListing> findTop100ByStatusAndSpeciesNameContainingIgnoreCaseOrderByCreatedAtDesc(String status, String speciesName);
    long countByStatusIgnoreCaseAndSpeciesNameIgnoreCase(String status, String speciesName);
    List<MarketplaceListing> findTop20ByStatusIgnoreCaseAndSpeciesNameIgnoreCaseOrderByCreatedAtDesc(String status, String speciesName);
    List<MarketplaceListing> findTop100BySellerUserIdOrderByCreatedAtDesc(UUID sellerUserId);
    long countBySellerUserId(UUID sellerUserId);
    long countBySellerUserIdAndStatusIgnoreCase(UUID sellerUserId, String status);

    @Query("""
            select count(l) from MarketplaceListing l
            where l.sellerUserId = :sellerId
              and lower(l.status) = 'sold'
              and l.updatedAt >= :since
            """)
    long countSoldBySellerSince(@Param("sellerId") UUID sellerId, @Param("since") Instant since);

    long countByStatusIgnoreCase(String status);

    @Query("""
            select l.sellerUserId, lower(l.status), count(l)
            from MarketplaceListing l
            where l.sellerUserId in :sellerIds
            group by l.sellerUserId, lower(l.status)
            """)
    List<Object[]> countBySellerGroupedByStatusLower(@Param("sellerIds") List<UUID> sellerIds);

    @Query("""
            select l.sellerUserId, l.listingCategory, count(l)
            from MarketplaceListing l
            where l.sellerUserId in :sellerIds
              and lower(l.status) = 'active'
            group by l.sellerUserId, l.listingCategory
            """)
    List<Object[]> countActiveBySellerGroupedByCategory(@Param("sellerIds") List<UUID> sellerIds);

    @Modifying
    @Query(value = "delete from marketplace_listings where title like :prefix", nativeQuery = true)
    int deleteDemoByTitlePrefix(String prefix);
}
