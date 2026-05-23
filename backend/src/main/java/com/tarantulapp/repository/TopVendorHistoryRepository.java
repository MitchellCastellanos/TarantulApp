package com.tarantulapp.repository;

import com.tarantulapp.entity.TopVendorHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TopVendorHistoryRepository extends JpaRepository<TopVendorHistory, UUID> {

    List<TopVendorHistory> findByMonthYearOrderByRankAsc(String monthYear);

    boolean existsByMonthYear(String monthYear);

    void deleteByMonthYear(String monthYear);
}
