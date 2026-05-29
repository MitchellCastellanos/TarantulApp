package com.tarantulapp.repository;

import com.tarantulapp.entity.PassportClaimEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface PassportClaimEventRepository extends JpaRepository<PassportClaimEvent, UUID> {

    List<PassportClaimEvent> findByPassportIdInOrderByCreatedAtDesc(Collection<UUID> passportIds);
}
