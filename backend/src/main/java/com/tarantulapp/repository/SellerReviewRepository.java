package com.tarantulapp.repository;

import com.tarantulapp.entity.SellerReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface SellerReviewRepository extends JpaRepository<SellerReview, UUID> {
    List<SellerReview> findTop50BySellerUserIdOrderByCreatedAtDesc(UUID sellerUserId);

    boolean existsBySellerUserIdAndReviewerUserId(UUID sellerUserId, UUID reviewerUserId);

    @Query("select coalesce(avg(r.rating), 0) from SellerReview r where r.sellerUserId = :sellerUserId")
    Double avgRatingBySellerUserId(UUID sellerUserId);

    long countBySellerUserId(UUID sellerUserId);
}
