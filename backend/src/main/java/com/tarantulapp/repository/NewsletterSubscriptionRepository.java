package com.tarantulapp.repository;

import com.tarantulapp.entity.NewsletterSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NewsletterSubscriptionRepository extends JpaRepository<NewsletterSubscription, UUID> {

    Optional<NewsletterSubscription> findByUserId(UUID userId);

    @Query("select s from NewsletterSubscription s where s.unsubscribedAt is null")
    List<NewsletterSubscription> findAllActive();

    long countByUnsubscribedAtIsNull();
}
