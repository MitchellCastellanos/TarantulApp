package com.tarantulapp.service;

import com.tarantulapp.dto.*;
import com.tarantulapp.entity.Photo;
import com.tarantulapp.entity.Tarantula;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.*;
import com.tarantulapp.util.FileStorageService;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class TarantulaService {

    private final TarantulaRepository tarantulaRepository;
    private final SpeciesRepository speciesRepository;
    private final FeedingLogRepository feedingLogRepository;
    private final MoltLogRepository moltLogRepository;
    private final BehaviorLogRepository behaviorLogRepository;
    private final FileStorageService fileStorageService;
    private final PhotoRepository photoRepository;
    private final UserRepository userRepository;
    private final PlanAccessService planAccessService;
    private final SecurityHelper securityHelper;

    public TarantulaService(TarantulaRepository tarantulaRepository,
                            SpeciesRepository speciesRepository,
                            FeedingLogRepository feedingLogRepository,
                            MoltLogRepository moltLogRepository,
                            BehaviorLogRepository behaviorLogRepository,
                            FileStorageService fileStorageService,
                            PhotoRepository photoRepository,
                            UserRepository userRepository,
                            PlanAccessService planAccessService,
                            SecurityHelper securityHelper) {
        this.tarantulaRepository = tarantulaRepository;
        this.speciesRepository = speciesRepository;
        this.feedingLogRepository = feedingLogRepository;
        this.moltLogRepository = moltLogRepository;
        this.behaviorLogRepository = behaviorLogRepository;
        this.fileStorageService = fileStorageService;
        this.photoRepository = photoRepository;
        this.userRepository = userRepository;
        this.planAccessService = planAccessService;
        this.securityHelper = securityHelper;
    }

    public TarantulaResponse create(TarantulaRequest req, UUID userId) {
        enforceCreationLimit(userId);
        Tarantula t = new Tarantula();
        t.setUserId(userId);
        t.setShortId(generateShortId());
        applyRequest(req, t);
        Tarantula saved = tarantulaRepository.save(t);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        return toResponse(saved, planAccessService.lockedTarantulaIds(user));
    }

    @Transactional(readOnly = true)
    public List<TarantulaResponse> findByUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        Set<UUID> lockedIds = planAccessService.lockedTarantulaIds(user);
        return tarantulaRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(t -> toResponse(t, lockedIds)).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TarantulaResponse findById(UUID id, UUID userId) {
        Tarantula t = getOwned(id, userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        return toResponse(t, planAccessService.lockedTarantulaIds(user));
    }

    public TarantulaResponse update(UUID id, TarantulaRequest req, UUID userId) {
        planAccessService.enforceTarantulaWrite(userId, id);
        Tarantula t = getOwned(id, userId);
        applyRequest(req, t);
        Tarantula saved = tarantulaRepository.save(t);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        return toResponse(saved, planAccessService.lockedTarantulaIds(user));
    }

    public void delete(UUID id, UUID userId) {
        Tarantula t = getOwned(id, userId);
        tarantulaRepository.delete(t);
    }

    public TarantulaResponse uploadPhoto(UUID id, MultipartFile file, UUID userId) throws IOException {
        planAccessService.enforceTarantulaWrite(userId, id);
        Tarantula t = getOwned(id, userId);
        String path = fileStorageService.saveFile(file, "tarantulas/" + id);
        t.setProfilePhoto(path);
        Tarantula saved = tarantulaRepository.save(t);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        return toResponse(saved, planAccessService.lockedTarantulaIds(user));
    }

    @Transactional(readOnly = true)
    public List<PhotoResponse> getPhotos(UUID tarantulaId, UUID userId) {
        getOwned(tarantulaId, userId);
        return photoRepository.findByTarantulaIdOrderByCreatedAtDesc(tarantulaId)
                .stream().map(PhotoResponse::from).collect(Collectors.toList());
    }

    public PhotoResponse addPhoto(UUID tarantulaId, MultipartFile file, String caption, UUID userId) throws IOException {
        planAccessService.enforceTarantulaWrite(userId, tarantulaId);
        getOwned(tarantulaId, userId);
        String path = fileStorageService.saveFile(file, "gallery/" + tarantulaId);
        Photo photo = new Photo();
        photo.setTarantulaId(tarantulaId);
        photo.setFilePath(path);
        photo.setCaption(caption);
        return PhotoResponse.from(photoRepository.save(photo));
    }

    public void deletePhoto(UUID tarantulaId, UUID photoId, UUID userId) {
        planAccessService.enforceTarantulaWrite(userId, tarantulaId);
        getOwned(tarantulaId, userId);
        Photo photo = photoRepository.findByIdAndTarantulaId(photoId, tarantulaId)
                .orElseThrow(() -> new NotFoundException("Foto no encontrada"));
        photoRepository.delete(photo);
    }

    public TarantulaResponse togglePublic(UUID id, UUID userId) {
        planAccessService.enforceTarantulaWrite(userId, id);
        Tarantula t = getOwned(id, userId);
        t.setIsPublic(!Boolean.TRUE.equals(t.getIsPublic()));
        Tarantula saved = tarantulaRepository.save(t);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        return toResponse(saved, planAccessService.lockedTarantulaIds(user));
    }

    public TarantulaResponse markDeceased(UUID id, UUID userId, DeceasedRequest req) {
        planAccessService.enforceTarantulaWrite(userId, id);
        Tarantula t = getOwned(id, userId);
        t.setDeceasedAt(req.getDeceasedAt() != null ? req.getDeceasedAt() : LocalDateTime.now());
        t.setDeathNotes(req.getNotes());
        Tarantula saved = tarantulaRepository.save(t);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        return toResponse(saved, planAccessService.lockedTarantulaIds(user));
    }

    @Transactional(readOnly = true)
    public List<TimelineEventDTO> getTimeline(UUID tarantulaId, UUID userId) {
        getOwned(tarantulaId, userId); // verify ownership
        List<TimelineEventDTO> events = new ArrayList<>();

        feedingLogRepository.findByTarantulaIdOrderByFedAtDesc(tarantulaId).forEach(f -> {
            String title = Boolean.FALSE.equals(f.getAccepted()) ? "feeding_rejected" : "feeding";
            String summary = buildFeedingSummary(f.getQuantity(), f.getPreyType(), f.getPreySize(), f.getNotes());
            events.add(new TimelineEventDTO(f.getId(), "feeding", f.getFedAt(), title, summary));
        });

        moltLogRepository.findByTarantulaIdOrderByMoltedAtDesc(tarantulaId).forEach(m -> {
            String summary = buildMoltSummary(m.getPreSizeCm(), m.getPostSizeCm(), m.getNotes());
            events.add(new TimelineEventDTO(m.getId(), "molt", m.getMoltedAt(), "molt", summary));
        });

        behaviorLogRepository.findByTarantulaIdOrderByLoggedAtDesc(tarantulaId).forEach(b -> {
            events.add(new TimelineEventDTO(b.getId(), "behavior", b.getLoggedAt(), b.getMood(), b.getNotes()));
        });

        events.sort(Comparator.comparing(TimelineEventDTO::getEventDate).reversed());
        return events;
    }

    /** Timeline visible en la ficha por QR: público para todos si isPublic; si es privado, solo el dueño (con JWT). */
    @Transactional(readOnly = true)
    public List<TimelineEventDTO> getPublicTimeline(String shortId) {
        Tarantula t = tarantulaRepository.findByShortId(shortId)
                .orElseThrow(() -> new NotFoundException("Perfil no encontrado"));
        boolean owner = isQrProfileOwner(t);
        if (!Boolean.TRUE.equals(t.getIsPublic()) && !owner) {
            throw new NotFoundException("Este perfil no es público");
        }

        List<TimelineEventDTO> events = new ArrayList<>();
        feedingLogRepository.findByTarantulaIdOrderByFedAtDesc(t.getId()).forEach(f -> {
            String title = Boolean.FALSE.equals(f.getAccepted()) ? "feeding_rejected" : "feeding";
            String summary = buildFeedingSummary(f.getQuantity(), f.getPreyType(), f.getPreySize(), f.getNotes());
            events.add(new TimelineEventDTO(f.getId(), "feeding", f.getFedAt(), title, summary));
        });
        moltLogRepository.findByTarantulaIdOrderByMoltedAtDesc(t.getId()).forEach(m -> {
            String summary = buildMoltSummary(m.getPreSizeCm(), m.getPostSizeCm(), m.getNotes());
            events.add(new TimelineEventDTO(m.getId(), "molt", m.getMoltedAt(), "molt", summary));
        });
        behaviorLogRepository.findByTarantulaIdOrderByLoggedAtDesc(t.getId()).forEach(b -> {
            events.add(new TimelineEventDTO(b.getId(), "behavior", b.getLoggedAt(), b.getMood(), b.getNotes()));
        });
        events.sort(Comparator.comparing(TimelineEventDTO::getEventDate).reversed());
        if (owner) {
            return events;
        }
        return events.size() > 20 ? events.subList(0, 20) : events;
    }

    @Transactional(readOnly = true)
    public PublicProfileDTO getPublicProfile(String shortId) {
        Tarantula t = tarantulaRepository.findByShortId(shortId)
                .orElseThrow(() -> new NotFoundException("Perfil no encontrado"));

        boolean owner = isQrProfileOwner(t);
        if (!Boolean.TRUE.equals(t.getIsPublic()) && !owner) {
            throw new NotFoundException("Este perfil no es público");
        }

        PublicProfileDTO dto = new PublicProfileDTO();
        dto.setTarantulaId(t.getId());
        dto.setOwnerId(t.getUserId());
        dto.setViewerIsOwner(owner);
        dto.setIsPublic(Boolean.TRUE.equals(t.getIsPublic()));
        dto.setName(t.getName());
        dto.setStage(t.getStage());
        dto.setSex(t.getSex());
        dto.setCurrentSizeCm(t.getCurrentSizeCm());
        dto.setProfilePhoto(t.getProfilePhoto());

        if (t.getSpecies() != null) {
            dto.setScientificName(t.getSpecies().getScientificName());
            dto.setCommonName(t.getSpecies().getCommonName());
            dto.setHabitatType(t.getSpecies().getHabitatType());
        }

        dto.setStatus(computeStatus(t));
        feedingLogRepository.findFirstByTarantulaIdOrderByFedAtDesc(t.getId())
                .ifPresent(f -> dto.setLastFedAt(f.getFedAt()));
        moltLogRepository.findFirstByTarantulaIdOrderByMoltedAtDesc(t.getId())
                .ifPresent(m -> dto.setLastMoltAt(m.getMoltedAt()));

        return dto;
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    private boolean isQrProfileOwner(Tarantula t) {
        return securityHelper.tryGetCurrentUserId()
                .map(id -> id.equals(t.getUserId()))
                .orElse(false);
    }

    private Tarantula getOwned(UUID id, UUID userId) {
        Tarantula t = tarantulaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Tarántula no encontrada"));
        if (!t.getUserId().equals(userId)) throw new AccessDeniedException("Acceso denegado");
        return t;
    }

    private void enforceCreationLimit(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));

        if (planAccessService.hasProFeatures(user)) {
            return;
        }

        long count = tarantulaRepository.countByUserId(userId);
        if (count >= 6) {
            throw new IllegalArgumentException("La versión gratis permite guardar hasta 6 tarántulas. Actualiza a Pro para agregar más.");
        }
    }

    private void applyRequest(TarantulaRequest req, Tarantula t) {
        t.setName(req.getName());
        t.setCurrentSizeCm(req.getCurrentSizeCm());
        t.setStage(req.getStage());
        t.setSex(req.getSex());
        t.setPurchaseDate(req.getPurchaseDate());
        t.setNotes(req.getNotes());

        if (req.getSpeciesId() != null) {
            speciesRepository.findById(req.getSpeciesId()).ifPresent(t::setSpecies);
        } else {
            t.setSpecies(null);
        }
    }

    private TarantulaResponse toResponse(Tarantula t, Set<UUID> lockedIds) {
        TarantulaResponse r = new TarantulaResponse();
        r.setId(t.getId());
        r.setName(t.getName());
        r.setCurrentSizeCm(t.getCurrentSizeCm());
        r.setStage(t.getStage());
        r.setSex(t.getSex());
        r.setPurchaseDate(t.getPurchaseDate());
        r.setProfilePhoto(t.getProfilePhoto());
        r.setNotes(t.getNotes());
        r.setIsPublic(t.getIsPublic());
        r.setShortId(t.getShortId());
        r.setCreatedAt(t.getCreatedAt());
        r.setUpdatedAt(t.getUpdatedAt());
        r.setSpecies(SpeciesDTO.from(t.getSpecies()));
        r.setDeceasedAt(t.getDeceasedAt());
        r.setDeathNotes(t.getDeathNotes());
        r.setStatus(computeStatus(t));

        feedingLogRepository.findFirstByTarantulaIdOrderByFedAtDesc(t.getId())
                .ifPresent(f -> r.setLastFedAt(f.getFedAt()));
        moltLogRepository.findFirstByTarantulaIdOrderByMoltedAtDesc(t.getId())
                .ifPresent(m -> r.setLastMoltAt(m.getMoltedAt()));

        r.setLocked(lockedIds != null && lockedIds.contains(t.getId()));

        return r;
    }

    private String computeStatus(Tarantula t) {
        if (t.getDeceasedAt() != null) return "deceased";

        UUID tarantulaId = t.getId();
        Optional<com.tarantulapp.entity.BehaviorLog> lastBehavior =
                behaviorLogRepository.findFirstByTarantulaIdOrderByLoggedAtDesc(tarantulaId);

        Instant now = Instant.now();
        if (lastBehavior.isPresent()
                && "pre_molt".equals(lastBehavior.get().getMood())
                && lastBehavior.get().getLoggedAt().isAfter(now.minus(30, ChronoUnit.DAYS))) {
            return "pre_molt";
        }

        Optional<com.tarantulapp.entity.FeedingLog> lastFeeding =
                feedingLogRepository.findFirstByTarantulaIdOrderByFedAtDesc(tarantulaId);

        if (lastFeeding.isEmpty()
                || lastFeeding.get().getFedAt().isBefore(now.minus(14, ChronoUnit.DAYS))) {
            return "pending_feeding";
        }

        return "active";
    }

    private String generateShortId() {
        for (int attempts = 0; attempts < 10; attempts++) {
            String id = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
            if (!tarantulaRepository.existsByShortId(id)) return id;
        }
        throw new IllegalStateException("No se pudo generar un short_id único");
    }

    private String buildFeedingSummary(Integer qty, String preyType, String preySize, String notes) {
        StringBuilder sb = new StringBuilder();
        if (qty != null && qty > 1) sb.append(qty).append("x ");
        if (preyType != null) sb.append(preyType);
        if (preySize != null) sb.append(" (").append(preySize).append(")");
        if (notes != null && !notes.isBlank()) sb.append(" — ").append(notes);
        return sb.toString().trim();
    }

    private String buildMoltSummary(java.math.BigDecimal pre, java.math.BigDecimal post, String notes) {
        StringBuilder sb = new StringBuilder();
        if (pre != null) sb.append(pre).append(" cm");
        if (pre != null && post != null) sb.append(" → ");
        if (post != null) sb.append(post).append(" cm");
        if (notes != null && !notes.isBlank()) {
            if (sb.length() > 0) sb.append(" — ");
            sb.append(notes);
        }
        return sb.toString().trim();
    }

    private String formatMood(String mood) {
        if (mood == null) return "–";
        return switch (mood) {
            case "calm" -> "Tranquila";
            case "defensive" -> "Defensiva";
            case "active" -> "Activa";
            case "hiding" -> "Escondida";
            case "pre_molt" -> "Pre-muda";
            default -> mood;
        };
    }
}
