package com.tarantulapp.service;

import com.tarantulapp.entity.ChatThread;
import com.tarantulapp.entity.ChatThreadPushDelivery;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.ChatThreadPushDeliveryRepository;
import com.tarantulapp.repository.ChatThreadRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ChatThreadPushDeliveryService {

    private final ChatThreadRepository chatThreadRepository;
    private final ChatThreadPushDeliveryRepository deliveryRepository;

    public ChatThreadPushDeliveryService(ChatThreadRepository chatThreadRepository,
                                         ChatThreadPushDeliveryRepository deliveryRepository) {
        this.chatThreadRepository = chatThreadRepository;
        this.deliveryRepository = deliveryRepository;
    }

    @Transactional
    public UUID recordPendingDelivery(UUID threadId, UUID notificationId, UUID recipientUserId, String notificationType) {
        ChatThreadPushDelivery d = new ChatThreadPushDelivery();
        d.setThreadId(threadId);
        d.setNotificationId(notificationId);
        d.setRecipientUserId(recipientUserId);
        d.setNotificationType(trimType(notificationType));
        deliveryRepository.save(d);
        return d.getId();
    }

    @Transactional
    public void applyFcmOutcome(UUID deliveryId, int fcmSuccessCount) {
        if (deliveryId == null) {
            return;
        }
        deliveryRepository.findById(deliveryId).ifPresent(d -> {
            d.setFcmSuccessCount(Math.max(0, fcmSuccessCount));
            deliveryRepository.save(d);
        });
    }

    @Transactional
    public void acknowledge(UUID recipientUserId, UUID deliveryId) {
        ChatThreadPushDelivery d = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new NotFoundException("Entrega push no encontrada"));
        if (!recipientUserId.equals(d.getRecipientUserId())) {
            throw new AccessDeniedException("No autorizado");
        }
        if (d.getReceivedAckAt() != null) {
            return;
        }
        d.setReceivedAckAt(Instant.now());
        deliveryRepository.save(d);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listForThreadParticipant(UUID userId, UUID threadId) {
        ChatThread t = chatThreadRepository.findById(threadId)
                .orElseThrow(() -> new NotFoundException("Hilo no encontrado"));
        if (!userId.equals(t.getUserLow()) && !userId.equals(t.getUserHigh())) {
            throw new AccessDeniedException("No participas en este hilo");
        }
        List<ChatThreadPushDelivery> rows = deliveryRepository.findTop100ByThreadIdOrderBySentAtDesc(threadId);
        List<Map<String, Object>> out = new ArrayList<>();
        for (ChatThreadPushDelivery d : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", d.getId());
            m.put("threadId", d.getThreadId());
            m.put("notificationId", d.getNotificationId());
            m.put("recipientUserId", d.getRecipientUserId());
            m.put("recipientIsYou", recipientUserIdEquals(d.getRecipientUserId(), userId));
            m.put("notificationType", d.getNotificationType());
            m.put("fcmSuccessCount", d.getFcmSuccessCount());
            m.put("sentAt", d.getSentAt() == null ? null : d.getSentAt().toString());
            m.put("receivedAckAt", d.getReceivedAckAt() == null ? null : d.getReceivedAckAt().toString());
            out.add(m);
        }
        return out;
    }

    private static boolean recipientUserIdEquals(UUID recipient, UUID viewer) {
        return recipient != null && recipient.equals(viewer);
    }

    private static String trimType(String type) {
        if (type == null) {
            return "";
        }
        String s = type.trim();
        return s.length() > 40 ? s.substring(0, 40) : s;
    }
}
