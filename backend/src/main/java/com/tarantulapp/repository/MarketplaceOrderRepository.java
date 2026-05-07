package com.tarantulapp.repository;

import com.tarantulapp.entity.MarketplaceOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MarketplaceOrderRepository extends JpaRepository<MarketplaceOrder, UUID> {
    Optional<MarketplaceOrder> findByThreadId(UUID threadId);
    List<MarketplaceOrder> findTop100ByBuyerUserIdOrderByCreatedAtDesc(UUID buyerUserId);
    List<MarketplaceOrder> findTop100BySellerUserIdOrderByCreatedAtDesc(UUID sellerUserId);
}
