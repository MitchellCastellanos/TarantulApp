package com.tarantulapp.service;

import com.tarantulapp.entity.ActivityPost;
import com.tarantulapp.entity.ActivityPostComment;
import com.tarantulapp.entity.ActivityPostLike;
import com.tarantulapp.entity.CommunityModerationTrace;
import com.tarantulapp.entity.Tarantula;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.ActivityPostCommentRepository;
import com.tarantulapp.repository.ActivityPostLikeRepository;
import com.tarantulapp.repository.ActivityPostRepository;
import com.tarantulapp.repository.CommunityModerationTraceRepository;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.util.FileStorageService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.time.Instant;

@Service
public class ActivityPostService {

    private static final int MAX_PAGE_SIZE = 40;
    private static final long MAX_IMAGE_BYTES = 8L * 1024L * 1024L;
    private static final Pattern WORD_SPLIT = Pattern.compile("\\s+");
    private static final int MAX_POSTS_PER_HOUR = 12;
    private static final int MAX_COMMENTS_PER_HOUR = 40;
    private static final String TOPIC_SEX_ID = "sex_id_case";
    private static final String TOPIC_ENCLOSURE = "enclosure_check";
    private static final String TOPIC_SPIDER_OKAY = "spider_okay";
    private static final String TOPIC_MEET_MY_TS = "meet_my_ts";
    private static final Set<String> ALLOWED_MILESTONE_KINDS = Collections.unmodifiableSet(
            new HashSet<>(List.of(TOPIC_SEX_ID, TOPIC_ENCLOSURE, TOPIC_SPIDER_OKAY, TOPIC_MEET_MY_TS))
    );

    private final ActivityPostRepository activityPostRepository;
    private final ActivityPostLikeRepository activityPostLikeRepository;
    private final ActivityPostCommentRepository activityPostCommentRepository;
    private final TarantulaRepository tarantulaRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final FileStorageService fileStorageService;
    private final CommunityModerationTraceRepository communityModerationTraceRepository;

    public ActivityPostService(ActivityPostRepository activityPostRepository,
                               ActivityPostLikeRepository activityPostLikeRepository,
                               ActivityPostCommentRepository activityPostCommentRepository,
                               TarantulaRepository tarantulaRepository,
                               UserRepository userRepository,
                               NotificationService notificationService,
                               FileStorageService fileStorageService,
                               CommunityModerationTraceRepository communityModerationTraceRepository) {
        this.activityPostRepository = activityPostRepository;
        this.activityPostLikeRepository = activityPostLikeRepository;
        this.activityPostCommentRepository = activityPostCommentRepository;
        this.tarantulaRepository = tarantulaRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.fileStorageService = fileStorageService;
        this.communityModerationTraceRepository = communityModerationTraceRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> publicFeed(int page, int size, Optional<UUID> viewerId) {
        Pageable p = PageRequest.of(page, clampSize(size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ActivityPost> rows = activityPostRepository.findByVisibilityAndHiddenAtIsNullOrderByCreatedAtDesc("public", p);
        return pageToDto(rows, viewerId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> myPosts(UUID authorId, int page, int size) {
        Pageable p = PageRequest.of(page, clampSize(size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ActivityPost> rows = activityPostRepository.findByAuthorUserIdOrderByCreatedAtDesc(authorId, p);
        return pageToDto(rows, Optional.of(authorId));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> publicFeedByTopic(String topicKey, int page, int size, Optional<UUID> viewerId) {
        String normalized = normalizeTopicKey(topicKey);
        Pageable p = PageRequest.of(page, clampSize(size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ActivityPost> rows = activityPostRepository
                .findByVisibilityAndHiddenAtIsNullAndMilestoneKindOrderByCreatedAtDesc("public", normalized, p);
        return pageToDto(rows, viewerId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> publicPost(UUID postId, Optional<UUID> viewerId) {
        ActivityPost post = activityPostRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Publicacion no encontrada"));
        if (!canView(post, viewerId)) {
            throw new AccessDeniedException("No autorizado");
        }
        User author = userRepository.findById(post.getAuthorUserId()).orElse(null);
        Tarantula spider = post.getTarantulaId() == null
                ? null
                : tarantulaRepository.findById(post.getTarantulaId()).orElse(null);
        return toPostDto(post, viewerId, author, spider);
    }

    @Transactional
    public Map<String, Object> createPost(UUID authorId, String body, String visibility, String milestoneKind,
                                        String imageUrl, UUID tarantulaId) {
        long postsLastHour = activityPostRepository.countByAuthorUserIdAndCreatedAtAfter(authorId, Instant.now().minusSeconds(3600));
        if (postsLastHour >= MAX_POSTS_PER_HOUR) {
            saveModerationTrace(authorId, "post", "blocked", "rate_limit_post_hour", "rate-limit");
            throw new IllegalArgumentException("Demasiadas publicaciones en poco tiempo. Intenta de nuevo en unos minutos.");
        }
        String vis = normalizeVisibility(visibility);
        String cleanedBody = cleanText(body, 2000);
        if (cleanedBody == null) {
            throw new IllegalArgumentException("Texto requerido");
        }
        if (containsBlockedLanguage(cleanedBody)) {
            saveModerationTrace(authorId, "post", "blocked", "blocked_language", cleanedBody);
            throw new IllegalArgumentException("Tu texto infringe las reglas de comunidad.");
        }
        if (tarantulaId != null) {
            Tarantula t = tarantulaRepository.findById(tarantulaId)
                    .orElseThrow(() -> new NotFoundException("Tarantula no encontrada"));
            if (!authorId.equals(t.getUserId())) {
                throw new AccessDeniedException("No es tu ejemplar");
            }
        }
        ActivityPost post = new ActivityPost();
        post.setAuthorUserId(authorId);
        post.setBody(cleanedBody);
        post.setVisibility(vis);
        post.setMilestoneKind(normalizeMilestoneKind(milestoneKind));
        post.setImageUrl(cleanText(imageUrl, 500));
        post.setTarantulaId(tarantulaId);
        ActivityPost saved = activityPostRepository.save(post);
        User author = userRepository.findById(authorId).orElse(null);
        Tarantula spider = saved.getTarantulaId() == null
                ? null
                : tarantulaRepository.findById(saved.getTarantulaId()).orElse(null);
        return toPostDto(saved, Optional.of(authorId), author, spider);
    }

    @Transactional
    public void deleteMyPost(UUID userId, UUID postId) {
        ActivityPost post = activityPostRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Publicacion no encontrada"));
        if (!userId.equals(post.getAuthorUserId())) {
            throw new AccessDeniedException("No autorizado");
        }
        activityPostRepository.delete(post);
    }

    @Transactional
    public Map<String, Object> toggleLike(UUID userId, UUID postId) {
        ActivityPost post = activityPostRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Publicacion no encontrada"));
        if (!canView(post, Optional.of(userId))) {
            throw new AccessDeniedException("No autorizado");
        }
        boolean hadLike = activityPostLikeRepository.existsByPostIdAndUserId(postId, userId);
        if (hadLike) {
            activityPostLikeRepository.deleteByPostIdAndUserId(postId, userId);
        } else {
            ActivityPostLike like = new ActivityPostLike();
            like.setPostId(postId);
            like.setUserId(userId);
            activityPostLikeRepository.save(like);
            User actor = userRepository.findById(userId).orElse(null);
            String actorLabel = actor != null && actor.getDisplayName() != null && !actor.getDisplayName().isBlank()
                    ? actor.getDisplayName()
                    : "Un keeper";
            String postPreview = snippet(post.getBody(), 90);
            notificationService.create(
                    post.getAuthorUserId(),
                    userId,
                    "SPOOD_RECEIVED",
                    actorLabel + " reacciono a tu post",
                    postPreview.isBlank() ? "Tu publicacion recibio un Spood." : postPreview,
                    Map.of(
                            "postId", String.valueOf(postId),
                            "route", "/comunidad"
                    )
            );
        }
        post = activityPostRepository.findById(postId).orElseThrow();
        User author = userRepository.findById(post.getAuthorUserId()).orElse(null);
        Tarantula spider = post.getTarantulaId() == null
                ? null
                : tarantulaRepository.findById(post.getTarantulaId()).orElse(null);
        return toPostDto(post, Optional.of(userId), author, spider);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listComments(Optional<UUID> viewerId, UUID postId) {
        ActivityPost post = activityPostRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Publicacion no encontrada"));
        if (!canView(post, viewerId)) {
            throw new AccessDeniedException("No autorizado");
        }
        List<ActivityPostComment> list = activityPostCommentRepository.findByPostIdAndHiddenAtIsNullOrderByCreatedAtAsc(postId);
        Set<UUID> userIds = list.stream().map(ActivityPostComment::getAuthorUserId).collect(Collectors.toSet());
        Map<UUID, User> users = loadUsers(userIds);
        List<Map<String, Object>> out = new ArrayList<>();
        for (ActivityPostComment c : list) {
            out.add(commentToDto(c, users.get(c.getAuthorUserId())));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listLikes(UUID postId, Optional<UUID> viewerId, int limit) {
        ActivityPost post = activityPostRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Publicacion no encontrada"));
        if (!canView(post, viewerId)) {
            throw new AccessDeniedException("No autorizado");
        }
        int safeLimit = Math.max(1, Math.min(limit, 100));
        List<ActivityPostLike> likes = activityPostLikeRepository.findByPostIdOrderByCreatedAtDesc(
                postId, PageRequest.of(0, safeLimit)
        );
        Set<UUID> userIds = likes.stream().map(ActivityPostLike::getUserId).collect(Collectors.toSet());
        Map<UUID, User> users = loadUsers(userIds);
        List<Map<String, Object>> out = new ArrayList<>();
        for (ActivityPostLike like : likes) {
            User author = users.get(like.getUserId());
            Map<String, Object> row = new LinkedHashMap<>();
            String vis = normalizeCommunityProfileVisibility(author == null ? null : author.getCommunityProfileVisibility());
            row.put("userId", like.getUserId());
            row.put("handle", author == null || author.getPublicHandle() == null ? "" : author.getPublicHandle());
            row.put("displayName", author == null || author.getDisplayName() == null ? "" : author.getDisplayName());
            row.put("profilePhoto", author == null || author.getProfilePhoto() == null ? "" : author.getProfilePhoto());
            row.put("communityProfileVisibility", vis);
            row.put("canViewFullProfile", "public_full".equals(vis));
            row.put("likedAt", like.getCreatedAt() == null ? "" : like.getCreatedAt().toString());
            out.add(row);
        }
        return out;
    }

    @Transactional
    public Map<String, Object> addComment(UUID userId, UUID postId, String body) {
        long commentsLastHour = activityPostCommentRepository.countByAuthorUserIdAndCreatedAtAfter(userId, Instant.now().minusSeconds(3600));
        if (commentsLastHour >= MAX_COMMENTS_PER_HOUR) {
            saveModerationTrace(userId, "comment", "blocked", "rate_limit_comment_hour", "rate-limit");
            throw new IllegalArgumentException("Demasiados comentarios en poco tiempo. Intenta de nuevo en unos minutos.");
        }
        ActivityPost post = activityPostRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Publicacion no encontrada"));
        if (!canView(post, Optional.of(userId))) {
            throw new AccessDeniedException("No autorizado");
        }
        String text = cleanText(body, 1500);
        if (text == null) {
            throw new IllegalArgumentException("Comentario vacio");
        }
        if (containsBlockedLanguage(text)) {
            saveModerationTrace(userId, "comment", "blocked", "blocked_language", text);
            throw new IllegalArgumentException("Tu comentario infringe las reglas de comunidad.");
        }
        ActivityPostComment c = new ActivityPostComment();
        c.setPostId(postId);
        c.setAuthorUserId(userId);
        c.setBody(text);
        ActivityPostComment saved = activityPostCommentRepository.save(c);
        User actor = userRepository.findById(userId).orElse(null);
        String actorLabel = actor != null && actor.getDisplayName() != null && !actor.getDisplayName().isBlank()
                ? actor.getDisplayName()
                : "Un keeper";
        notificationService.create(
                post.getAuthorUserId(),
                userId,
                "POST_COMMENT",
                actorLabel + " comento tu post",
                snippet(text, 120),
                Map.of(
                        "postId", String.valueOf(postId),
                        "commentId", String.valueOf(saved.getId()),
                        "route", "/comunidad"
                )
        );
        User u = userRepository.findById(userId).orElse(null);
        return commentToDto(saved, u);
    }

    @Transactional
    public void deleteMyComment(UUID userId, UUID commentId) {
        ActivityPostComment c = activityPostCommentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Comentario no encontrado"));
        if (!userId.equals(c.getAuthorUserId())) {
            throw new AccessDeniedException("No autorizado");
        }
        activityPostCommentRepository.delete(c);
    }

    private Map<String, Object> pageToDto(Page<ActivityPost> rows, Optional<UUID> viewerId) {
        Set<UUID> authorIds = rows.getContent().stream().map(ActivityPost::getAuthorUserId).collect(Collectors.toSet());
        Map<UUID, User> authors = loadUsers(authorIds);
        Map<UUID, Tarantula> spiders = loadTarantulasForPosts(rows.getContent());
        List<Map<String, Object>> content = new ArrayList<>();
        for (ActivityPost p : rows.getContent()) {
            Tarantula spider = p.getTarantulaId() == null ? null : spiders.get(p.getTarantulaId());
            content.add(toPostDto(p, viewerId, authors.get(p.getAuthorUserId()), spider));
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("content", content);
        out.put("totalElements", rows.getTotalElements());
        out.put("totalPages", rows.getTotalPages());
        out.put("number", rows.getNumber());
        out.put("size", rows.getSize());
        return out;
    }

    private Map<String, Object> toPostDto(ActivityPost p, Optional<UUID> viewerId, User author, Tarantula spider) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("body", p.getBody());
        m.put("visibility", p.getVisibility());
        m.put("milestoneKind", p.getMilestoneKind() == null ? "" : p.getMilestoneKind());
        m.put("imageUrl", p.getImageUrl() == null ? "" : p.getImageUrl());
        m.put("tarantulaId", p.getTarantulaId());
        m.put("createdAt", p.getCreatedAt() != null ? p.getCreatedAt().toString() : "");
        m.put("authorUserId", p.getAuthorUserId());
        m.put("authorDisplayName", author != null && author.getDisplayName() != null ? author.getDisplayName() : "");
        m.put("authorHandle", author != null && author.getPublicHandle() != null ? author.getPublicHandle() : "");
        String tName = "";
        String tSci = "";
        if (spider != null && spider.getUserId().equals(p.getAuthorUserId())) {
            if (spider.getName() != null) {
                tName = spider.getName();
            }
            if (spider.getSpecies() != null && spider.getSpecies().getScientificName() != null) {
                tSci = spider.getSpecies().getScientificName();
            }
        }
        m.put("tarantulaName", tName);
        m.put("tarantulaScientificName", tSci);
        long likes = activityPostLikeRepository.countByPostId(p.getId());
        m.put("likeCount", likes);
        boolean liked = viewerId.map(uid -> activityPostLikeRepository.existsByPostIdAndUserId(p.getId(), uid)).orElse(false);
        m.put("likedByMe", liked);
        long comments = activityPostCommentRepository.countByPostIdAndHiddenAtIsNull(p.getId());
        m.put("commentsCount", comments);
        return m;
    }

    private Map<UUID, Tarantula> loadTarantulasForPosts(List<ActivityPost> posts) {
        List<UUID> ids = posts.stream()
                .map(ActivityPost::getTarantulaId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return tarantulaRepository.findAllWithSpeciesByIdIn(ids).stream()
                .collect(Collectors.toMap(Tarantula::getId, t -> t, (a, b) -> a));
    }

    private Map<String, Object> commentToDto(ActivityPostComment c, User author) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("postId", c.getPostId());
        m.put("body", c.getBody());
        m.put("createdAt", c.getCreatedAt() != null ? c.getCreatedAt().toString() : "");
        m.put("authorUserId", c.getAuthorUserId());
        m.put("authorDisplayName", author != null && author.getDisplayName() != null ? author.getDisplayName() : "");
        m.put("authorHandle", author != null && author.getPublicHandle() != null ? author.getPublicHandle() : "");
        return m;
    }

    private Map<UUID, User> loadUsers(Set<UUID> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(ids).stream().collect(Collectors.toMap(User::getId, u -> u));
    }

    private boolean canView(ActivityPost post, Optional<UUID> viewerId) {
        if (post.getHiddenAt() != null) {
            return viewerId.filter(uid -> uid.equals(post.getAuthorUserId())).isPresent();
        }
        if ("public".equals(post.getVisibility())) {
            return true;
        }
        if ("private".equals(post.getVisibility())) {
            return viewerId.filter(uid -> uid.equals(post.getAuthorUserId())).isPresent();
        }
        return false;
    }

    private String normalizeVisibility(String raw) {
        if (raw == null || raw.isBlank()) {
            return "private";
        }
        String v = raw.trim().toLowerCase();
        if (!v.equals("public") && !v.equals("private")) {
            throw new IllegalArgumentException("Visibilidad invalida");
        }
        return v;
    }

    private String normalizeMilestoneKind(String raw) {
        String cleaned = cleanText(raw, 40);
        if (cleaned == null) {
            return null;
        }
        String normalized = cleaned.toLowerCase(Locale.ROOT);
        if (!ALLOWED_MILESTONE_KINDS.contains(normalized)) {
            throw new IllegalArgumentException("Categoria de post invalida");
        }
        return normalized;
    }

    private String normalizeTopicKey(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Categoria requerida");
        }
        String normalized = raw.trim().toLowerCase(Locale.ROOT);
        if (!ALLOWED_MILESTONE_KINDS.contains(normalized)) {
            throw new IllegalArgumentException("Categoria invalida");
        }
        return normalized;
    }

    private String normalizeCommunityProfileVisibility(String raw) {
        if (raw == null || raw.isBlank()) {
            return "preview_only";
        }
        String v = raw.trim().toLowerCase(Locale.ROOT);
        if (!v.equals("public_full") && !v.equals("preview_only") && !v.equals("private")) {
            return "preview_only";
        }
        return v;
    }

    @Transactional
    public Map<String, String> uploadPostImage(UUID userId, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            saveModerationTrace(userId, "image", "blocked", "empty_file", "");
            throw new IllegalArgumentException("Imagen requerida");
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            saveModerationTrace(userId, "image", "blocked", "image_too_large", file.getOriginalFilename());
            throw new IllegalArgumentException("La imagen supera el limite de 8MB.");
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!contentType.startsWith("image/")) {
            saveModerationTrace(userId, "image", "blocked", "invalid_image_mime", contentType);
            throw new IllegalArgumentException("Formato de imagen invalido.");
        }
        String path = fileStorageService.saveFile(file, "community/posts/" + userId);
        return Map.of("imageUrl", path);
    }

    private int clampSize(int size) {
        if (size < 1) {
            return 20;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private String cleanText(String value, int maxLen) {
        if (value == null) {
            return null;
        }
        String out = value.trim().replaceAll("\\s+", " ");
        if (out.isEmpty()) {
            return null;
        }
        return out.length() > maxLen ? out.substring(0, maxLen) : out;
    }

    private String snippet(String value, int maxLen) {
        if (value == null) {
            return "";
        }
        String out = value.trim().replaceAll("\\s+", " ");
        if (out.isEmpty()) {
            return "";
        }
        if (out.length() <= maxLen) {
            return out;
        }
        return out.substring(0, Math.max(0, maxLen - 1)).trim() + "…";
    }

    private boolean containsBlockedLanguage(String raw) {
        String normalized = normalizeForModeration(raw);
        if (normalized.isBlank()) {
            return false;
        }
        String[] words = WORD_SPLIT.split(normalized);
        for (String w : words) {
            if (w.equals("puta") || w.equals("puto") || w.equals("pito") || w.equals("mierda")
                    || w.equals("pendejo") || w.equals("pendeja") || w.equals("chingar")
                    || w.equals("chingada") || w.equals("culo") || w.equals("culero")) {
                return true;
            }
        }
        return false;
    }

    private String normalizeForModeration(String raw) {
        if (raw == null) {
            return "";
        }
        String out = Normalizer.normalize(raw, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT);
        out = out.replace('0', 'o').replace('1', 'i').replace('3', 'e').replace('4', 'a').replace('@', 'a');
        out = out.replaceAll("[^a-z\\s]", " ");
        return out.replaceAll("\\s+", " ").trim();
    }

    private void saveModerationTrace(UUID userId, String targetType, String action, String reason, String preview) {
        CommunityModerationTrace trace = new CommunityModerationTrace();
        trace.setUserId(userId);
        trace.setTargetType(targetType);
        trace.setAction(action);
        trace.setReason(reason);
        trace.setContentPreview(snippet(preview, 220));
        communityModerationTraceRepository.save(trace);
    }
}
