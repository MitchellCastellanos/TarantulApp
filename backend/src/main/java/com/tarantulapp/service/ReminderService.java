package com.tarantulapp.service;

import com.tarantulapp.dto.ReminderRequest;
import com.tarantulapp.dto.ReminderResponse;
import com.tarantulapp.entity.BehaviorLog;
import com.tarantulapp.entity.FeedingLog;
import com.tarantulapp.entity.Reminder;
import com.tarantulapp.entity.Tarantula;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.BehaviorLogRepository;
import com.tarantulapp.repository.FeedingLogRepository;
import com.tarantulapp.repository.ReminderRepository;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ReminderService {

    private final ReminderRepository reminderRepository;
    private final UserRepository userRepository;
    private final TarantulaRepository tarantulaRepository;
    private final FeedingLogRepository feedingLogRepository;
    private final BehaviorLogRepository behaviorLogRepository;
    private final PlanAccessService planAccessService;

    public ReminderService(ReminderRepository reminderRepository,
                           UserRepository userRepository,
                           TarantulaRepository tarantulaRepository,
                           FeedingLogRepository feedingLogRepository,
                           BehaviorLogRepository behaviorLogRepository,
                           PlanAccessService planAccessService) {
        this.reminderRepository = reminderRepository;
        this.userRepository = userRepository;
        this.tarantulaRepository = tarantulaRepository;
        this.feedingLogRepository = feedingLogRepository;
        this.behaviorLogRepository = behaviorLogRepository;
        this.planAccessService = planAccessService;
    }

    public List<ReminderResponse> findByUser(UUID userId) {
        return mergeManualAndAutomatic(userId, null);
    }

    public List<ReminderResponse> findPending(UUID userId) {
        Instant cutoff = Instant.now().plus(7, ChronoUnit.DAYS);
        return mergeManualAndAutomatic(userId, cutoff);
    }

    public ReminderResponse create(ReminderRequest req, UUID userId) {
        if (req.getType() != null && req.getType().endsWith("_auto")) {
            throw new IllegalArgumentException("Los recordatorios automáticos no se crean manualmente");
        }
        if (req.getTarantulaId() == null) {
            throw new IllegalArgumentException("El recordatorio debe estar ligado a una tarántula");
        }

        Tarantula t = tarantulaRepository.findById(req.getTarantulaId())
                .orElseThrow(() -> new NotFoundException("Tarántula no encontrada"));
        if (!t.getUserId().equals(userId)) {
            throw new AccessDeniedException("Acceso denegado");
        }

        planAccessService.enforceTarantulaWrite(userId, req.getTarantulaId());

        Reminder r = new Reminder();
        r.setUserId(userId);
        r.setType(req.getType());
        r.setDueDate(req.getDueDate().toInstant());
        r.setMessage(req.getMessage());
        r.setTarantulaId(req.getTarantulaId());
        return ReminderResponse.from(reminderRepository.save(r));
    }

    public ReminderResponse markDone(UUID id, UUID userId) {
        Reminder r = getOwned(id, userId);
        if (r.getTarantulaId() != null) {
            planAccessService.enforceTarantulaWrite(userId, r.getTarantulaId());
        }
        r.setIsDone(true);
        return ReminderResponse.from(reminderRepository.save(r));
    }

    public void delete(UUID id, UUID userId) {
        Reminder r = getOwned(id, userId);
        if (r.getTarantulaId() != null) {
            planAccessService.enforceTarantulaWrite(userId, r.getTarantulaId());
        }
        reminderRepository.delete(r);
    }

    private List<ReminderResponse> mergeManualAndAutomatic(UUID userId, Instant cutoff) {
        List<ReminderResponse> reminders = new ArrayList<>();

        List<Tarantula> tarantulas = tarantulaRepository.findByUserIdOrderByCreatedAtDesc(userId);

        if (cutoff == null) {
            reminders.addAll(reminderRepository.findByUserIdOrderByDueDateAsc(userId)
                    .stream().map(ReminderResponse::from).collect(Collectors.toList()));
        } else {
            reminders.addAll(reminderRepository
                    .findByUserIdAndIsDoneFalseAndDueDateBeforeOrderByDueDateAsc(userId, cutoff)
                    .stream().map(ReminderResponse::from).collect(Collectors.toList()));
        }

        if (hasProFeatures(userId)) {
            reminders.addAll(buildAutomaticFeedingReminders(userId, cutoff, tarantulas));
        }

        // Enriquecer con nombre de tarántula cuando exista
        for (ReminderResponse r : reminders) {
            if (r.getTarantulaId() == null || r.getTarantulaName() != null) continue;
            for (Tarantula t : tarantulas) {
                if (t.getId().equals(r.getTarantulaId())) {
                    r.setTarantulaName(t.getName());
                    break;
                }
            }
        }

        reminders.sort(Comparator.comparing(ReminderResponse::getDueDate));
        return reminders;
    }

    private boolean hasProFeatures(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        return planAccessService.hasProFeatures(user);
    }

    private List<ReminderResponse> buildAutomaticFeedingReminders(UUID userId, Instant cutoff, List<Tarantula> tarantulas) {
        List<ReminderResponse> reminders = new ArrayList<>();

        for (Tarantula tarantula : tarantulas) {
            if (tarantula.getDeceasedAt() != null) {
                continue;
            }

            Optional<FeedingLog> lastFeeding = feedingLogRepository.findFirstByTarantulaIdOrderByFedAtDesc(tarantula.getId());
            if (lastFeeding.isEmpty() || Boolean.FALSE.equals(lastFeeding.get().getAccepted())) {
                continue;
            }

            Optional<BehaviorLog> lastBehavior = behaviorLogRepository.findFirstByTarantulaIdOrderByLoggedAtDesc(tarantula.getId());
            Instant now = Instant.now();
            if (lastBehavior.isPresent()
                    && "pre_molt".equals(lastBehavior.get().getMood())
                    && lastBehavior.get().getLoggedAt().isAfter(now.minus(30, ChronoUnit.DAYS))) {
                continue;
            }

            Instant dueDate = lastFeeding.get().getFedAt()
                    .plus(Duration.ofDays(estimateFeedingIntervalDays(tarantula)));
            if (cutoff != null && dueDate.isAfter(cutoff)) {
                continue;
            }

            reminders.add(ReminderResponse.automatic(
                    tarantula.getId(),
                    tarantula.getName(),
                    "feeding_auto",
                    dueDate,
                    "Sugerencia Pro: revisar alimentación de " + tarantula.getName()
            ));
        }

        return reminders;
    }

    private long estimateFeedingIntervalDays(Tarantula tarantula) {
        long days = switch (tarantula.getStage() != null ? tarantula.getStage() : "") {
            case "sling" -> 5;
            case "juvenile" -> 7;
            case "subadult" -> 10;
            case "adult" -> 14;
            default -> 10;
        };

        if (tarantula.getCurrentSizeCm() != null) {
            double size = tarantula.getCurrentSizeCm().doubleValue();
            if (size <= 3) {
                days = Math.max(3, days - 2);
            } else if (size >= 10) {
                days += 4;
            } else if (size >= 6) {
                days += 2;
            }
        }

        return days;
    }

    private Reminder getOwned(UUID id, UUID userId) {
        return reminderRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("Recordatorio no encontrado"));
    }
}
