package com.tarantulapp.repository;

import com.tarantulapp.entity.User;
import com.tarantulapp.entity.UserPlan;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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
    List<User> findTop10ByOrderByCreatedAtDesc();
    List<User> findByPlanAndTrialEndsAtBetween(
            UserPlan plan,
            LocalDateTime from,
            LocalDateTime to
    );

    List<User> findByIsBetaTesterTrueOrderByCreatedAtDesc();
}
