package com.tarantulapp.repository;

import com.tarantulapp.entity.ProDayGrant;
import com.tarantulapp.entity.ProDayGrantSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProDayGrantRepository extends JpaRepository<ProDayGrant, UUID> {

    List<ProDayGrant> findByUserIdOrderByGrantedAtDesc(UUID userId);

    boolean existsByUserIdAndSource(UUID userId, ProDayGrantSource source);
}
