package com.tarantulapp.service;

import com.tarantulapp.dto.*;
import com.tarantulapp.entity.FeedingLog;
import com.tarantulapp.entity.PhotoSpood;
import com.tarantulapp.entity.Photo;
import com.tarantulapp.entity.BehaviorLog;
import com.tarantulapp.entity.TarantulaSpood;
import com.tarantulapp.entity.Tarantula;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.*;
import com.tarantulapp.util.FileStorageService;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
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
    private final PhotoSpoodRepository photoSpoodRepository;
    private final TarantulaSpoodRepository tarantulaSpoodRepository;
    private final UserRepository userRepository;
    private final PlanAccessService planAccessService;
    private final SecurityHelper securityHelper;
    private final TarantulaTimelineJdbcRepository timelineJdbcRepository;

    public TarantulaService(TarantulaRepository tarantulaRepository,
                            SpeciesRepository speciesRepository,
                            FeedingLogRepository feedingLogRepository,
                            MoltLogRepository moltLogRepository,
                            BehaviorLogRepository behaviorLogRepository,
                            FileStorageService fileStorageService,
                            PhotoRepository photoRepository,
                            PhotoSpoodRepository photoSpoodRepository,
                            TarantulaSpoodRepository tarantulaSpoodRepository,
                            UserRepository userRepository,
                            PlanAccessService planAccessService,
                            SecurityHelper securityHelper,
                            TarantulaTimelineJdbcRepository timelineJdbcRepository) {
        this.tarantulaRepository = tarantulaRepository;
        this.speciesRepository = speciesRepository;
        this.feedingLogRepository = feedingLogRepository;
        this.moltLogRepository = moltLogRepository;
        this.behaviorLogRepository = behaviorLogRepository;
        this.fileStorageService = fileStorageService;
        this.photoRepository = photoRepository;
        this.photoSpoodRepository = photoSpoodRepository;
        this.tarantulaSpoodRepository = tarantulaSpoodRepository;
        this.userRepository = userRepository;
        this.planAccessService = planAccessService;
        this.securityHelper = securityHelper;
        this.timelineJdbcRepository = timelineJdbcRepository;
    }

    public TarantulaResponse create(TarantulaRequest req, UUID userId) {
        enforceCreationLimit(userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        Tarantula t = new Tarantula();
        t.setUserId(userId);
        t.setShortId(generateShortId());
        t.setIsPublic(Boolean.TRUE.equals(user.getDefaultTarantulaPublic()));
        applyRequest(req, t);
        Tarantula saved = tarantulaRepository.save(t);
        return toResponse(saved, planAccessService.lockedTarantulaIds(user));
    }

    @Transactional(readOnly = true)
    public List<TarantulaResponse> findByUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        Set<UUID> lockedIds = planAccessService.lockedTarantulaIds(user);
        List<Tarantula> rows = tarantulaRepository.findByUserIdOrderByCreatedAtDesc(userId);
        ListAgg agg = loadListAggregates(rows.stream().map(Tarantula::getId).toList());
        return rows.stream().map(t -> toResponseWithListAggregates(t, lockedIds, agg)).collect(Collectors.toList());
    }

    /**
     * Paginated collection for large inventories. When both {@code page} and {@code size} are omitted,
     * {@link #findByUser(UUID)} keeps returning a full array for existing clients.
     */
    @Transactional(readOnly = true)
    public TarantulaCollectionPageResponse findByUserPaged(UUID userId, int page, int pageSize) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        Set<UUID> lockedIds = planAccessService.lockedTarantulaIds(user);
        Page<Tarantula> pg = tarantulaRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, pageSize));
        List<Tarantula> rows = pg.getContent();
        ListAgg agg = loadListAggregates(rows.stream().map(Tarantula::getId).toList());
        List<TarantulaResponse> content = rows.stream()
                .map(t -> toResponseWithListAggregates(t, lockedIds, agg))
                .collect(Collectors.toList());
        return new TarantulaCollectionPageResponse(
                content,
                pg.getTotalElements(),
                page,
                pageSize,
                pg.hasNext()
        );
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

    @Transactional(readOnly = true)
    public PagedListResponse<PhotoResponse> getPhotosPaged(UUID tarantulaId, UUID userId, int page, int pageSize) {
        getOwned(tarantulaId, userId);
        int p = Math.max(0, page);
        int sz = Math.min(60, Math.max(1, pageSize));
        Page<Photo> pg = photoRepository.findByTarantulaIdOrderByCreatedAtDesc(tarantulaId, PageRequest.of(p, sz));
        List<PhotoResponse> content = pg.getContent().stream().map(PhotoResponse::from).collect(Collectors.toList());
        return new PagedListResponse<>(content, pg.getTotalElements(), p, sz, pg.hasNext());
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

    /**
     * Sets visibility for every tarantula owned by the keeper and persists the default for new specimens.
     */
    public Map<String, Object> bulkSetVisibility(UUID userId, boolean isPublic) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        user.setDefaultTarantulaPublic(isPublic);
        userRepository.save(user);
        int updated = tarantulaRepository.setVisibilityByUserId(userId, isPublic);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("updatedCount", updated);
        out.put("isPublic", isPublic);
        out.put("defaultTarantulaPublic", isPublic);
        return out;
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
        return buildFullTimelineInMemory(tarantulaId);
    }

    @Transactional(readOnly = true)
    public PagedListResponse<TimelineEventDTO> getTimelinePaged(UUID tarantulaId, UUID userId, int page, int pageSize) {
        getOwned(tarantulaId, userId);
        return sliceTimelineFromDb(tarantulaId, page, pageSize, null);
    }

    private PagedListResponse<TimelineEventDTO> sliceTimelineFromDb(UUID tarantulaId, int page, int pageSize, Long visibleTotalCap) {
        int p = Math.max(0, page);
        int sz = Math.min(60, Math.max(1, pageSize));
        long fullCount = timelineJdbcRepository.countEvents(tarantulaId);
        long visibleTotal = visibleTotalCap == null ? fullCount : Math.min(visibleTotalCap, fullCount);
        long offset = (long) p * sz;
        if (offset >= visibleTotal) {
            return new PagedListResponse<>(List.of(), visibleTotal, p, sz, false);
        }
        int limit = (int) Math.min(sz, visibleTotal - offset);
        List<Map<String, Object>> rows = timelineJdbcRepository.fetchSlice(tarantulaId, limit, (int) offset);
        List<TimelineEventDTO> content = rows.stream()
                .map(this::timelineDtoFromJdbcRow)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        boolean hasNext = offset + content.size() < visibleTotal;
        return new PagedListResponse<>(content, visibleTotal, p, sz, hasNext);
    }

    private List<TimelineEventDTO> buildFullTimelineInMemory(UUID tarantulaId) {
        List<TimelineEventDTO> events = new ArrayList<>();

        feedingLogRepository.findByTarantulaIdOrderByFedAtDesc(tarantulaId).forEach(f -> {
            String title = Boolean.FALSE.equals(f.getAccepted()) ? "feeding_rejected" : "feeding";
            String summary = buildFeedingSummary(f.getQuantity(), f.getPreyType(), f.getPreySize(), f.getNotes());
            events.add(new TimelineEventDTO(f.getId(), "feeding", f.getFedAt(), title, summary));
        });

        moltLogRepository.findByTarantulaIdOrderByMoltedAtDesc(tarantulaId).forEach(m -> {
            String summary = buildMoltSummary(m.getPreSizeCm(), m.getPostSizeCm(), m.getNotes());
            TimelineEventDTO ev = new TimelineEventDTO(m.getId(), "molt", m.getMoltedAt(), "molt", summary);
            ev.setSuccessful(m.getSuccessful());
            ev.setComplicationType(m.getComplicationType());
            ev.setDurationMinutes(m.getDurationMinutes());
            events.add(ev);
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

        List<TimelineEventDTO> events = buildFullTimelineInMemory(t.getId());
        if (owner) {
            return events;
        }
        return events.size() > 20 ? events.subList(0, 20) : events;
    }

    @Transactional(readOnly = true)
    public PagedListResponse<TimelineEventDTO> getPublicTimelinePaged(String shortId, int page, int pageSize) {
        Tarantula t = tarantulaRepository.findByShortId(shortId)
                .orElseThrow(() -> new NotFoundException("Perfil no encontrado"));
        boolean owner = isQrProfileOwner(t);
        if (!Boolean.TRUE.equals(t.getIsPublic()) && !owner) {
            throw new NotFoundException("Este perfil no es público");
        }
        Long cap = owner ? null : 20L;
        return sliceTimelineFromDb(t.getId(), page, pageSize, cap);
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
        userRepository.findById(t.getUserId())
                .map(User::getPublicHandle)
                .filter(h -> h != null && !h.isBlank())
                .ifPresent(dto::setKeeperHandle);
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

        Optional<BehaviorLog> pubLastBeh = behaviorLogRepository.findFirstByTarantulaIdOrderByLoggedAtDesc(t.getId());
        Optional<FeedingLog> pubLastFed = feedingLogRepository.findFirstByTarantulaIdOrderByFedAtDesc(t.getId());
        dto.setStatus(computeStatus(
                t,
                pubLastFed.map(FeedingLog::getFedAt).orElse(null),
                pubLastBeh.map(b -> new BehaviorSnap(b.getLoggedAt(), b.getMood())).orElse(null)
        ));
        dto.setSpoodCount(tarantulaSpoodRepository.countByTarantulaId(t.getId()));
        dto.setSpoodedByViewer(securityHelper.tryGetCurrentUserId()
                .map(viewerId -> tarantulaSpoodRepository.existsByTarantulaIdAndUserId(t.getId(), viewerId))
                .orElse(false));
        pubLastFed.ifPresent(f -> dto.setLastFedAt(f.getFedAt()));
        moltLogRepository.findFirstByTarantulaIdOrderByMoltedAtDesc(t.getId())
                .ifPresent(m -> dto.setLastMoltAt(m.getMoltedAt()));

        return dto;
    }

    @Transactional(readOnly = true)
    public List<PhotoResponse> getPublicPhotos(String shortId) {
        Tarantula t = tarantulaRepository.findByShortId(shortId)
                .orElseThrow(() -> new NotFoundException("Perfil no encontrado"));
        boolean owner = isQrProfileOwner(t);
        if (!Boolean.TRUE.equals(t.getIsPublic()) && !owner) {
            throw new NotFoundException("Este perfil no es público");
        }
        List<Photo> photos = photoRepository.findByTarantulaIdOrderByCreatedAtDesc(t.getId());
        return enrichPublicPhotoResponses(photos);
    }

    @Transactional(readOnly = true)
    public PagedListResponse<PhotoResponse> getPublicPhotosPaged(String shortId, int page, int pageSize) {
        Tarantula t = tarantulaRepository.findByShortId(shortId)
                .orElseThrow(() -> new NotFoundException("Perfil no encontrado"));
        boolean owner = isQrProfileOwner(t);
        if (!Boolean.TRUE.equals(t.getIsPublic()) && !owner) {
            throw new NotFoundException("Este perfil no es público");
        }
        int p = Math.max(0, page);
        int sz = Math.min(60, Math.max(1, pageSize));
        Page<Photo> pg = photoRepository.findByTarantulaIdOrderByCreatedAtDesc(t.getId(), PageRequest.of(p, sz));
        List<PhotoResponse> content = enrichPublicPhotoResponses(pg.getContent());
        return new PagedListResponse<>(content, pg.getTotalElements(), p, sz, pg.hasNext());
    }

    private List<PhotoResponse> enrichPublicPhotoResponses(List<Photo> photos) {
        if (photos == null || photos.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = photos.stream().map(Photo::getId).toList();
        Map<UUID, Long> counts = new HashMap<>();
        for (Object[] row : photoSpoodRepository.countGroupedByPhotoIds(ids)) {
            if (row.length < 2) continue;
            UUID pid = toUuid(row[0]);
            if (pid == null) continue;
            long c = row[1] instanceof Number n ? n.longValue() : 0L;
            counts.put(pid, c);
        }
        Optional<UUID> viewerId = securityHelper.tryGetCurrentUserId();
        Set<UUID> spoodedIds = viewerId
                .map(uid -> photoSpoodRepository.findPhotoIdsSpoodedByUser(ids, uid))
                .orElse(Collections.emptySet());
        return photos.stream().map(photo -> {
            PhotoResponse response = PhotoResponse.from(photo);
            response.setSpoodCount(counts.getOrDefault(photo.getId(), 0L));
            response.setSpoodedByViewer(viewerId.isPresent() && spoodedIds.contains(photo.getId()));
            return response;
        }).collect(Collectors.toList());
    }

    private TimelineEventDTO timelineDtoFromJdbcRow(Map<String, Object> row) {
        String type = strCi(row, "ev_type");
        UUID id = toUuid(strCi(row, "ev_id"));
        Instant at = toInstant(getCi(row, "ev_at"));
        if (type == null || id == null || at == null) {
            return null;
        }
        return switch (type) {
            case "feeding" -> {
                Boolean accepted = boolObj(getCi(row, "feed_accepted"));
                String title = Boolean.FALSE.equals(accepted) ? "feeding_rejected" : "feeding";
                Integer qty = intObj(getCi(row, "feed_qty"));
                String preyType = strCi(row, "feed_prey_type");
                String preySize = strCi(row, "feed_prey_size");
                String notes = strCi(row, "feed_notes");
                String summary = buildFeedingSummary(qty, preyType, preySize, notes);
                yield new TimelineEventDTO(id, "feeding", at, title, summary);
            }
            case "molt" -> {
                BigDecimal pre = decimalObj(getCi(row, "molt_pre"));
                BigDecimal post = decimalObj(getCi(row, "molt_post"));
                String notes = strCi(row, "molt_notes");
                String summary = buildMoltSummary(pre, post, notes);
                TimelineEventDTO ev = new TimelineEventDTO(id, "molt", at, "molt", summary);
                ev.setSuccessful(boolObj(getCi(row, "molt_successful")));
                ev.setComplicationType(strCi(row, "molt_comp"));
                ev.setDurationMinutes(intObj(getCi(row, "molt_dur")));
                yield ev;
            }
            case "behavior" -> new TimelineEventDTO(id, "behavior", at, strCi(row, "beh_mood"), strCi(row, "beh_notes"));
            default -> null;
        };
    }

    private static Object getCi(Map<String, Object> row, String key) {
        if (row.containsKey(key)) {
            return row.get(key);
        }
        for (Map.Entry<String, Object> e : row.entrySet()) {
            if (e.getKey() != null && e.getKey().equalsIgnoreCase(key)) {
                return e.getValue();
            }
        }
        return null;
    }

    private static String strCi(Map<String, Object> row, String key) {
        Object v = getCi(row, key);
        return v == null ? null : v.toString().trim();
    }

    private static Boolean boolObj(Object o) {
        if (o == null) return null;
        if (o instanceof Boolean b) return b;
        if (o instanceof Number n) return n.intValue() != 0;
        return null;
    }

    private static Integer intObj(Object o) {
        if (o == null) return null;
        if (o instanceof Integer i) return i;
        if (o instanceof Number n) return n.intValue();
        return null;
    }

    private static BigDecimal decimalObj(Object o) {
        if (o == null) return null;
        if (o instanceof BigDecimal d) return d;
        if (o instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return null;
    }

    public SpoodToggleResponse togglePublicTarantulaSpood(String shortId, UUID userId) {
        Tarantula t = tarantulaRepository.findByShortId(shortId)
                .orElseThrow(() -> new NotFoundException("Perfil no encontrado"));
        if (!Boolean.TRUE.equals(t.getIsPublic())) {
            throw new NotFoundException("Este perfil no es público");
        }
        if (t.getUserId().equals(userId)) {
            throw new AccessDeniedException("No puedes dar spood a tu propia tarántula");
        }
        boolean hasSpood = tarantulaSpoodRepository.existsByTarantulaIdAndUserId(t.getId(), userId);
        if (hasSpood) {
            tarantulaSpoodRepository.deleteByTarantulaIdAndUserId(t.getId(), userId);
            return new SpoodToggleResponse(
                    tarantulaSpoodRepository.countByTarantulaId(t.getId()),
                    false
            );
        }
        TarantulaSpood spood = new TarantulaSpood();
        spood.setTarantulaId(t.getId());
        spood.setUserId(userId);
        tarantulaSpoodRepository.save(spood);
        return new SpoodToggleResponse(
                tarantulaSpoodRepository.countByTarantulaId(t.getId()),
                true
        );
    }

    public SpoodToggleResponse togglePublicPhotoSpood(String shortId, UUID photoId, UUID userId) {
        Tarantula t = tarantulaRepository.findByShortId(shortId)
                .orElseThrow(() -> new NotFoundException("Perfil no encontrado"));
        if (!Boolean.TRUE.equals(t.getIsPublic())) {
            throw new NotFoundException("Este perfil no es público");
        }
        if (t.getUserId().equals(userId)) {
            throw new AccessDeniedException("No puedes dar spood a tus propias fotos");
        }
        Photo photo = photoRepository.findByIdAndTarantulaId(photoId, t.getId())
                .orElseThrow(() -> new NotFoundException("Foto no encontrada"));
        boolean hasSpood = photoSpoodRepository.existsByPhotoIdAndUserId(photo.getId(), userId);
        if (hasSpood) {
            photoSpoodRepository.deleteByPhotoIdAndUserId(photo.getId(), userId);
            return new SpoodToggleResponse(
                    photoSpoodRepository.countByPhotoId(photo.getId()),
                    false
            );
        }
        PhotoSpood spood = new PhotoSpood();
        spood.setPhotoId(photo.getId());
        spood.setUserId(userId);
        photoSpoodRepository.save(spood);
        return new SpoodToggleResponse(
                photoSpoodRepository.countByPhotoId(photo.getId()),
                true
        );
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

        Optional<BehaviorLog> lastBehavior =
                behaviorLogRepository.findFirstByTarantulaIdOrderByLoggedAtDesc(t.getId());
        Optional<FeedingLog> lastFeeding =
                feedingLogRepository.findFirstByTarantulaIdOrderByFedAtDesc(t.getId());
        r.setStatus(computeStatus(
                t,
                lastFeeding.map(FeedingLog::getFedAt).orElse(null),
                lastBehavior.map(b -> new BehaviorSnap(b.getLoggedAt(), b.getMood())).orElse(null)
        ));

        lastFeeding.ifPresent(f -> r.setLastFedAt(f.getFedAt()));
        moltLogRepository.findFirstByTarantulaIdOrderByMoltedAtDesc(t.getId())
                .ifPresent(m -> r.setLastMoltAt(m.getMoltedAt()));

        r.setLocked(lockedIds != null && lockedIds.contains(t.getId()));
        r.setSpoodCount(tarantulaSpoodRepository.countByTarantulaId(t.getId()));

        return r;
    }

    private TarantulaResponse toResponseWithListAggregates(Tarantula t, Set<UUID> lockedIds, ListAgg agg) {
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

        UUID id = t.getId();
        Instant lastFedAt = agg.lastFedAt.get(id);
        BehaviorSnap lastBeh = agg.lastBehavior.get(id);
        r.setStatus(computeStatus(t, lastFedAt, lastBeh));
        r.setLastFedAt(lastFedAt);
        r.setLastMoltAt(agg.lastMoltAt.get(id));

        r.setLocked(lockedIds != null && lockedIds.contains(id));
        r.setSpoodCount(agg.spoodCount.getOrDefault(id, 0L));

        return r;
    }

    private ListAgg loadListAggregates(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return ListAgg.empty();
        }
        Map<UUID, Instant> lastFed = new HashMap<>();
        for (Object[] row : feedingLogRepository.findLatestFeedingRowsByTarantulaIds(ids)) {
            if (row.length < 2) continue;
            UUID tid = toUuid(row[0]);
            if (tid == null) continue;
            lastFed.put(tid, toInstant(row[1]));
        }
        Map<UUID, Instant> lastMolt = new HashMap<>();
        for (Object[] row : moltLogRepository.findLatestMoltRowsByTarantulaIds(ids)) {
            if (row.length < 2) continue;
            UUID tid = toUuid(row[0]);
            if (tid == null) continue;
            lastMolt.put(tid, toInstant(row[1]));
        }
        Map<UUID, BehaviorSnap> lastBeh = new HashMap<>();
        for (Object[] row : behaviorLogRepository.findLatestBehaviorRowsByTarantulaIds(ids)) {
            if (row.length < 2) continue;
            UUID tid = toUuid(row[0]);
            if (tid == null) continue;
            Instant loggedAt = toInstant(row[1]);
            String mood = row.length > 2 && row[2] != null ? row[2].toString() : null;
            lastBeh.put(tid, new BehaviorSnap(loggedAt, mood));
        }
        Map<UUID, Long> spood = new HashMap<>();
        for (Object[] row : tarantulaSpoodRepository.countGroupedByTarantulaIds(ids)) {
            if (row.length < 2) continue;
            UUID tid = toUuid(row[0]);
            if (tid == null) continue;
            long c = row[1] instanceof Number n ? n.longValue() : 0L;
            spood.put(tid, c);
        }
        return new ListAgg(lastFed, lastMolt, lastBeh, spood);
    }

    private static UUID toUuid(Object cell) {
        if (cell instanceof UUID u) {
            return u;
        }
        if (cell != null) {
            try {
                return UUID.fromString(cell.toString());
            } catch (IllegalArgumentException ignored) {
                return null;
            }
        }
        return null;
    }

    private static Instant toInstant(Object cell) {
        if (cell == null) {
            return null;
        }
        if (cell instanceof Instant i) {
            return i;
        }
        if (cell instanceof java.sql.Timestamp ts) {
            return ts.toInstant();
        }
        if (cell instanceof java.util.Date d) {
            return d.toInstant();
        }
        return null;
    }

    private record BehaviorSnap(Instant loggedAt, String mood) {
    }

    private static final class ListAgg {
        private final Map<UUID, Instant> lastFedAt;
        private final Map<UUID, Instant> lastMoltAt;
        private final Map<UUID, BehaviorSnap> lastBehavior;
        private final Map<UUID, Long> spoodCount;

        private ListAgg(Map<UUID, Instant> lastFedAt,
                        Map<UUID, Instant> lastMoltAt,
                        Map<UUID, BehaviorSnap> lastBehavior,
                        Map<UUID, Long> spoodCount) {
            this.lastFedAt = lastFedAt;
            this.lastMoltAt = lastMoltAt;
            this.lastBehavior = lastBehavior;
            this.spoodCount = spoodCount;
        }

        private static ListAgg empty() {
            return new ListAgg(Map.of(), Map.of(), Map.of(), Map.of());
        }
    }

    private String computeStatus(Tarantula t, Instant lastFedAt, BehaviorSnap lastBehavior) {
        if (t.getDeceasedAt() != null) {
            return "deceased";
        }
        Instant now = Instant.now();
        if (lastBehavior != null
                && lastBehavior.loggedAt() != null
                && "pre_molt".equals(lastBehavior.mood())
                && lastBehavior.loggedAt().isAfter(now.minus(30, ChronoUnit.DAYS))) {
            return "pre_molt";
        }
        if (lastFedAt == null || lastFedAt.isBefore(now.minus(14, ChronoUnit.DAYS))) {
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
