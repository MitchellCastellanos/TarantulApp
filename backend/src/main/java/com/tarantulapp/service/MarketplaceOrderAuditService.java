package com.tarantulapp.service;

import com.tarantulapp.entity.MarketplaceOrderEvent;
import com.tarantulapp.repository.MarketplaceOrderEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class MarketplaceOrderAuditService {

    private final MarketplaceOrderEventRepository marketplaceOrderEventRepository;

    public MarketplaceOrderAuditService(MarketplaceOrderEventRepository marketplaceOrderEventRepository) {
        this.marketplaceOrderEventRepository = marketplaceOrderEventRepository;
    }

    @Transactional
    public void append(UUID orderId, UUID actorUserId, String eventType, String fromStatus, String toStatus, String payload) {
        if (orderId == null || eventType == null || eventType.isBlank()) {
            return;
        }
        MarketplaceOrderEvent row = new MarketplaceOrderEvent();
        row.setOrderId(orderId);
        row.setActorUserId(actorUserId);
        row.setEventType(eventType.trim());
        row.setFromStatus(fromStatus);
        row.setToStatus(toStatus);
        row.setPayload(payload);
        marketplaceOrderEventRepository.save(row);
    }
}
