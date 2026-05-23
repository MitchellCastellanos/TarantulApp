package com.tarantulapp.repository;

import com.tarantulapp.entity.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    Page<ChatMessage> findByThreadIdOrderByCreatedAtAsc(UUID threadId, Pageable pageable);

    List<ChatMessage> findTop1ByThreadIdOrderByCreatedAtDesc(UUID threadId);

    long countByThreadId(UUID threadId);

    long countByThreadIdAndSenderUserId(UUID threadId, UUID senderUserId);

    @Query(value = """
            WITH thread_pairs AS (
                SELECT t.id AS thread_id,
                       l.seller_user_id AS seller_id,
                       CASE WHEN t.user_low = l.seller_user_id THEN t.user_high ELSE t.user_low END AS buyer_id
                FROM chat_threads t
                INNER JOIN marketplace_listings l ON l.id = t.listing_id
                WHERE l.seller_user_id = CAST(:sellerId AS uuid)
                  AND t.listing_id IS NOT NULL
            ),
            first_buyer AS (
                SELECT tp.thread_id, MIN(m.created_at) AS first_at
                FROM thread_pairs tp
                INNER JOIN chat_messages m ON m.thread_id = tp.thread_id AND m.sender_user_id = tp.buyer_id
                GROUP BY tp.thread_id
            ),
            first_seller_reply AS (
                SELECT tp.thread_id, MIN(m.created_at) AS reply_at
                FROM thread_pairs tp
                INNER JOIN first_buyer fb ON fb.thread_id = tp.thread_id
                INNER JOIN chat_messages m ON m.thread_id = tp.thread_id
                    AND m.sender_user_id = tp.seller_id
                    AND m.created_at > fb.first_at
                GROUP BY tp.thread_id
            )
            SELECT AVG(EXTRACT(EPOCH FROM (fsr.reply_at - fb.first_at)) / 3600.0)
            FROM first_buyer fb
            INNER JOIN first_seller_reply fsr ON fsr.thread_id = fb.thread_id
            WHERE fsr.reply_at >= (now() - interval '60 days')
            """, nativeQuery = true)
    Double avgSellerResponseHoursLast60d(@Param("sellerId") UUID sellerId);
}
