package com.tarantulapp.repository;

import com.tarantulapp.entity.BetaEmailSend;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface BetaEmailSendRepository extends JpaRepository<BetaEmailSend, UUID> {

    List<BetaEmailSend> findByUserIdIn(Collection<UUID> userIds);
}
