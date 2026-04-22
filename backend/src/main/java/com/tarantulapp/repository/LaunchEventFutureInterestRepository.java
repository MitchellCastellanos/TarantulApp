package com.tarantulapp.repository;

import com.tarantulapp.entity.LaunchEventFutureInterest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface LaunchEventFutureInterestRepository extends JpaRepository<LaunchEventFutureInterest, UUID> {

    @Query("select count(f) > 0 from LaunchEventFutureInterest f where lower(f.email) = lower(:email)")
    boolean existsByEmailIgnoreCase(String email);
}
