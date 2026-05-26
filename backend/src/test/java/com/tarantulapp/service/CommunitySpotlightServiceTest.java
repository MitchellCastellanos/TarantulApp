package com.tarantulapp.service;

import com.tarantulapp.entity.Photo;
import com.tarantulapp.entity.Species;
import com.tarantulapp.entity.Tarantula;
import com.tarantulapp.entity.User;
import com.tarantulapp.repository.PhotoRepository;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.repository.TarantulaSpoodRepository;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.util.SecurityHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommunitySpotlightServiceTest {

    @Mock
    private TarantulaRepository tarantulaRepository;
    @Mock
    private PhotoRepository photoRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private TarantulaSpoodRepository tarantulaSpoodRepository;
    @Mock
    private SecurityHelper securityHelper;

    private CommunitySpotlightService service;

    @BeforeEach
    void setUp() {
        service = new CommunitySpotlightService(
                tarantulaRepository,
                photoRepository,
                userRepository,
                tarantulaSpoodRepository,
                securityHelper);
    }

    @Test
    void spotlightReturnsPublicSpidersWithProfilePhoto() {
        UUID userId = UUID.randomUUID();
        Tarantula t = new Tarantula();
        t.setId(UUID.randomUUID());
        t.setUserId(userId);
        t.setName("Rosie");
        t.setShortId("abc123");
        t.setProfilePhoto("gallery/rosie.jpg");
        t.setIsPublic(true);

        Species sp = new Species();
        sp.setScientificName("Grammostola rosea");
        t.setSpecies(sp);

        User keeper = new User();
        keeper.setId(userId);
        keeper.setPublicHandle("mitch");
        keeper.setDisplayName("Mitch");

        when(tarantulaRepository.findCommunitySpotlightCandidateIds(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(t.getId())));
        when(tarantulaRepository.findByIdInWithSpecies(any())).thenReturn(List.of(t));
        when(photoRepository.findByTarantulaIdInOrderByCreatedAtDesc(any())).thenReturn(List.of());
        when(tarantulaSpoodRepository.countGroupedByTarantulaIds(any())).thenReturn(List.of());
        when(securityHelper.tryGetCurrentUserId()).thenReturn(Optional.empty());
        when(userRepository.findAllById(eq(List.of(userId)))).thenReturn(List.of(keeper));

        Map<String, Object> out = service.spotlight(12);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) out.get("items");

        assertEquals(1, items.size());
        assertEquals("Rosie", items.get(0).get("name"));
        assertEquals("gallery/rosie.jpg", items.get(0).get("photoUrl"));
        assertEquals("mitch", items.get(0).get("keeperHandle"));
        assertEquals(0L, items.get(0).get("spoodCount"));
    }

    @Test
    void spotlightFallsBackToGalleryPhoto() {
        UUID tarantulaId = UUID.randomUUID();
        Tarantula t = new Tarantula();
        t.setId(tarantulaId);
        t.setUserId(UUID.randomUUID());
        t.setName("No profile");
        t.setShortId("xyz99");
        t.setProfilePhoto("");
        t.setIsPublic(true);

        Photo p = new Photo();
        p.setTarantulaId(tarantulaId);
        p.setFilePath("gallery/first.jpg");

        when(tarantulaRepository.findCommunitySpotlightCandidateIds(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(t.getId())));
        when(tarantulaRepository.findByIdInWithSpecies(any())).thenReturn(List.of(t));
        when(photoRepository.findByTarantulaIdInOrderByCreatedAtDesc(any()))
                .thenReturn(List.of(p));
        when(tarantulaSpoodRepository.countGroupedByTarantulaIds(any())).thenReturn(List.of());
        when(securityHelper.tryGetCurrentUserId()).thenReturn(Optional.empty());
        when(userRepository.findAllById(any())).thenReturn(List.of());

        Map<String, Object> out = service.spotlight(5);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) out.get("items");

        assertEquals(1, items.size());
        assertEquals("gallery/first.jpg", items.get(0).get("photoUrl"));
    }

    @Test
    void spotlightEmptyWhenNoCandidates() {
        when(tarantulaRepository.findCommunitySpotlightCandidateIds(any(Pageable.class)))
                .thenReturn(Page.empty());

        Map<String, Object> out = service.spotlight(12);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) out.get("items");
        assertTrue(items.isEmpty());
    }
}
