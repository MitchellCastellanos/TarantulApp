package com.tarantulapp.controller;

import com.tarantulapp.entity.User;
import com.tarantulapp.repository.ReminderRepository;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.service.AdminAccessService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminAccessService adminAccessService;
    private final UserRepository userRepository;
    private final TarantulaRepository tarantulaRepository;
    private final ReminderRepository reminderRepository;

    public AdminController(AdminAccessService adminAccessService,
                           UserRepository userRepository,
                           TarantulaRepository tarantulaRepository,
                           ReminderRepository reminderRepository) {
        this.adminAccessService = adminAccessService;
        this.userRepository = userRepository;
        this.tarantulaRepository = tarantulaRepository;
        this.reminderRepository = reminderRepository;
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary() {
        adminAccessService.assertCurrentUserIsAdmin();
        long usersTotal = userRepository.count();
        long usersLast7d = userRepository.countByCreatedAtAfter(LocalDateTime.now().minusDays(7));
        long tarantulasTotal = tarantulaRepository.count();
        long remindersPending = reminderRepository.countByIsDoneFalse();
        return ResponseEntity.ok(Map.of(
                "usersTotal", usersTotal,
                "usersLast7d", usersLast7d,
                "tarantulasTotal", tarantulasTotal,
                "remindersPending", remindersPending
        ));
    }

    @GetMapping("/recent-users")
    public ResponseEntity<List<Map<String, Object>>> recentUsers() {
        adminAccessService.assertCurrentUserIsAdmin();
        List<Map<String, Object>> out = userRepository.findTop10ByOrderByCreatedAtDesc().stream()
                .map(this::mapUser)
                .collect(Collectors.toList());
        return ResponseEntity.ok(out);
    }

    private Map<String, Object> mapUser(User u) {
        return Map.of(
                "id", u.getId(),
                "email", u.getEmail(),
                "displayName", u.getDisplayName() == null ? "" : u.getDisplayName(),
                "plan", u.getPlan() == null ? "FREE" : u.getPlan().name(),
                "createdAt", u.getCreatedAt()
        );
    }
}
