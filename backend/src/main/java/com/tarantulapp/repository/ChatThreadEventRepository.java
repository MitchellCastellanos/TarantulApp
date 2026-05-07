package com.tarantulapp.repository;

import com.tarantulapp.entity.ChatThreadEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChatThreadEventRepository extends JpaRepository<ChatThreadEvent, UUID> {
    List<ChatThreadEvent> findTop200ByThreadIdOrderByCreatedAtDesc(UUID threadId);
}
