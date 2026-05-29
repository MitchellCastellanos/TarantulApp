package com.tarantulapp.service;

import com.tarantulapp.dto.AdminCreatePassportRequest;
import com.tarantulapp.dto.AdminCreatePassportResponse;
import com.tarantulapp.dto.PublicProfileDTO;
import com.tarantulapp.entity.Passport;
import com.tarantulapp.entity.Species;
import com.tarantulapp.entity.Tarantula;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.PassportRepository;
import com.tarantulapp.repository.SpeciesRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@Transactional
public class PassportService {

    private final PassportRepository passportRepository;
    private final SpeciesRepository speciesRepository;
    private final UserRepository userRepository;
    private final ShortIdService shortIdService;

    @Value("${app.public-base-url:https://tarantulapp.com}")
    private String publicBaseUrl;

    public PassportService(PassportRepository passportRepository,
                           SpeciesRepository speciesRepository,
                           UserRepository userRepository,
                           ShortIdService shortIdService) {
        this.passportRepository = passportRepository;
        this.speciesRepository = speciesRepository;
        this.userRepository = userRepository;
        this.shortIdService = shortIdService;
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
            userRepository.findById(creatorId).ifPresent(creator -> populateCreatorFields(dto, creator));
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

    private void populateCreatorFields(PublicProfileDTO dto, User creator) {
        dto.setCreatorDisplayName(creator.getDisplayName());
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
