package com.tarantulapp.service;

import com.tarantulapp.dto.PassportClaimRequest;
import com.tarantulapp.dto.PassportClaimResponse;
import com.tarantulapp.dto.PublicProfileDTO;
import com.tarantulapp.entity.Passport;
import com.tarantulapp.entity.PassportClaimStatus;
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
import static org.junit.jupiter.api.Assertions.assertThrows;
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
    @Mock
    private VerifiedOriginService verifiedOriginService;
    @Mock
    private UserCapabilitiesService userCapabilitiesService;
    @Mock
    private com.tarantulapp.util.SecurityHelper securityHelper;

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
                passportClaimEventRepository,
                verifiedOriginService,
                userCapabilitiesService,
                securityHelper
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

        when(passportRepository.findByShortIdForUpdate("claimme1")).thenReturn(Optional.of(passport));
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

    @Test
    void claimPassportGrantsSevenDaysForSubsequentClaim() {
        UUID userId = UUID.randomUUID();
        Species species = new Species();
        species.setCommonName("Pink toe");

        Passport passport = new Passport();
        passport.setId(UUID.randomUUID());
        passport.setShortId("claimme2");
        passport.setSpecies(species);
        passport.setStage("sling");

        User user = new User();
        user.setId(userId);

        ProDayGrant grant = new ProDayGrant();
        grant.setId(UUID.randomUUID());

        when(passportRepository.findByShortIdForUpdate("claimme2")).thenReturn(Optional.of(passport));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(planAccessService.hasProFeatures(user)).thenReturn(false);
        when(tarantulaRepository.countByUserId(userId)).thenReturn(3L);
        when(tarantulaRepository.save(any(Tarantula.class))).thenAnswer(inv -> {
            Tarantula t = inv.getArgument(0);
            t.setId(UUID.randomUUID());
            return t;
        });
        // The keeper already claimed before, so this specimen pays out the reduced reward.
        when(proDayGrantService.hasGrantOfSource(userId, ProDayGrantSource.PASSPORT_CLAIM)).thenReturn(true);
        when(proDayGrantService.recordGrant(eq(user), eq(7), eq(ProDayGrantSource.PASSPORT_CLAIM), eq(null), eq(null)))
                .thenReturn(grant);

        PassportClaimRequest req = new PassportClaimRequest();
        req.setName("Webster");
        req.setSetupFeedingReminder(false);

        PassportClaimResponse response = service.claimPassport("claimme2", req, userId);

        assertEquals(7, response.getProGiftDays());
        verify(proDayGrantService).recordGrant(eq(user), eq(7), eq(ProDayGrantSource.PASSPORT_CLAIM), eq(null), eq(null));
    }

    @Test
    void claimPassportDoesNotRegrantWhenAlreadyPaidOut() {
        UUID userId = UUID.randomUUID();
        Species species = new Species();
        species.setCommonName("Pink toe");

        Passport passport = new Passport();
        passport.setId(UUID.randomUUID());
        passport.setShortId("claimme3");
        passport.setSpecies(species);
        passport.setStage("sling");
        // Anti-abuse: this passport has already rewarded Pro days once.
        passport.setProGrantedAt(java.time.Instant.now());

        User user = new User();
        user.setId(userId);

        when(passportRepository.findByShortIdForUpdate("claimme3")).thenReturn(Optional.of(passport));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(planAccessService.hasProFeatures(user)).thenReturn(false);
        when(tarantulaRepository.countByUserId(userId)).thenReturn(0L);
        when(tarantulaRepository.save(any(Tarantula.class))).thenAnswer(inv -> {
            Tarantula t = inv.getArgument(0);
            t.setId(UUID.randomUUID());
            return t;
        });

        PassportClaimRequest req = new PassportClaimRequest();
        req.setName("Ghost");
        req.setSetupFeedingReminder(false);

        PassportClaimResponse response = service.claimPassport("claimme3", req, userId);

        assertEquals(0, response.getProGiftDays());
        assertNull(response.getProGrantId());
        verify(proDayGrantService, org.mockito.Mockito.never())
                .recordGrant(any(), org.mockito.ArgumentMatchers.anyInt(), any(), any(), any());
    }

    @Test
    void claimOnShelfPassportRequiresMatchingCode() {
        UUID userId = UUID.randomUUID();
        Passport passport = new Passport();
        passport.setId(UUID.randomUUID());
        passport.setShortId("shelf001");
        passport.setClaimStatus(PassportClaimStatus.ON_SHELF);
        passport.setClaimCode("AB12CD");

        when(passportRepository.findByShortIdForUpdate("shelf001")).thenReturn(Optional.of(passport));

        PassportClaimRequest wrongCode = new PassportClaimRequest();
        wrongCode.setClaimCode("XXXXXX");
        var ex = assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.claimPassport("shelf001", wrongCode, userId));
        assertEquals("CLAIM_CODE_INVALID", ex.getReason());

        PassportClaimRequest noCode = new PassportClaimRequest();
        var exMissing = assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.claimPassport("shelf001", noCode, userId));
        assertEquals("CLAIM_CODE_INVALID", exMissing.getReason());
    }

    @Test
    void claimOnShelfPassportAcceptsNormalizedCode() {
        UUID userId = UUID.randomUUID();
        Species species = new Species();
        species.setCommonName("Pink toe");

        Passport passport = new Passport();
        passport.setId(UUID.randomUUID());
        passport.setShortId("shelf002");
        passport.setSpecies(species);
        passport.setClaimStatus(PassportClaimStatus.ON_SHELF);
        passport.setClaimCode("AB12CD");

        User user = new User();
        user.setId(userId);

        ProDayGrant grant = new ProDayGrant();
        grant.setId(UUID.randomUUID());

        when(passportRepository.findByShortIdForUpdate("shelf002")).thenReturn(Optional.of(passport));
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
        req.setClaimCode("ab-12 cd");
        req.setSetupFeedingReminder(false);

        PassportClaimResponse response = service.claimPassport("shelf002", req, userId);
        assertEquals("shelf002", response.getShortId());
        assertEquals(PassportClaimStatus.CLAIMED, passport.getClaimStatus());
    }

    @Test
    void claimVoidPassportIsGone() {
        UUID userId = UUID.randomUUID();
        Passport passport = new Passport();
        passport.setId(UUID.randomUUID());
        passport.setShortId("void0001");
        passport.setClaimStatus(PassportClaimStatus.VOID);

        when(passportRepository.findByShortIdForUpdate("void0001")).thenReturn(Optional.of(passport));

        var ex = assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.claimPassport("void0001", new PassportClaimRequest(), userId));
        assertEquals("PASSPORT_VOID", ex.getReason());
    }

    @Test
    void issuerCannotClaimOwnLabel() {
        UUID issuerId = UUID.randomUUID();
        Passport passport = new Passport();
        passport.setId(UUID.randomUUID());
        passport.setShortId("self0001");
        passport.setCreatedByUserId(issuerId);
        passport.setClaimStatus(PassportClaimStatus.CLAIMABLE);

        when(passportRepository.findByShortIdForUpdate("self0001")).thenReturn(Optional.of(passport));

        var ex = assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.claimPassport("self0001", new PassportClaimRequest(), issuerId));
        assertEquals("PASSPORT_SELF_CLAIM", ex.getReason());
    }

    @Test
    void issuerReleaseMakesLabelClaimable() {
        UUID issuerId = UUID.randomUUID();
        UUID passportId = UUID.randomUUID();
        Passport passport = new Passport();
        passport.setId(passportId);
        passport.setShortId("shelf003");
        passport.setCreatedByUserId(issuerId);
        passport.setClaimStatus(PassportClaimStatus.ON_SHELF);
        passport.setClaimCode("AB12CD");

        when(passportRepository.findById(passportId)).thenReturn(Optional.of(passport));
        when(passportRepository.save(any(Passport.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = service.issuerRelease(passportId, issuerId);

        assertEquals("CLAIMABLE", response.getClaimStatus());
        assertTrue(passport.getClaimReleasedAt() != null);
    }
}
