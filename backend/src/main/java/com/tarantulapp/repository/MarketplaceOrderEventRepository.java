package com.tarantulapp.repository;

import com.tarantulapp.entity.MarketplaceOrderEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MarketplaceOrderEventRepository extends JpaRepository<MarketplaceOrderEvent, UUID> {

    List<MarketplaceOrderEvent> findTop200ByOrderIdOrderByCreatedAtAsc(UUID orderId);
}
