package com.tarantulapp.repository;

import com.tarantulapp.entity.Reminder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReminderRepository extends JpaRepository<Reminder, UUID> {
    List<Reminder> findByUserIdOrderByDueDateAsc(UUID userId);
    List<Reminder> findByUserIdAndIsDoneFalseAndDueDateBeforeOrderByDueDateAsc(UUID userId, Instant cutoff);
    Optional<Reminder> findByIdAndUserId(UUID id, UUID userId);
}
