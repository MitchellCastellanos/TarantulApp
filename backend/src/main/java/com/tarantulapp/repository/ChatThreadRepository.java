package com.tarantulapp.repository;

import com.tarantulapp.entity.ChatThread;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ChatThreadRepository extends JpaRepository<ChatThread, UUID> {

    Optional<ChatThread> findByUserLowAndUserHighAndListingIdIsNull(UUID userLow, UUID userHigh);

    Optional<ChatThread> findByUserLowAndUserHighAndListingId(UUID userLow, UUID userHigh, UUID listingId);

    @Query("select t from ChatThread t where t.userLow = :uid or t.userHigh = :uid order by t.createdAt desc")
    Page<ChatThread> findThreadsForUser(@Param("uid") UUID userId, Pageable pageable);
}
