package com.tarantulapp.repository;

import com.tarantulapp.entity.ChatThreadEventEvidence;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChatThreadEventEvidenceRepository extends JpaRepository<ChatThreadEventEvidence, UUID> {
    List<ChatThreadEventEvidence> findByEventIdOrderByCreatedAtAsc(UUID eventId);
    List<ChatThreadEventEvidence> findByEventIdInOrderByCreatedAtAsc(List<UUID> eventIds);
}
