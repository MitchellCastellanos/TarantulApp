package com.tarantulapp.repository;

import com.tarantulapp.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {
    Optional<Subscription> findFirstByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<Subscription> findByProviderSubscriptionId(String providerSubscriptionId);
}

