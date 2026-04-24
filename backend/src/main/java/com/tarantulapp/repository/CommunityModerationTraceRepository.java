package com.tarantulapp.repository;

import com.tarantulapp.entity.CommunityModerationTrace;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CommunityModerationTraceRepository extends JpaRepository<CommunityModerationTrace, UUID> {
}
