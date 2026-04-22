package com.tarantulapp.service;

import com.tarantulapp.entity.Notification;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.NotificationRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private static final int MAX_PAGE_SIZE = 50;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final PushNotificationService pushNotificationService;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository,
                               PushNotificationService pushNotificationService) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.pushNotificationService = pushNotificationService;
    }

    @Transactional
    public void create(UUID userId, UUID actorUserId, String type, String title, String body, Map<String, Object> data) {
        if (userId == null) return;
        if (actorUserId != null && userId.equals(actorUserId)) return;
        Notification n = new Notification();
        n.setUserId(userId);
        n.setActorUserId(actorUserId);
        n.setType(clean(type, 40));
        n.setTitle(clean(title, 160));
        n.setBody(clean(body, 600));
        n.setData(data == null ? Collections.emptyMap() : data);
        notificationRepository.save(n);
        pushNotificationService.sendEventPushToUser(
                userId,
                n.getTitle() == null ? "Nueva notificacion" : n.getTitle(),
                n.getBody() == null ? "Tienes actividad nueva en tu cuenta." : n.getBody(),
                n.getType(),
                n.getData()
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listMine(UUID userId, int page, int size) {
        Pageable p = PageRequest.of(Math.max(0, page), clampSize(size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Notification> rows = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, p);
        Set<UUID> actorIds = rows.getContent().stream()
                .map(Notification::getActorUserId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());
        Map<UUID, User> actors = actorIds.isEmpty() ? Map.of() : userRepository.findAllById(actorIds)
                .stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        List<Map<String, Object>> content = new ArrayList<>();
        for (Notification n : rows.getContent()) {
            User actor = n.getActorUserId() == null ? null : actors.get(n.getActorUserId());
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", n.getId());
            m.put("type", n.getType());
            m.put("title", n.getTitle() == null ? "" : n.getTitle());
            m.put("body", n.getBody() == null ? "" : n.getBody());
            m.put("data", n.getData() == null ? Collections.emptyMap() : n.getData());
            m.put("readAt", n.getReadAt() == null ? null : n.getReadAt().toString());
            m.put("createdAt", n.getCreatedAt() == null ? null : n.getCreatedAt().toString());
            m.put("actorUserId", n.getActorUserId());
            m.put("actorDisplayName", actor == null ? "" : (actor.getDisplayName() == null ? "" : actor.getDisplayName()));
            m.put("actorHandle", actor == null ? "" : (actor.getPublicHandle() == null ? "" : actor.getPublicHandle()));
            content.add(m);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("content", content);
        out.put("number", rows.getNumber());
        out.put("size", rows.getSize());
        out.put("totalElements", rows.getTotalElements());
        out.put("totalPages", rows.getTotalPages());
        out.put("unreadCount", notificationRepository.countByUserIdAndReadAtIsNull(userId));
        return out;
    }

    @Transactional(readOnly = true)
    public long unreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndReadAtIsNull(userId);
    }

    @Transactional
    public void markRead(UUID userId, UUID notificationId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotFoundException("Notificacion no encontrada"));
        if (!userId.equals(n.getUserId())) {
            throw new AccessDeniedException("No autorizado");
        }
        if (n.getReadAt() == null) {
            n.setReadAt(Instant.now());
            notificationRepository.save(n);
        }
    }

    @Transactional
    public int markAllRead(UUID userId) {
        return notificationRepository.markAllAsRead(userId, Instant.now());
    }

    private int clampSize(int size) {
        if (size < 1) return 20;
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private String clean(String value, int max) {
        if (value == null) return null;
        String s = value.trim();
        if (s.isEmpty()) return null;
        return s.length() > max ? s.substring(0, max) : s;
    }
}
