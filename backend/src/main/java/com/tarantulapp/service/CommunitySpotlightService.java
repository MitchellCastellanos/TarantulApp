package com.tarantulapp.service;

import com.tarantulapp.entity.Photo;
import com.tarantulapp.entity.Tarantula;
import com.tarantulapp.entity.User;
import com.tarantulapp.repository.PhotoRepository;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.repository.TarantulaSpoodRepository;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class CommunitySpotlightService {

    private final TarantulaRepository tarantulaRepository;
    private final PhotoRepository photoRepository;
    private final UserRepository userRepository;
    private final TarantulaSpoodRepository tarantulaSpoodRepository;
    private final SecurityHelper securityHelper;

    public CommunitySpotlightService(TarantulaRepository tarantulaRepository,
                                     PhotoRepository photoRepository,
                                     UserRepository userRepository,
                                     TarantulaSpoodRepository tarantulaSpoodRepository,
                                     SecurityHelper securityHelper) {
        this.tarantulaRepository = tarantulaRepository;
        this.photoRepository = photoRepository;
        this.userRepository = userRepository;
        this.tarantulaSpoodRepository = tarantulaSpoodRepository;
        this.securityHelper = securityHelper;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> spotlight(int limit) {
        int lim = Math.min(24, Math.max(1, limit));
        List<UUID> ids = tarantulaRepository
                .findCommunitySpotlightCandidateIds(PageRequest.of(0, lim))
                .getContent();
        if (ids.isEmpty()) {
            Map<String, Object> empty = new LinkedHashMap<>();
            empty.put("items", List.of());
            return empty;
        }
        Map<UUID, Tarantula> byId = tarantulaRepository.findByIdInWithSpecies(ids).stream()
                .collect(Collectors.toMap(Tarantula::getId, Function.identity()));
        List<Tarantula> rows = ids.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .toList();
        if (rows.isEmpty()) {
            Map<String, Object> empty = new LinkedHashMap<>();
            empty.put("items", List.of());
            return empty;
        }

        List<UUID> tarantulaIds = rows.stream().map(Tarantula::getId).toList();
        Map<UUID, String> galleryFirstByTarantula = firstGalleryPhotoByTarantula(tarantulaIds);
        Map<UUID, Long> spoodCounts = spoodCountByTarantula(tarantulaIds);

        Optional<UUID> viewerId = securityHelper.tryGetCurrentUserId();
        Set<UUID> spoodedByViewer = viewerId
                .map(uid -> tarantulaSpoodRepository.findTarantulaIdsSpoodedByUser(tarantulaIds, uid))
                .orElse(Set.of());

        List<UUID> userIds = rows.stream().map(Tarantula::getUserId).distinct().toList();
        Map<UUID, User> usersById = new HashMap<>();
        userRepository.findAllById(userIds).forEach(u -> usersById.put(u.getId(), u));

        List<Map<String, Object>> items = new ArrayList<>();
        for (Tarantula t : rows) {
            String photoUrl = resolvePhotoUrl(t, galleryFirstByTarantula);
            if (photoUrl == null || photoUrl.isBlank()) {
                continue;
            }
            User keeper = usersById.get(t.getUserId());
            boolean viewerIsOwner = viewerId.map(v -> v.equals(t.getUserId())).orElse(false);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("tarantulaId", t.getId());
            row.put("shortId", t.getShortId() == null ? "" : t.getShortId());
            row.put("name", t.getName());
            row.put("photoUrl", photoUrl);
            row.put("speciesName", t.getSpecies() == null || t.getSpecies().getScientificName() == null
                    ? "" : t.getSpecies().getScientificName());
            row.put("stage", t.getStage() == null ? "" : t.getStage());
            row.put("keeperUserId", t.getUserId());
            row.put("spoodCount", spoodCounts.getOrDefault(t.getId(), 0L));
            row.put("spoodedByViewer", spoodedByViewer.contains(t.getId()));
            row.put("viewerIsOwner", viewerIsOwner);
            if (keeper != null) {
                row.put("keeperHandle", keeper.getPublicHandle() == null ? "" : keeper.getPublicHandle());
                row.put("keeperDisplayName", keeper.getDisplayName() == null || keeper.getDisplayName().isBlank()
                        ? keeper.getEmail() : keeper.getDisplayName());
            } else {
                row.put("keeperHandle", "");
                row.put("keeperDisplayName", "");
            }
            items.add(row);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("items", items);
        return out;
    }

    private Map<UUID, Long> spoodCountByTarantula(List<UUID> tarantulaIds) {
        Map<UUID, Long> out = new HashMap<>();
        if (tarantulaIds.isEmpty()) {
            return out;
        }
        for (Object[] row : tarantulaSpoodRepository.countGroupedByTarantulaIds(tarantulaIds)) {
            out.put((UUID) row[0], (Long) row[1]);
        }
        return out;
    }

    private Map<UUID, String> firstGalleryPhotoByTarantula(List<UUID> tarantulaIds) {
        Map<UUID, String> out = new HashMap<>();
        if (tarantulaIds.isEmpty()) {
            return out;
        }
        for (Photo p : photoRepository.findByTarantulaIdInOrderByCreatedAtDesc(tarantulaIds)) {
            out.putIfAbsent(p.getTarantulaId(), p.getFilePath());
        }
        return out;
    }

    private static String resolvePhotoUrl(Tarantula t, Map<UUID, String> galleryFirstByTarantula) {
        if (t.getProfilePhoto() != null && !t.getProfilePhoto().isBlank()) {
            return t.getProfilePhoto();
        }
        return galleryFirstByTarantula.getOrDefault(t.getId(), "");
    }
}
