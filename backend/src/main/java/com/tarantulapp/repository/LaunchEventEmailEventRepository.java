package com.tarantulapp.repository;

import com.tarantulapp.entity.LaunchEventEmailEvent;
import com.tarantulapp.entity.LaunchEventRegistration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface LaunchEventEmailEventRepository extends JpaRepository<LaunchEventEmailEvent, UUID> {
    boolean existsByRegistrationAndEventKey(LaunchEventRegistration registration, String eventKey);
}
