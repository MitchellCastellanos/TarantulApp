package com.tarantulapp.service;

import com.tarantulapp.entity.Passport;
import com.tarantulapp.entity.SpecimenTransfer;
import com.tarantulapp.entity.Tarantula;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.PassportRepository;
import com.tarantulapp.repository.SpecimenTransferRepository;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Email-based, non-monetary, irreversible custody transfer of a specimen between keepers.
 * Reassigns the tarantula + its passport claim to the recipient; the passport origin is never
 * touched, so provenance ("bought from X") survives the transfer.
 */
@Service
public class SpecimenTransferService {

    private final SpecimenTransferRepository transferRepository;
    private final TarantulaRepository tarantulaRepository;
    private final PassportRepository passportRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Value("${app.base-url:http://localhost:5173}")
    private String baseUrl;

    public SpecimenTransferService(SpecimenTransferRepository transferRepository,
                                   TarantulaRepository tarantulaRepository,
                                   PassportRepository passportRepository,
                                   UserRepository userRepository,
                                   EmailService emailService) {
        this.transferRepository = transferRepository;
        this.tarantulaRepository = tarantulaRepository;
        this.passportRepository = passportRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    @Transactional
    public Map<String, Object> initiate(UUID tarantulaId, UUID fromUserId, String toEmailRaw, String message) {
        Tarantula tarantula = tarantulaRepository.findById(tarantulaId)
                .orElseThrow(() -> new NotFoundException("Espécimen no encontrado"));
        if (!fromUserId.equals(tarantula.getUserId())) {
            throw new IllegalArgumentException("NOT_OWNER");
        }
        if (tarantula.getPassportId() == null) {
            throw new IllegalArgumentException("NO_PASSPORT");
        }
        String toEmail = normalizeEmail(toEmailRaw);
        if (toEmail.isEmpty()) {
            throw new IllegalArgumentException("EMAIL_REQUIRED");
        }
        User fromUser = requireUser(fromUserId);
        if (toEmail.equalsIgnoreCase(normalizeEmail(fromUser.getEmail()))) {
            throw new IllegalArgumentException("CANNOT_TRANSFER_TO_SELF");
        }
        transferRepository.findByPassportIdAndStatus(tarantula.getPassportId(), SpecimenTransfer.PENDING)
                .ifPresent(t -> { throw new IllegalArgumentException("TRANSFER_ALREADY_PENDING"); });

        SpecimenTransfer transfer = new SpecimenTransfer();
        transfer.setPassportId(tarantula.getPassportId());
        transfer.setTarantulaId(tarantula.getId());
        transfer.setFromUserId(fromUserId);
        transfer.setToEmail(toEmail);
        transfer.setMessage(message == null || message.isBlank() ? null : message.trim());
        SpecimenTransfer saved = transferRepository.save(transfer);

        String specimenName = specimenName(tarantula);
        String fromName = displayName(fromUser);
        String acceptUrl = baseUrl + "/transfers";
        Optional<User> recipient = userRepository.findByEmail(toEmail);
        String recipientLocale = recipient.map(User::getPreferredLocale).orElse(fromUser.getPreferredLocale());
        emailService.sendSpecimenTransferOffer(toEmail, fromName, specimenName, acceptUrl, recipientLocale);
        emailService.sendSpecimenTransferSenderReceipt(fromUser.getEmail(), specimenName, toEmail, acceptUrl,
                fromUser.getPreferredLocale());

        return toMap(saved, tarantula, fromUser);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> incoming(UUID userId) {
        User user = requireUser(userId);
        return transferRepository
                .findByToEmailIgnoreCaseAndStatusOrderByCreatedAtDesc(normalizeEmail(user.getEmail()), SpecimenTransfer.PENDING)
                .stream()
                .map(this::toIncomingMap)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> outgoing(UUID userId) {
        return transferRepository.findByFromUserIdOrderByCreatedAtDesc(userId).stream()
                .map(t -> {
                    Tarantula tarantula = t.getTarantulaId() == null ? null
                            : tarantulaRepository.findById(t.getTarantulaId()).orElse(null);
                    return toMap(t, tarantula, null);
                })
                .toList();
    }

    @Transactional
    public Map<String, Object> accept(UUID transferId, UUID userId) {
        SpecimenTransfer transfer = transferRepository.findById(transferId)
                .orElseThrow(() -> new NotFoundException("Transferencia no encontrada"));
        if (!SpecimenTransfer.PENDING.equals(transfer.getStatus())) {
            throw new IllegalArgumentException("TRANSFER_NOT_PENDING");
        }
        User recipient = requireUser(userId);
        if (!normalizeEmail(recipient.getEmail()).equalsIgnoreCase(normalizeEmail(transfer.getToEmail()))) {
            throw new IllegalArgumentException("EMAIL_MISMATCH");
        }
        Passport passport = passportRepository.findById(transfer.getPassportId())
                .orElseThrow(() -> new NotFoundException("Pasaporte no encontrado"));
        Tarantula tarantula = passport.getTarantulaId() == null ? null
                : tarantulaRepository.findById(passport.getTarantulaId()).orElse(null);
        if (tarantula == null) {
            throw new IllegalArgumentException("SPECIMEN_NOT_FOUND");
        }
        UUID fromUserId = tarantula.getUserId();

        // Reassign custody. Origin on the passport is intentionally left unchanged.
        tarantula.setUserId(userId);
        tarantulaRepository.save(tarantula);
        passport.setClaimedByUserId(userId);
        passportRepository.save(passport);

        transfer.setToUserId(userId);
        transfer.setStatus(SpecimenTransfer.ACCEPTED);
        transfer.setAcceptedAt(Instant.now());
        transferRepository.save(transfer);

        String specimenName = specimenName(tarantula);
        userRepository.findById(fromUserId).ifPresent(fromUser ->
                emailService.sendSpecimenTransferCompleted(fromUser.getEmail(), specimenName,
                        displayName(recipient), false, fromUser.getPreferredLocale()));
        String fromName = userRepository.findById(fromUserId).map(this::displayName).orElse(null);
        emailService.sendSpecimenTransferCompleted(recipient.getEmail(), specimenName, fromName, true,
                recipient.getPreferredLocale());

        return toMap(transfer, tarantula, null);
    }

    @Transactional
    public Map<String, Object> cancel(UUID transferId, UUID userId) {
        SpecimenTransfer transfer = transferRepository.findById(transferId)
                .orElseThrow(() -> new NotFoundException("Transferencia no encontrada"));
        if (!transfer.getFromUserId().equals(userId)) {
            throw new IllegalArgumentException("NOT_OWNER");
        }
        if (!SpecimenTransfer.PENDING.equals(transfer.getStatus())) {
            throw new IllegalArgumentException("TRANSFER_NOT_PENDING");
        }
        transfer.setStatus(SpecimenTransfer.CANCELLED);
        transfer.setCancelledAt(Instant.now());
        transferRepository.save(transfer);
        return Map.of("status", transfer.getStatus(), "id", transfer.getId());
    }

    private Map<String, Object> toIncomingMap(SpecimenTransfer t) {
        Tarantula tarantula = t.getTarantulaId() == null ? null
                : tarantulaRepository.findById(t.getTarantulaId()).orElse(null);
        User fromUser = userRepository.findById(t.getFromUserId()).orElse(null);
        return toMap(t, tarantula, fromUser);
    }

    private Map<String, Object> toMap(SpecimenTransfer t, Tarantula tarantula, User fromUser) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", t.getId());
        out.put("status", t.getStatus());
        out.put("toEmail", t.getToEmail());
        out.put("message", t.getMessage());
        out.put("createdAt", t.getCreatedAt());
        out.put("passportId", t.getPassportId());
        out.put("tarantulaId", t.getTarantulaId());
        if (tarantula != null) {
            out.put("specimenName", specimenName(tarantula));
            out.put("shortId", tarantula.getShortId());
            if (tarantula.getSpecies() != null) {
                out.put("scientificName", tarantula.getSpecies().getScientificName());
            }
        }
        if (fromUser != null) {
            out.put("fromDisplayName", displayName(fromUser));
            out.put("fromHandle", fromUser.getPublicHandle());
        }
        return out;
    }

    private String specimenName(Tarantula t) {
        if (t.getName() != null && !t.getName().isBlank()) {
            return t.getName();
        }
        if (t.getSpecies() != null && t.getSpecies().getScientificName() != null) {
            return t.getSpecies().getScientificName();
        }
        return "Specimen";
    }

    private String displayName(User u) {
        if (u.getStorefrontName() != null && !u.getStorefrontName().isBlank()) return u.getStorefrontName().trim();
        if (u.getDisplayName() != null && !u.getDisplayName().isBlank()) return u.getDisplayName().trim();
        if (u.getPublicHandle() != null && !u.getPublicHandle().isBlank()) return "@" + u.getPublicHandle().trim();
        return "A TarantulApp keeper";
    }

    private static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
    }
}
