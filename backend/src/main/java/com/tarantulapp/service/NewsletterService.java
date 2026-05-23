package com.tarantulapp.service;

import com.tarantulapp.entity.NewsletterDraft;
import com.tarantulapp.entity.NewsletterSubscription;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.NewsletterDraftRepository;
import com.tarantulapp.repository.NewsletterSubscriptionRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class NewsletterService {

    private final NewsletterDraftRepository draftRepository;
    private final NewsletterSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final MarketplaceService marketplaceService;
    private final EmailService emailService;
    private final String baseUrl;

    public NewsletterService(NewsletterDraftRepository draftRepository,
                             NewsletterSubscriptionRepository subscriptionRepository,
                             UserRepository userRepository,
                             MarketplaceService marketplaceService,
                             EmailService emailService,
                             @Value("${app.base-url:http://localhost:5173}") String baseUrl) {
        this.draftRepository = draftRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.marketplaceService = marketplaceService;
        this.emailService = emailService;
        this.baseUrl = baseUrl == null ? "http://localhost:5173" : baseUrl.replaceAll("/+$", "");
    }

    @Transactional
    public Map<String, Object> saveDraft(UUID adminUserId, String title, List<UUID> listingIds) {
        String safeTitle = title == null || title.isBlank() ? "Drops de la semana" : title.trim();
        List<UUID> ids = listingIds == null ? List.of() : listingIds.stream().filter(id -> id != null).distinct().toList();
        String html = compileListingHtml(ids);
        NewsletterDraft draft = new NewsletterDraft();
        draft.setAdminUserId(adminUserId);
        draft.setTitle(safeTitle);
        draft.setBodyHtml(html);
        draft.setListingIds(ids.stream().map(UUID::toString).toList());
        draftRepository.save(draft);
        return mapDraft(draft, html);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> previewDraft(UUID draftId) {
        NewsletterDraft draft = draftRepository.findById(draftId)
                .orElseThrow(() -> new NotFoundException("Newsletter draft not found"));
        return mapDraft(draft, draft.getBodyHtml());
    }

    @Transactional
    public Map<String, Object> sendDraft(UUID draftId) {
        NewsletterDraft draft = draftRepository.findById(draftId)
                .orElseThrow(() -> new NotFoundException("Newsletter draft not found"));
        if (draft.getSentAt() != null) {
            throw new IllegalArgumentException("Draft already sent");
        }
        List<NewsletterSubscription> subs = subscriptionRepository.findAllActive();
        int sent = 0;
        List<Map<String, Object>> results = new ArrayList<>();
        String plainBody = htmlToPlain(draft.getBodyHtml());
        for (NewsletterSubscription sub : subs) {
            User user = userRepository.findById(sub.getUserId()).orElse(null);
            if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
                continue;
            }
            try {
                emailService.sendNewsletterDrops(user.getEmail(), user.getDisplayName(), draft.getTitle(), plainBody);
                sent++;
                results.add(Map.of("userId", user.getId(), "email", user.getEmail(), "ok", true));
            } catch (Exception e) {
                results.add(Map.of("userId", user.getId(), "email", user.getEmail(), "ok", false, "error", e.getMessage()));
            }
        }
        draft.setSentAt(Instant.now());
        draft.setRecipientCount(sent);
        draftRepository.save(draft);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("draftId", draft.getId());
        out.put("sent", sent);
        out.put("subscribers", subs.size());
        out.put("results", results);
        return out;
    }

    @Transactional(readOnly = true)
    public long countActiveSubscribers() {
        return subscriptionRepository.countByUnsubscribedAtIsNull();
    }

    @Transactional(readOnly = true)
    public boolean isSubscribed(UUID userId) {
        return subscriptionRepository.findByUserId(userId).map(NewsletterSubscription::isActive).orElse(false);
    }

    @Transactional
    public Map<String, Object> setSubscription(UUID userId, boolean subscribed) {
        NewsletterSubscription row = subscriptionRepository.findByUserId(userId).orElse(null);
        if (subscribed) {
            if (row == null) {
                row = new NewsletterSubscription();
                row.setUserId(userId);
                row.setSubscribedAt(Instant.now());
            } else {
                row.setUnsubscribedAt(null);
                if (row.getSubscribedAt() == null) {
                    row.setSubscribedAt(Instant.now());
                }
            }
            subscriptionRepository.save(row);
        } else if (row != null) {
            row.setUnsubscribedAt(Instant.now());
            subscriptionRepository.save(row);
        }
        return Map.of("subscribed", subscribed);
    }

    @Transactional
    public void ensureSubscribedOnVerified(UUID userId) {
        NewsletterSubscription row = subscriptionRepository.findByUserId(userId).orElse(null);
        if (row != null && !row.isActive()) {
            return;
        }
        if (row == null) {
            row = new NewsletterSubscription();
            row.setUserId(userId);
            row.setSubscribedAt(Instant.now());
            subscriptionRepository.save(row);
        }
    }

    private String compileListingHtml(List<UUID> listingIds) {
        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"newsletter-drops\">");
        for (UUID id : listingIds) {
            try {
                Map<String, Object> listing = marketplaceService.publicListingDetail(id);
                String title = String.valueOf(listing.getOrDefault("title", "Listing"));
                String species = String.valueOf(listing.getOrDefault("speciesName", ""));
                Object price = listing.get("priceAmount");
                String currency = String.valueOf(listing.getOrDefault("currency", "USD"));
                String url = baseUrl + "/marketplace/listing/" + id;
                sb.append("<article style=\"margin:16px 0;padding:12px;border:1px solid #ddd;border-radius:8px;\">");
                sb.append("<h3 style=\"margin:0 0 8px;\">").append(escapeHtml(title)).append("</h3>");
                if (!species.isBlank() && !"null".equals(species)) {
                    sb.append("<p style=\"margin:0 0 6px;font-style:italic;\">").append(escapeHtml(species)).append("</p>");
                }
                if (price != null) {
                    sb.append("<p style=\"margin:0 0 8px;font-weight:bold;\">").append(escapeHtml(price + " " + currency)).append("</p>");
                }
                sb.append("<a href=\"").append(escapeHtml(url)).append("\">").append(escapeHtml(url)).append("</a>");
                sb.append("</article>");
            } catch (Exception ignored) {
                // skip missing listings
            }
        }
        sb.append("</div>");
        return sb.toString();
    }

    private static String escapeHtml(String raw) {
        if (raw == null) return "";
        return raw.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static String htmlToPlain(String html) {
        if (html == null) return "";
        return html.replaceAll("<[^>]+>", "\n").replaceAll("\n{3,}", "\n\n").trim();
    }

    private Map<String, Object> mapDraft(NewsletterDraft draft, String html) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", draft.getId());
        out.put("title", draft.getTitle());
        out.put("bodyHtml", html);
        out.put("listingIds", draft.getListingIds() == null ? List.of() : draft.getListingIds());
        out.put("sentAt", draft.getSentAt());
        out.put("recipientCount", draft.getRecipientCount());
        out.put("subscriberCount", subscriptionRepository.countByUnsubscribedAtIsNull());
        return out;
    }
}
