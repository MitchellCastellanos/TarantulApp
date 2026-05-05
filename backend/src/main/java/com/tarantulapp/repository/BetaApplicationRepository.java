package com.tarantulapp.repository;

import com.tarantulapp.entity.BetaApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BetaApplicationRepository extends JpaRepository<BetaApplication, UUID> {

    @Modifying
    @Query("update BetaApplication b set b.approvedUserId = null where b.approvedUserId = :userId")
    void clearApprovedUserId(@Param("userId") UUID userId);

    List<BetaApplication> findByStatusOrderByCreatedAtDesc(String status);
    List<BetaApplication> findAllByOrderByCreatedAtDesc();
    Optional<BetaApplication> findFirstByEmailIgnoreCaseAndStatusOrderByReviewedAtDesc(String email, String status);

    List<BetaApplication> findByApprovedUserIdInAndStatus(Collection<UUID> approvedUserIds, String status);

    Optional<BetaApplication> findTopByApprovedUserIdAndStatusOrderByReviewedAtDesc(UUID approvedUserId, String status);

    long countByStatus(String status);
    long countByCreatedAtAfter(LocalDateTime cutoff);

    @Query("select coalesce(lower(b.country), '') as country, count(b) as total from BetaApplication b group by lower(b.country) order by count(b) desc")
    List<Object[]> countGroupByCountry();

    @Query("select coalesce(lower(b.experienceLevel), '') as level, count(b) as total from BetaApplication b group by lower(b.experienceLevel) order by count(b) desc")
    List<Object[]> countGroupByExperienceLevel();
}
