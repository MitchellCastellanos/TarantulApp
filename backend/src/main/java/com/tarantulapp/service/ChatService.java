package com.tarantulapp.service;

import com.tarantulapp.entity.ChatMessage;
import com.tarantulapp.entity.ChatThread;
import com.tarantulapp.entity.MarketplaceListing;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.ChatMessageRepository;
import com.tarantulapp.repository.ChatThreadRepository;
import com.tarantulapp.repository.MarketplaceListingRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ChatService {

    private static final int MAX_PAGE = 50;

    private final ChatThreadRepository chatThreadRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final MarketplaceListingRepository marketplaceListingRepository;
    private final UserRepository userRepository;

    public ChatService(ChatThreadRepository chatThreadRepository,
                       ChatMessageRepository chatMessageRepository,
                       MarketplaceListingRepository marketplaceListingRepository,
                       UserRepository userRepository) {
        this.chatThreadRepository = chatThreadRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.marketplaceListingRepository = marketplaceListingRepository;
        this.userRepository = userRepository;
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
            thread = chatThreadRepository.save(thread);
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
}
