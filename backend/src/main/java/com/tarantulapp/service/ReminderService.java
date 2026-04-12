package com.tarantulapp.service;

import com.tarantulapp.dto.ReminderRequest;
import com.tarantulapp.dto.ReminderResponse;
import com.tarantulapp.entity.Reminder;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.ReminderRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ReminderService {

    private final ReminderRepository reminderRepository;

    public ReminderService(ReminderRepository reminderRepository) {
        this.reminderRepository = reminderRepository;
    }

    public List<ReminderResponse> findByUser(UUID userId) {
        return reminderRepository.findByUserIdOrderByDueDateAsc(userId)
                .stream().map(ReminderResponse::from).collect(Collectors.toList());
    }

    public List<ReminderResponse> findPending(UUID userId) {
        // Returns reminders due within the next 7 days + any overdue ones
        LocalDateTime cutoff = LocalDateTime.now().plusDays(7);
        return reminderRepository
                .findByUserIdAndIsDoneFalseAndDueDateBeforeOrderByDueDateAsc(userId, cutoff)
                .stream().map(ReminderResponse::from).collect(Collectors.toList());
    }

    public ReminderResponse create(ReminderRequest req, UUID userId) {
        Reminder r = new Reminder();
        r.setUserId(userId);
        r.setType(req.getType());
        r.setDueDate(req.getDueDate());
        r.setMessage(req.getMessage());
        r.setTarantulaId(req.getTarantulaId());
        return ReminderResponse.from(reminderRepository.save(r));
    }

    public ReminderResponse markDone(UUID id, UUID userId) {
        Reminder r = getOwned(id, userId);
        r.setIsDone(true);
        return ReminderResponse.from(reminderRepository.save(r));
    }

    public void delete(UUID id, UUID userId) {
        Reminder r = getOwned(id, userId);
        reminderRepository.delete(r);
    }

    private Reminder getOwned(UUID id, UUID userId) {
        return reminderRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("Recordatorio no encontrado"));
    }
}
