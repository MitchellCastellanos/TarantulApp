package com.tarantulapp.repository;

import com.tarantulapp.entity.ListingEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ListingEventRepository extends JpaRepository<ListingEvent, UUID> {

    /**
     * Per-listing aggregates for the seller dashboard. Returns rows of:
     * (listingId, kind, totalCount, uniqueSessionCount) for the given window.
     */
    @Query("""
            select e.listingId, e.kind, count(e), count(distinct e.anonSessionId)
            from ListingEvent e
            where e.listingId in :listingIds
              and e.occurredAt >= :since
            group by e.listingId, e.kind
            """)
    List<Object[]> aggregateByListingAndKindSince(
            @Param("listingIds") List<UUID> listingIds,
            @Param("since") Instant since);

    /**
     * Network-wide kind totals since a timestamp. Returns (kind, count, uniqueSessionCount).
     */
    @Query("""
            select e.kind, count(e), count(distinct e.anonSessionId)
            from ListingEvent e
            where e.occurredAt >= :since
            group by e.kind
            """)
    List<Object[]> networkTotalsSince(@Param("since") Instant since);

    @Query("""
            select e.kind, count(e), count(distinct e.anonSessionId)
            from ListingEvent e
            where e.listingSource = 'partner'
              and e.occurredAt >= :since
            group by e.kind
            """)
    List<Object[]> partnerTotalsSince(@Param("since") Instant since);

    @Query("""
            select count(e)
            from ListingEvent e
            where e.kind = 'storefront_view'
              and e.listingSource = 'partner'
              and e.occurredAt >= :since
            """)
    long countPartnerStorefrontViewsSince(@Param("since") Instant since);

    /**
     * Seller leaderboard by tap-to-contact rate. Returns rows of
     * (sellerUserId, views, contactTaps) for events in [since, until).
     */
    @Query(value = """
            SELECT l.seller_user_id,
                   SUM(CASE WHEN e.kind = 'view' THEN 1 ELSE 0 END) AS views,
                   SUM(CASE WHEN e.kind = 'contact_tap' THEN 1 ELSE 0 END) AS taps
            FROM listing_events e
            INNER JOIN marketplace_listings l ON l.id = e.listing_id
            WHERE e.occurred_at >= :since
              AND e.occurred_at < :until
              AND e.listing_source = 'peer'
            GROUP BY l.seller_user_id
            HAVING SUM(CASE WHEN e.kind = 'view' THEN 1 ELSE 0 END) >= :minViews
            ORDER BY (CAST(SUM(CASE WHEN e.kind = 'contact_tap' THEN 1 ELSE 0 END) AS double precision)
                      / NULLIF(SUM(CASE WHEN e.kind = 'view' THEN 1 ELSE 0 END), 0)) DESC,
                     SUM(CASE WHEN e.kind = 'contact_tap' THEN 1 ELSE 0 END) DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> topSellersByTapRateBetween(@Param("since") Instant since,
                                              @Param("until") Instant until,
                                              @Param("minViews") long minViews,
                                              @Param("limit") int limit);
}
