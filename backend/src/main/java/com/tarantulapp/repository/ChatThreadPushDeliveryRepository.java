package com.tarantulapp.repository;

import com.tarantulapp.entity.ChatThreadPushDelivery;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChatThreadPushDeliveryRepository extends JpaRepository<ChatThreadPushDelivery, UUID> {

    List<ChatThreadPushDelivery> findTop100ByThreadIdOrderBySentAtDesc(UUID threadId);
}
