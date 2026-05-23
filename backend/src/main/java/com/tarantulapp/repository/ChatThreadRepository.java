package com.tarantulapp.repository;

import com.tarantulapp.entity.ChatThread;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatThreadRepository extends JpaRepository<ChatThread, UUID> {

    Optional<ChatThread> findByUserLowAndUserHighAndListingIdIsNull(UUID userLow, UUID userHigh);

    Optional<ChatThread> findByUserLowAndUserHighAndListingId(UUID userLow, UUID userHigh, UUID listingId);

    List<ChatThread> findByListingId(UUID listingId);

    @Query("select t from ChatThread t where t.userLow = :uid or t.userHigh = :uid order by t.createdAt desc")
    Page<ChatThread> findThreadsForUser(@Param("uid") UUID userId, Pageable pageable);

    @Query(value = """
            select count(*) from chat_threads t
            where t.listing_id is not null
              and (t.user_low = :uid or t.user_high = :uid)
            """, nativeQuery = true)
    long countListingThreadsForSeller(@Param("uid") UUID userId);

    @Query(value = """
            select count(*) from chat_threads t
            where t.listing_id is not null
              and (t.user_low = :uid or t.user_high = :uid)
              and exists (
                select 1 from chat_messages m
                where m.thread_id = t.id and m.sender_user_id = :uid
              )
            """, nativeQuery = true)
    long countListingThreadsWithSellerReply(@Param("uid") UUID userId);
}
