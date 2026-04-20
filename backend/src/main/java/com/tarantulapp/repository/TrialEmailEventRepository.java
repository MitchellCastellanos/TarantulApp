package com.tarantulapp.repository;

import com.tarantulapp.entity.TrialEmailEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TrialEmailEventRepository extends JpaRepository<TrialEmailEvent, UUID> {
    boolean existsByUserIdAndEventType(UUID userId, String eventType);
}
