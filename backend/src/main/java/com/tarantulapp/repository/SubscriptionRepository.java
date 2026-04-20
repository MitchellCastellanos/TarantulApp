package com.tarantulapp.repository;

import com.tarantulapp.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {
    Optional<Subscription> findFirstByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<Subscription> findByProviderSubscriptionId(String providerSubscriptionId);
    Optional<Subscription> findFirstByProviderCustomerIdOrderByCreatedAtDesc(String providerCustomerId);
    List<Subscription> findByStatusInAndCurrentPeriodEndBetween(List<String> statuses, LocalDateTime from, LocalDateTime to);
}

