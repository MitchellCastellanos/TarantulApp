package com.tarantulapp.service;

import com.tarantulapp.dto.PassportClaimRequest;
import com.tarantulapp.dto.PassportClaimResponse;
import com.tarantulapp.dto.PublicProfileDTO;
import com.tarantulapp.entity.Passport;
import com.tarantulapp.entity.ProDayGrant;
import com.tarantulapp.entity.ProDayGrantSource;
import com.tarantulapp.entity.Species;
import com.tarantulapp.entity.Tarantula;
import com.tarantulapp.entity.User;
import com.tarantulapp.repository.PassportClaimEventRepository;
import com.tarantulapp.repository.PassportRepository;
import com.tarantulapp.repository.ReminderRepository;
import com.tarantulapp.repository.SpeciesRepository;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PassportServiceTest {

    @Mock
    private PassportRepository passportRepository;
    @Mock
    private SpeciesRepository speciesRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ShortIdService shortIdService;
    @Mock
    private TarantulaRepository tarantulaRepository;
    @Mock
    private PlanAccessService planAccessService;
    @Mock
    private ProDayGrantService proDayGrantService;
    @Mock
    private ReminderRepository reminderRepository;
    @Mock
    private PassportClaimEventRepository passportClaimEventRepository;

    private PassportService service;

    @BeforeEach
    void setUp() {
        service = new PassportService(
                passportRepository,
                speciesRepository,
                userRepository,
                shortIdService,
                tarantulaRepository,
                planAccessService,
                proDayGrantService,
                reminderRepository,
                passportClaimEventRepository
        );
        ReflectionTestUtils.setField(service, "publicBaseUrl", "https://tarantulapp.com");
    }

    @Test
    void buildUnclaimedPublicProfileReturnsPassportMode() {
        UUID creatorId = UUID.randomUUID();
        Species species = new Species();
        species.setId(42);
        species.setScientificName("Caribena versicolor");
        species.setCommonName("Antilles pink toe");
        species.setHabitatType("arboreal");

        Passport passport = new Passport();
        passport.setShortId("abc12345");
        passport.setSpecies(species);
        passport.setStage("sling");
        passport.setSex("unsexed");
        passport.setLabelNotes("Batch Spring 2026");
        passport.setProGiftDays(30);
        passport.setOriginUserId(creatorId);

        User creator = new User();
        creator.setDisplayName("Monarch Reptiles");
        creator.setPublicHandle("monarch");

        when(userRepository.findById(creatorId)).thenReturn(Optional.of(creator));

        PublicProfileDTO dto = service.buildUnclaimedPublicProfile(passport);

        assertEquals(PublicProfileDTO.PageMode.PASSPORT, dto.getPageMode());
        assertEquals("abc12345", dto.getShortId());
        assertEquals(Integer.valueOf(42), dto.getSpeciesId());
        assertEquals("Caribena versicolor", dto.getScientificName());
        assertEquals("sling", dto.getStage());
        assertEquals("Batch Spring 2026", dto.getLabelNotes());
        assertEquals(Integer.valueOf(30), dto.getProGiftDays());
        assertEquals("Monarch Reptiles", dto.getCreatorDisplayName());
        assertEquals("monarch", dto.getCreatorHandle());
        assertNull(dto.getTarantulaId());
    }

    @Test
    void createUnclaimedPassportPersistsWithGeneratedShortId() {
        Species species = new Species();
        species.setId(7);
        when(speciesRepository.findById(7)).thenReturn(Optional.of(species));
        when(shortIdService.generateUniqueShortId()).thenReturn("deadbeef");
        when(passportRepository.save(any(Passport.class))).thenAnswer(inv -> {
            Passport p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        var req = new com.tarantulapp.dto.AdminCreatePassportRequest();
        req.setSpeciesId(7);
        req.setStage("juvenile");
        req.setProGiftDays(30);

        var response = service.createUnclaimedPassport(req);

        assertEquals("deadbeef", response.getShortId());
        assertEquals("https://tarantulapp.com/t/deadbeef", response.getPublicUrl());
        verify(passportRepository).save(any(Passport.class));
    }

    @Test
    void claimPassportCreatesTarantulaAndGrantsPro() {
        UUID userId = UUID.randomUUID();
        UUID passportId = UUID.randomUUID();
        Species species = new Species();
        species.setCommonName("Pink toe");

        Passport passport = new Passport();
        passport.setId(passportId);
        passport.setShortId("claimme1");
        passport.setSpecies(species);
        passport.setStage("sling");
        passport.setProGiftDays(30);

        User user = new User();
        user.setId(userId);
        user.setDefaultTarantulaPublic(true);

        ProDayGrant grant = new ProDayGrant();
        grant.setId(UUID.randomUUID());

        when(passportRepository.findByShortId("claimme1")).thenReturn(Optional.of(passport));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(planAccessService.hasProFeatures(user)).thenReturn(false);
        when(tarantulaRepository.countByUserId(userId)).thenReturn(0L);
        when(tarantulaRepository.save(any(Tarantula.class))).thenAnswer(inv -> {
            Tarantula t = inv.getArgument(0);
            t.setId(UUID.randomUUID());
            return t;
        });
        when(proDayGrantService.recordGrant(eq(user), eq(30), eq(ProDayGrantSource.PASSPORT_CLAIM), eq(null), eq(null)))
                .thenReturn(grant);

        PassportClaimRequest req = new PassportClaimRequest();
        req.setName("Rosie");
        req.setSetupFeedingReminder(true);

        PassportClaimResponse response = service.claimPassport("claimme1", req, userId);

        assertEquals("Rosie", response.getName());
        assertEquals("claimme1", response.getShortId());
        assertEquals(30, response.getProGiftDays());
        assertTrue(response.isFeedingReminderCreated());
        verify(passportRepository).save(any(Passport.class));
        verify(reminderRepository).save(any());
        verify(passportClaimEventRepository).save(any());
    }
}
