package com.tarantulapp.repository;

import com.tarantulapp.entity.PartnerCartHandoffEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface PartnerCartHandoffEventRepository extends JpaRepository<PartnerCartHandoffEvent, UUID> {

    long countByCreatedAtAfter(Instant since);

    @Query("""
            select coalesce(sum(e.lineCount), 0), coalesce(sum(e.totalQuantity), 0)
            from PartnerCartHandoffEvent e
            where e.createdAt >= :since
            """)
    List<Object[]> sumLinesAndQtySince(@Param("since") Instant since);

    @Query("""
            select e.officialVendorId, e.vendorSlug, count(e), coalesce(sum(e.lineCount), 0), coalesce(sum(e.totalQuantity), 0)
            from PartnerCartHandoffEvent e
            where e.createdAt >= :since
            group by e.officialVendorId, e.vendorSlug
            order by count(e) desc
            """)
    List<Object[]> aggregateByVendorSince(@Param("since") Instant since);
}
