package com.tarantulapp.repository;

import com.tarantulapp.entity.BillingEmailEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BillingEmailEventRepository extends JpaRepository<BillingEmailEvent, UUID> {
    boolean existsByEventKey(String eventKey);
}
