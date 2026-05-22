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
}
