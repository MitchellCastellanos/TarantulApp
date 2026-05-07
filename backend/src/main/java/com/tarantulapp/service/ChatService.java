package com.tarantulapp.service;

import com.tarantulapp.entity.ChatMessage;
import com.tarantulapp.entity.ChatThread;
import com.tarantulapp.entity.ChatThreadEvent;
import com.tarantulapp.entity.ChatThreadEventEvidence;
import com.tarantulapp.entity.MarketplaceListing;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.ChatMessageRepository;
import com.tarantulapp.repository.ChatThreadEventRepository;
import com.tarantulapp.repository.ChatThreadEventEvidenceRepository;
import com.tarantulapp.repository.ChatThreadRepository;
import com.tarantulapp.repository.MarketplaceListingRepository;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.util.FileStorageService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ChatService {

    private static final int MAX_PAGE = 50;
    private static final Set<String> TX_STATUSES = Set.of(
            "pending", "paid", "shipped", "delivered", "disputed", "cancelled"
    );

    private final ChatThreadRepository chatThreadRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatThreadEventRepository chatThreadEventRepository;
    private final ChatThreadEventEvidenceRepository chatThreadEventEvidenceRepository;
    private final MarketplaceListingRepository marketplaceListingRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;

    public ChatService(ChatThreadRepository chatThreadRepository,
                       ChatMessageRepository chatMessageRepository,
                       ChatThreadEventRepository chatThreadEventRepository,
                       ChatThreadEventEvidenceRepository chatThreadEventEvidenceRepository,
                       MarketplaceListingRepository marketplaceListingRepository,
                       UserRepository userRepository,
                       FileStorageService fileStorageService,
                       NotificationService notificationService) {
        this.chatThreadRepository = chatThreadRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.chatThreadEventRepository = chatThreadEventRepository;
        this.chatThreadEventEvidenceRepository = chatThreadEventEvidenceRepository;
        this.marketplaceListingRepository = marketplaceListingRepository;
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
        this.notificationService = notificationService;
    }

    @Transactional
    public Map<String, Object> openOrGetThread(UUID currentUserId, UUID otherUserId, UUID listingId) {
        if (currentUserId.equals(otherUserId)) {
            throw new IllegalArgumentException("No puedes chatear contigo mismo");
        }
        UUID[] pair = orderedPair(currentUserId, otherUserId);
        UUID low = pair[0];
        UUID high = pair[1];

        if (listingId != null) {
            MarketplaceListing listing = marketplaceListingRepository.findById(listingId)
                    .orElseThrow(() -> new NotFoundException("Listing no encontrado"));
            UUID seller = listing.getSellerUserId();
            if (!seller.equals(currentUserId) && !seller.equals(otherUserId)) {
                throw new AccessDeniedException("Listing no pertenece a los participantes");
            }
        }

        ChatThread thread = listingId == null
                ? chatThreadRepository.findByUserLowAndUserHighAndListingIdIsNull(low, high).orElse(null)
                : chatThreadRepository.findByUserLowAndUserHighAndListingId(low, high, listingId).orElse(null);
        if (thread == null) {
            thread = new ChatThread();
            thread.setUserLow(low);
            thread.setUserHigh(high);
            thread.setListingId(listingId);
            if (listingId != null) {
                thread.setTransactionStatus("pending");
                thread.setTransactionStatusUpdatedAt(java.time.Instant.now());
                thread.setTransactionStatusUpdatedByUserId(currentUserId);
            }
            thread = chatThreadRepository.save(thread);
            if (listingId != null) {
                addSystemEvent(thread.getId(), currentUserId, "status_change", "pending", "Thread opened for marketplace listing", null);
            }
        }
        return threadToDto(thread, currentUserId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listThreads(UUID currentUserId, int page, int size) {
        Pageable p = PageRequest.of(Math.max(0, page), clamp(size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ChatThread> rows = chatThreadRepository.findThreadsForUser(currentUserId, p);
        List<Map<String, Object>> out = new ArrayList<>();
        for (ChatThread t : rows.getContent()) {
            out.add(threadToDto(t, currentUserId));
        }
        Map<String, Object> wrap = new LinkedHashMap<>();
        wrap.put("content", out);
        wrap.put("totalElements", rows.getTotalElements());
        wrap.put("totalPages", rows.getTotalPages());
        wrap.put("number", rows.getNumber());
        wrap.put("size", rows.getSize());
        return wrap;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listMessages(UUID currentUserId, UUID threadId, int page, int size) {
        ChatThread thread = chatThreadRepository.findById(threadId)
                .orElseThrow(() -> new NotFoundException("Hilo no encontrado"));
        assertParticipant(thread, currentUserId);
        Pageable p = PageRequest.of(Math.max(0, page), clamp(size), Sort.by(Sort.Direction.ASC, "createdAt"));
        Page<ChatMessage> rows = chatMessageRepository.findByThreadIdOrderByCreatedAtAsc(threadId, p);
        List<Map<String, Object>> content = new ArrayList<>();
        for (ChatMessage m : rows.getContent()) {
            content.add(messageToDto(m));
        }
        Map<String, Object> wrap = new LinkedHashMap<>();
        wrap.put("content", content);
        wrap.put("totalElements", rows.getTotalElements());
        wrap.put("totalPages", rows.getTotalPages());
        wrap.put("number", rows.getNumber());
        wrap.put("size", rows.getSize());
        return wrap;
    }

    @Transactional
    public Map<String, Object> sendMessage(UUID currentUserId, UUID threadId, String body) {
        ChatThread thread = chatThreadRepository.findById(threadId)
                .orElseThrow(() -> new NotFoundException("Hilo no encontrado"));
        assertParticipant(thread, currentUserId);
        String text = cleanBody(body);
        if (text == null) {
            throw new IllegalArgumentException("Mensaje vacio");
        }
        ChatMessage m = new ChatMessage();
        m.setThreadId(threadId);
        m.setSenderUserId(currentUserId);
        m.setBody(text);
        ChatMessage saved = chatMessageRepository.save(m);
        return messageToDto(saved);
    }

    @Transactional
    public Map<String, Object> updateTransactionStatus(UUID currentUserId, UUID threadId, String status) {
        ChatThread thread = chatThreadRepository.findById(threadId)
                .orElseThrow(() -> new NotFoundException("Hilo no encontrado"));
        assertParticipant(thread, currentUserId);
        if (thread.getListingId() == null) {
            throw new IllegalArgumentException("Estado comercial solo aplica a hilos de marketplace");
        }
        MarketplaceListing listing = marketplaceListingRepository.findById(thread.getListingId())
                .orElseThrow(() -> new NotFoundException("Listing no encontrado"));
        String normalized = normalizeTxStatus(status);
        if (normalized == null) {
            throw new IllegalArgumentException("Estado comercial invalido");
        }
        String current = thread.getTransactionStatus() == null || thread.getTransactionStatus().isBlank()
                ? "pending"
                : thread.getTransactionStatus();
        if (!canTransitionStatus(current, normalized, currentUserId, listing.getSellerUserId())) {
            throw new AccessDeniedException("No puedes cambiar a ese estado desde tu rol");
        }
        thread.setTransactionStatus(normalized);
        thread.setTransactionStatusUpdatedAt(java.time.Instant.now());
        thread.setTransactionStatusUpdatedByUserId(currentUserId);
        chatThreadRepository.save(thread);
        addSystemEvent(threadId, currentUserId, "status_change", normalized, null, null);
        notifyTransactionStatusChanged(thread, currentUserId, normalized);
        return threadToDto(thread, currentUserId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listThreadEvents(UUID currentUserId, UUID threadId) {
        ChatThread thread = chatThreadRepository.findById(threadId)
                .orElseThrow(() -> new NotFoundException("Hilo no encontrado"));
        assertParticipant(thread, currentUserId);
        List<ChatThreadEvent> events = chatThreadEventRepository.findTop200ByThreadIdOrderByCreatedAtDesc(threadId);
        Map<UUID, List<String>> evidenceByEventId = loadEvidenceByEventIds(events.stream().map(ChatThreadEvent::getId).toList());
        return events.stream()
                .map(e -> eventToDto(e, evidenceByEventId.getOrDefault(e.getId(), List.of())))
                .toList();
    }

    @Transactional
    public Map<String, Object> addThreadEvent(UUID currentUserId, UUID threadId, String eventType, String note, String evidenceUrl, List<String> evidenceUrls) {
        ChatThread thread = chatThreadRepository.findById(threadId)
                .orElseThrow(() -> new NotFoundException("Hilo no encontrado"));
        assertParticipant(thread, currentUserId);
        if (thread.getListingId() == null) {
            throw new IllegalArgumentException("Eventos de trato solo aplican a hilos de marketplace");
        }
        MarketplaceListing listing = marketplaceListingRepository.findById(thread.getListingId())
                .orElseThrow(() -> new NotFoundException("Listing no encontrado"));
        String type = normalizeEventType(eventType);
        if (type == null) {
            throw new IllegalArgumentException("Tipo de evento invalido");
        }
        if ("status_change".equals(type)) {
            throw new IllegalArgumentException("Usa cambio de estado para registrar este evento");
        }
        String role = resolveParticipantRole(currentUserId, listing.getSellerUserId());
        enforceEventPermissions(type, role, thread.getTransactionStatus());
        String cleanNote = cleanEventText(note, 1000);
        List<String> normalizedEvidence = normalizeEvidenceUrls(evidenceUrl, evidenceUrls);
        if ((cleanNote == null || cleanNote.isBlank()) && normalizedEvidence.isEmpty()) {
            throw new IllegalArgumentException("Evento requiere nota o evidencia");
        }
        ChatThreadEvent row = new ChatThreadEvent();
        row.setThreadId(threadId);
        row.setEventType(type);
        row.setNote(cleanNote);
        row.setEvidenceUrl(normalizedEvidence.isEmpty() ? null : normalizedEvidence.get(0));
        row.setCreatedByUserId(currentUserId);
        ChatThreadEvent saved = chatThreadEventRepository.save(row);
        saveEventEvidences(saved.getId(), normalizedEvidence);
        notifyEventAdded(thread, currentUserId, type);
        return eventToDto(saved, normalizedEvidence);
    }

    @Transactional
    public Map<String, Object> uploadThreadEventEvidence(UUID currentUserId, UUID threadId, MultipartFile file) {
        ChatThread thread = chatThreadRepository.findById(threadId)
                .orElseThrow(() -> new NotFoundException("Hilo no encontrado"));
        assertParticipant(thread, currentUserId);
        if (thread.getListingId() == null) {
            throw new IllegalArgumentException("Evidencia solo aplica a hilos de marketplace");
        }
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Archivo requerido");
        }
        try {
            String evidenceUrl = fileStorageService.saveFile(file, "chat-events");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("evidenceUrl", evidenceUrl);
            return out;
        } catch (Exception e) {
            throw new IllegalArgumentException("No se pudo subir evidencia");
        }
    }

    private void assertParticipant(ChatThread thread, UUID userId) {
        if (!userId.equals(thread.getUserLow()) && !userId.equals(thread.getUserHigh())) {
            throw new AccessDeniedException("No participas en este hilo");
        }
    }

    private Map<String, Object> threadToDto(ChatThread t, UUID viewerId) {
        UUID other = t.getUserLow().equals(viewerId) ? t.getUserHigh() : t.getUserLow();
        User u = userRepository.findById(other).orElse(null);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("otherUserId", other);
        m.put("otherDisplayName", u != null && u.getDisplayName() != null ? u.getDisplayName() : "");
        m.put("otherHandle", u != null && u.getPublicHandle() != null ? u.getPublicHandle() : "");
        m.put("listingId", t.getListingId());
        if (t.getListingId() != null) {
            MarketplaceListing listing = marketplaceListingRepository.findById(t.getListingId()).orElse(null);
            m.put("listingSellerUserId", listing == null ? null : listing.getSellerUserId());
        } else {
            m.put("listingSellerUserId", null);
        }
        m.put("transactionStatus", t.getTransactionStatus() == null ? "" : t.getTransactionStatus());
        m.put("transactionStatusUpdatedAt", t.getTransactionStatusUpdatedAt() == null ? "" : t.getTransactionStatusUpdatedAt().toString());
        m.put("transactionStatusUpdatedByUserId", t.getTransactionStatusUpdatedByUserId());
        m.put("createdAt", t.getCreatedAt() != null ? t.getCreatedAt().toString() : "");
        List<ChatMessage> last = chatMessageRepository.findTop1ByThreadIdOrderByCreatedAtDesc(t.getId());
        if (!last.isEmpty()) {
            ChatMessage lm = last.get(0);
            m.put("lastMessagePreview", preview(lm.getBody()));
            m.put("lastMessageAt", lm.getCreatedAt() != null ? lm.getCreatedAt().toString() : "");
        } else {
            m.put("lastMessagePreview", "");
            m.put("lastMessageAt", "");
        }
        return m;
    }

    private Map<String, Object> messageToDto(ChatMessage m) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", m.getId());
        out.put("threadId", m.getThreadId());
        out.put("senderUserId", m.getSenderUserId());
        out.put("body", m.getBody());
        out.put("createdAt", m.getCreatedAt() != null ? m.getCreatedAt().toString() : "");
        return out;
    }

    private Map<String, Object> eventToDto(ChatThreadEvent e, List<String> evidenceUrls) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", e.getId());
        out.put("threadId", e.getThreadId());
        out.put("eventType", e.getEventType());
        out.put("eventStatus", e.getEventStatus() == null ? "" : e.getEventStatus());
        out.put("note", e.getNote() == null ? "" : e.getNote());
        out.put("evidenceUrl", e.getEvidenceUrl() == null ? "" : e.getEvidenceUrl());
        out.put("evidenceUrls", evidenceUrls == null ? List.of() : evidenceUrls);
        out.put("createdByUserId", e.getCreatedByUserId());
        out.put("createdAt", e.getCreatedAt() == null ? "" : e.getCreatedAt().toString());
        return out;
    }

    private void addSystemEvent(UUID threadId, UUID actorUserId, String type, String status, String note, String evidenceUrl) {
        ChatThreadEvent e = new ChatThreadEvent();
        e.setThreadId(threadId);
        e.setEventType(type);
        e.setEventStatus(status);
        e.setNote(note);
        e.setEvidenceUrl(evidenceUrl);
        e.setCreatedByUserId(actorUserId);
        chatThreadEventRepository.save(e);
    }

    private String preview(String body) {
        if (body == null) {
            return "";
        }
        String t = body.trim();
        return t.length() > 120 ? t.substring(0, 120) + "..." : t;
    }

    private UUID[] orderedPair(UUID a, UUID b) {
        String sa = a.toString();
        String sb = b.toString();
        if (sa.compareTo(sb) < 0) {
            return new UUID[]{a, b};
        }
        return new UUID[]{b, a};
    }

    private int clamp(int size) {
        if (size < 1) {
            return 20;
        }
        return Math.min(size, MAX_PAGE);
    }

    private String cleanBody(String raw) {
        if (raw == null) {
            return null;
        }
        String t = raw.trim().replaceAll("\\s+", " ");
        if (t.isEmpty()) {
            return null;
        }
        return t.length() > 4000 ? t.substring(0, 4000) : t;
    }

    private String normalizeTxStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String v = raw.trim().toLowerCase();
        return TX_STATUSES.contains(v) ? v : null;
    }

    private boolean canTransitionStatus(String from, String to, UUID actorUserId, UUID sellerUserId) {
        if (from.equals(to)) {
            return true;
        }
        boolean seller = actorUserId.equals(sellerUserId);
        if ("disputed".equals(to) || "cancelled".equals(to)) {
            return true;
        }
        if ("pending".equals(from) && "paid".equals(to)) {
            return !seller;
        }
        if ("paid".equals(from) && "shipped".equals(to)) {
            return seller;
        }
        if ("shipped".equals(from) && "delivered".equals(to)) {
            return !seller;
        }
        if ("disputed".equals(from) && "delivered".equals(to)) {
            return !seller;
        }
        return false;
    }

    private String resolveParticipantRole(UUID currentUserId, UUID sellerUserId) {
        return currentUserId.equals(sellerUserId) ? "seller" : "buyer";
    }

    private void enforceEventPermissions(String eventType, String role, String currentStatus) {
        if ("shipping_proof".equals(eventType) && !"seller".equals(role)) {
            throw new AccessDeniedException("Solo el vendedor puede subir prueba de envio");
        }
        if ("arrival_proof".equals(eventType) && !"buyer".equals(role)) {
            throw new AccessDeniedException("Solo el comprador puede subir prueba de llegada");
        }
        if ("dispute_note".equals(eventType) && !"disputed".equalsIgnoreCase(String.valueOf(currentStatus))) {
            throw new IllegalArgumentException("Activa estado de disputa antes de agregar nota de disputa");
        }
    }

    private String normalizeEventType(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String v = raw.trim().toLowerCase();
        return switch (v) {
            case "note", "shipping_proof", "arrival_proof", "dispute_note", "status_change" -> v;
            default -> null;
        };
    }

    private String cleanEventText(String raw, int maxLen) {
        if (raw == null) {
            return null;
        }
        String t = raw.trim().replaceAll("\\s+", " ");
        if (t.isEmpty()) {
            return null;
        }
        return t.length() > maxLen ? t.substring(0, maxLen) : t;
    }

    private List<String> normalizeEvidenceUrls(String single, List<String> many) {
        List<String> out = new ArrayList<>();
        String one = cleanEventText(single, 500);
        if (one != null) {
            out.add(one);
        }
        if (many != null) {
            for (String raw : many) {
                String c = cleanEventText(raw, 500);
                if (c != null && !out.contains(c)) {
                    out.add(c);
                }
            }
        }
        return out;
    }

    private void saveEventEvidences(UUID eventId, List<String> evidenceUrls) {
        if (evidenceUrls == null || evidenceUrls.isEmpty()) {
            return;
        }
        for (String url : evidenceUrls) {
            ChatThreadEventEvidence row = new ChatThreadEventEvidence();
            row.setEventId(eventId);
            row.setEvidenceUrl(url);
            chatThreadEventEvidenceRepository.save(row);
        }
    }

    private Map<UUID, List<String>> loadEvidenceByEventIds(List<UUID> eventIds) {
        if (eventIds == null || eventIds.isEmpty()) {
            return Map.of();
        }
        List<ChatThreadEventEvidence> rows = chatThreadEventEvidenceRepository.findByEventIdInOrderByCreatedAtAsc(eventIds);
        Map<UUID, List<String>> grouped = new HashMap<>();
        for (ChatThreadEventEvidence row : rows) {
            grouped.computeIfAbsent(row.getEventId(), k -> new ArrayList<>()).add(row.getEvidenceUrl());
        }
        return grouped;
    }

    private void notifyTransactionStatusChanged(ChatThread thread, UUID actorUserId, String status) {
        UUID recipient = actorUserId.equals(thread.getUserLow()) ? thread.getUserHigh() : thread.getUserLow();
        notificationService.create(
                recipient,
                actorUserId,
                "MARKETPLACE_DEAL_STATUS",
                "Marketplace update",
                "Deal status changed to " + status + ".",
                Map.of("route", "/marketplace/messages?thread=" + thread.getId(), "threadId", thread.getId(), "status", status)
        );
    }

    private void notifyEventAdded(ChatThread thread, UUID actorUserId, String eventType) {
        UUID recipient = actorUserId.equals(thread.getUserLow()) ? thread.getUserHigh() : thread.getUserLow();
        notificationService.create(
                recipient,
                actorUserId,
                "MARKETPLACE_DEAL_EVENT",
                "Marketplace timeline updated",
                "New " + eventType + " event added to your deal timeline.",
                Map.of("route", "/marketplace/messages?thread=" + thread.getId(), "threadId", thread.getId(), "eventType", eventType)
        );
    }
}
