package com.tarantulapp.repository;

import com.tarantulapp.entity.User;
import com.tarantulapp.entity.UserPlan;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<User> findByPublicHandleIgnoreCase(String publicHandle);
    boolean existsByPublicHandleIgnoreCase(String publicHandle);
    boolean existsByPublicHandleIgnoreCaseAndIdNot(String publicHandle, UUID id);
    @Query("""
            select u from User u
            where coalesce(u.searchVisible, true) = true
              and u.publicHandle is not null
              and trim(u.publicHandle) <> ''
              and (
                lower(u.publicHandle) like lower(concat(:query, '%'))
                or lower(coalesce(u.displayName, '')) like lower(concat('%', :query, '%'))
              )
            order by u.publicHandle asc
            """)
    List<User> searchPublicProfiles(String query, Pageable pageable);
    long countByCreatedAtAfter(LocalDateTime from);

    @Query("SELECT u FROM User u ORDER BY u.lastActivityAt DESC NULLS LAST, u.createdAt DESC")
    List<User> findUsersForAdminOrderByLastActivityDesc(Pageable pageable);

    @Query("select u from User u order by u.createdAt desc")
    List<User> findUsersForAdminOrderByCreatedDesc(Pageable pageable);

    @Query("""
            select u from User u
            where u.verifiedBreeder = true
            order by u.verifiedBreederAt desc nulls last, u.createdAt desc
            """)
    List<User> findVerifiedBreedersForAdmin(Pageable pageable);

    long countByVerifiedBreederTrue();

    Optional<User> findByVendorInviteToken(UUID vendorInviteToken);

    @Query("""
            select u from User u
            where u.vendorInviteToken is not null
              and coalesce(u.verifiedBreeder, false) = false
              and u.vendorInviteExpiresAt is not null
              and u.vendorInviteExpiresAt > :now
            order by u.vendorInviteSentAt desc nulls last, u.createdAt desc
            """)
    List<User> findPendingVendorInvites(@Param("now") Instant now, Pageable pageable);

    @Query("""
            select count(u) from User u
            where u.vendorInviteToken is not null
              and coalesce(u.verifiedBreeder, false) = false
              and u.vendorInviteExpiresAt is not null
              and u.vendorInviteExpiresAt > :now
            """)
    long countPendingVendorInvitesNonExpired(@Param("now") Instant now);
    List<User> findByPlanAndTrialEndsAtBetween(
            UserPlan plan,
            LocalDateTime from,
            LocalDateTime to
    );

    List<User> findByIsBetaTesterTrueOrderByCreatedAtDesc();

    long countByIsBetaTesterTrue();

    @Query("""
            select u from User u
            where u.googleGroupSyncStatus is null or u.googleGroupSyncStatus <> 'synced'
            """)
    List<User> findUsersNeedingGoogleGroupSync();

    @Modifying
    @Query("update User u set u.lastActivityAt = :ts where u.id = :id")
    void touchLastActivity(@Param("id") UUID id, @Param("ts") LocalDateTime ts);
}
