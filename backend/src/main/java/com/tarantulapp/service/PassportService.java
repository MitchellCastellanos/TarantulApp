package com.tarantulapp.service;

import com.tarantulapp.dto.AdminCreatePassportRequest;
import com.tarantulapp.dto.AdminCreatePassportResponse;
import com.tarantulapp.dto.PassportClaimRequest;
import com.tarantulapp.dto.PassportClaimResponse;
import com.tarantulapp.dto.PublicOriginDTO;
import com.tarantulapp.dto.PublicProfileDTO;
import com.tarantulapp.entity.Passport;
import com.tarantulapp.entity.PassportClaimEvent;
import com.tarantulapp.entity.ProDayGrant;
import com.tarantulapp.entity.ProDayGrantSource;
import com.tarantulapp.entity.Reminder;
import com.tarantulapp.entity.Species;
import com.tarantulapp.entity.Tarantula;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.PassportClaimEventRepository;
import com.tarantulapp.repository.PassportRepository;
import com.tarantulapp.repository.ReminderRepository;
import com.tarantulapp.repository.SpeciesRepository;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@Transactional
public class PassportService {

    private final PassportRepository passportRepository;
    /** Pro days rewarded for a keeper's first claimed specimen. */
    static final int FIRST_CLAIM_PRO_DAYS = 30;
    /** Pro days rewarded for each specimen claimed after the first. */
    static final int SUBSEQUENT_CLAIM_PRO_DAYS = 7;

    private final SpeciesRepository speciesRepository;
    private final UserRepository userRepository;
    private final ShortIdService shortIdService;
    private final TarantulaRepository tarantulaRepository;
    private final PlanAccessService planAccessService;
    private final ProDayGrantService proDayGrantService;
    private final ReminderRepository reminderRepository;
    private final PassportClaimEventRepository passportClaimEventRepository;
    private final VerifiedOriginService verifiedOriginService;

    @Value("${app.public-base-url:https://tarantulapp.com}")
    private String publicBaseUrl;

    public PassportService(PassportRepository passportRepository,
                           SpeciesRepository speciesRepository,
                           UserRepository userRepository,
                           ShortIdService shortIdService,
                           TarantulaRepository tarantulaRepository,
                           PlanAccessService planAccessService,
                           ProDayGrantService proDayGrantService,
                           ReminderRepository reminderRepository,
                           PassportClaimEventRepository passportClaimEventRepository,
                           VerifiedOriginService verifiedOriginService) {
        this.passportRepository = passportRepository;
        this.speciesRepository = speciesRepository;
        this.userRepository = userRepository;
        this.shortIdService = shortIdService;
        this.tarantulaRepository = tarantulaRepository;
        this.planAccessService = planAccessService;
        this.proDayGrantService = proDayGrantService;
        this.reminderRepository = reminderRepository;
        this.passportClaimEventRepository = passportClaimEventRepository;
        this.verifiedOriginService = verifiedOriginService;
    }

    /** Links a newly created keeper specimen to a claimed passport (same short_id for life). */
    public Passport createClaimedFromTarantula(Tarantula tarantula, UUID ownerUserId) {
        Passport passport = new Passport();
        passport.setShortId(tarantula.getShortId());
        passport.setCreatedByUserId(ownerUserId);
        passport.setOriginUserId(ownerUserId);
        passport.setSpecies(tarantula.getSpecies());
        passport.setStage(tarantula.getStage());
        passport.setSex(tarantula.getSex());
        passport.setClaimedAt(Instant.now());
        passport.setClaimedByUserId(ownerUserId);
        passport.setTarantulaId(tarantula.getId());
        return passportRepository.save(passport);
    }

    @Transactional(readOnly = true)
    public PublicProfileDTO buildUnclaimedPublicProfile(Passport passport) {
        PublicProfileDTO dto = new PublicProfileDTO();
        dto.setPageMode(PublicProfileDTO.PageMode.PASSPORT);
        dto.setShortId(passport.getShortId());
        dto.setStage(passport.getStage());
        dto.setSex(passport.getSex());
        dto.setLabelNotes(passport.getLabelNotes());
        dto.setProGiftDays(passport.getProGiftDays() != null ? passport.getProGiftDays() : 30);

        Species species = passport.getSpecies();
        if (species != null) {
            dto.setSpeciesId(species.getId());
            dto.setScientificName(species.getScientificName());
            dto.setCommonName(species.getCommonName());
            dto.setHabitatType(species.getHabitatType());
        }

        UUID creatorId = passport.getOriginUserId() != null
                ? passport.getOriginUserId()
                : passport.getCreatedByUserId();
        if (creatorId != null) {
            userRepository.findById(creatorId).ifPresent(creator -> {
                populateCreatorFields(dto, creator);
                dto.setOrigin(verifiedOriginService.resolvePublicOrigin(creator));
            });
        }

        return dto;
    }

    public AdminCreatePassportResponse createUnclaimedPassport(AdminCreatePassportRequest req) {
        Species species = speciesRepository.findById(req.getSpeciesId())
                .orElseThrow(() -> new NotFoundException("Especie no encontrada"));

        UUID creatorId = req.getCreatedByUserId();
        if (creatorId != null) {
            userRepository.findById(creatorId)
                    .orElseThrow(() -> new NotFoundException("Usuario creador no encontrado"));
        }

        Passport passport = new Passport();
        passport.setShortId(shortIdService.generateUniqueShortId());
        passport.setSpecies(species);
        passport.setStage(trimToNull(req.getStage()));
        passport.setSex(trimToNull(req.getSex()));
        passport.setLabelNotes(trimToNull(req.getLabelNotes()));
        if (req.getProGiftDays() != null && req.getProGiftDays() > 0) {
            passport.setProGiftDays(req.getProGiftDays());
        }
        passport.setCreatedByUserId(creatorId);
        passport.setOriginUserId(creatorId);

        Passport saved = passportRepository.save(passport);
        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        return new AdminCreatePassportResponse(
                saved.getId(),
                saved.getShortId(),
                base + "/t/" + saved.getShortId()
        );
    }

    @Transactional(readOnly = true)
    public Passport requireByShortId(String shortId) {
        return passportRepository.findByShortId(shortId.trim())
                .orElseThrow(() -> new NotFoundException("Perfil no encontrado"));
    }

    /**
     * Claim an unclaimed passport: creates the keeper's collection entry, grants included Pro days,
     * and optionally schedules a first feeding reminder.
     */
    public PassportClaimResponse claimPassport(String shortId, PassportClaimRequest req, UUID userId) {
        Passport passport = passportRepository.findByShortId(shortId.trim())
                .orElseThrow(() -> new NotFoundException("Perfil no encontrado"));

        if (passport.isClaimed()) {
            if (userId.equals(passport.getClaimedByUserId()) && passport.getTarantulaId() != null) {
                return buildClaimResponseForExisting(passport);
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "PASSPORT_ALREADY_CLAIMED");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        enforceCreationLimit(user);

        String specimenName = resolveSpecimenName(req, passport);
        Tarantula tarantula = new Tarantula();
        tarantula.setUserId(userId);
        tarantula.setShortId(passport.getShortId());
        tarantula.setName(specimenName);
        tarantula.setStage(passport.getStage());
        tarantula.setSex(passport.getSex());
        tarantula.setSpecies(passport.getSpecies());
        tarantula.setPurchaseDate(LocalDate.now());
        tarantula.setIsPublic(Boolean.TRUE.equals(user.getDefaultTarantulaPublic()));
        if (passport.getLabelNotes() != null && !passport.getLabelNotes().isBlank()) {
            tarantula.setNotes(passport.getLabelNotes());
        }
        Tarantula saved = tarantulaRepository.save(tarantula);

        // Pro reward rule: 30 days for the keeper's first claimed specimen, 7 days for each one after.
        // Anti-abuse: a passport pays out at most once (guards re-claim/transfer farming).
        boolean shouldGrant = passport.getProGrantedAt() == null;
        int giftDays = 0;
        if (shouldGrant) {
            boolean firstClaim = !proDayGrantService.hasGrantOfSource(
                    userId, ProDayGrantSource.PASSPORT_CLAIM);
            giftDays = firstClaim ? FIRST_CLAIM_PRO_DAYS : SUBSEQUENT_CLAIM_PRO_DAYS;
        }

        Instant now = Instant.now();
        passport.setClaimedAt(now);
        passport.setClaimedByUserId(userId);
        passport.setTarantulaId(saved.getId());
        if (shouldGrant) {
            passport.setProGrantedAt(now);
        }
        passportRepository.save(passport);

        saved.setPassportId(passport.getId());
        tarantulaRepository.save(saved);

        ProDayGrant grant = shouldGrant
                ? proDayGrantService.recordGrant(user, giftDays, ProDayGrantSource.PASSPORT_CLAIM, null, null)
                : null;

        boolean reminderCreated = false;
        if (req.getSetupFeedingReminder() == null || Boolean.TRUE.equals(req.getSetupFeedingReminder())) {
            reminderCreated = createFirstFeedingReminder(userId, saved);
        }

        PassportClaimEvent event = new PassportClaimEvent();
        event.setPassportId(passport.getId());
        event.setClaimedByUserId(userId);
        event.setProGrantId(grant != null ? grant.getId() : null);
        event.setFeedingReminderCreated(reminderCreated);
        passportClaimEventRepository.save(event);

        PassportClaimResponse response = new PassportClaimResponse();
        response.setTarantulaId(saved.getId());
        response.setShortId(passport.getShortId());
        response.setName(saved.getName());
        response.setProGiftDays(giftDays);
        response.setProGrantId(grant != null ? grant.getId() : null);
        response.setFeedingReminderCreated(reminderCreated);
        response.setPageMode(PublicProfileDTO.PageMode.SPECIMEN);
        return response;
    }

    private PassportClaimResponse buildClaimResponseForExisting(Passport passport) {
        Tarantula t = tarantulaRepository.findById(passport.getTarantulaId())
                .orElseThrow(() -> new NotFoundException("Perfil no encontrado"));
        PassportClaimResponse response = new PassportClaimResponse();
        response.setTarantulaId(t.getId());
        response.setShortId(passport.getShortId());
        response.setName(t.getName());
        response.setProGiftDays(passport.getProGiftDays() != null ? passport.getProGiftDays() : 30);
        response.setPageMode(PublicProfileDTO.PageMode.SPECIMEN);
        return response;
    }

    private void enforceCreationLimit(User user) {
        if (planAccessService.hasProFeatures(user)) {
            return;
        }
        long count = tarantulaRepository.countByUserId(user.getId());
        if (count >= 6) {
            throw new IllegalArgumentException(
                    "La versión gratis permite guardar hasta 6 tarántulas. Actualiza a Pro para agregar más.");
        }
    }

    private String resolveSpecimenName(PassportClaimRequest req, Passport passport) {
        if (req.getName() != null && !req.getName().isBlank()) {
            return req.getName().trim();
        }
        Species species = passport.getSpecies();
        if (species != null && species.getCommonName() != null && !species.getCommonName().isBlank()) {
            return species.getCommonName().trim();
        }
        if (species != null && species.getScientificName() != null && !species.getScientificName().isBlank()) {
            return species.getScientificName().trim();
        }
        return "My tarantula";
    }

    private boolean createFirstFeedingReminder(UUID userId, Tarantula tarantula) {
        long intervalDays = feedingIntervalDaysForStage(tarantula.getStage());
        Reminder reminder = new Reminder();
        reminder.setUserId(userId);
        reminder.setTarantulaId(tarantula.getId());
        reminder.setType("feeding");
        reminder.setDueDate(Instant.now().plus(intervalDays, ChronoUnit.DAYS));
        reminder.setMessage("First feeding check for " + tarantula.getName());
        reminderRepository.save(reminder);
        return true;
    }

    private static long feedingIntervalDaysForStage(String stage) {
        if (stage == null) return 10;
        return switch (stage) {
            case "sling" -> 7;
            case "juvenile" -> 10;
            case "subadult" -> 14;
            case "adult" -> 21;
            default -> 10;
        };
    }

    private void populateCreatorFields(PublicProfileDTO dto, User creator) {
        PublicOriginDTO originDto = verifiedOriginService.resolvePublicOrigin(creator);
        String label = null;
        if (originDto != null && originDto.getDisplayName() != null && !originDto.getDisplayName().isBlank()) {
            label = originDto.getDisplayName().trim();
        } else if (creator.getStorefrontName() != null && !creator.getStorefrontName().isBlank()) {
            label = creator.getStorefrontName().trim();
        } else if (creator.getDisplayName() != null && !creator.getDisplayName().isBlank()) {
            label = creator.getDisplayName().trim();
        }
        dto.setCreatorDisplayName(label);
        String handle = creator.getPublicHandle();
        if (handle != null && !handle.isBlank()) {
            dto.setCreatorHandle(handle.trim());
        }
    }

    private static String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
