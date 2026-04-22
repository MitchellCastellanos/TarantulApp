package com.tarantulapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tarantulapp.entity.LaunchEventEmailEvent;
import com.tarantulapp.entity.LaunchEventRegistration;
import com.tarantulapp.repository.LaunchEventEmailEventRepository;
import com.tarantulapp.repository.LaunchEventRegistrationRepository;
import jakarta.mail.internet.MimeMessage;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class LaunchEventService {
    private static final Logger log = LoggerFactory.getLogger(LaunchEventService.class);
    private static final DateTimeFormatter ICS_DATE = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss");
    private static final String EVENT_KEY_CONFIRM = "SPOT_CONFIRMED";
    private static final String EVENT_KEY_REMINDER_2D = "REMINDER_2_DAYS";
    private static final String EVENT_KEY_REMINDER_1D = "REMINDER_1_DAY";

    private final LaunchEventRegistrationRepository registrationRepository;
    private final LaunchEventEmailEventRepository emailEventRepository;
    private final JavaMailSender mailSender;
    private final ObjectMapper objectMapper;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    @Value("${app.mail.from:noreply@tarantulapp.com}")
    private String fromAddress;

    @Value("${app.mail.from-name:TarantulApp}")
    private String fromName;

    @Value("${app.mail.reply-to:}")
    private String replyToAddress;

    @Value("${app.launch-event.capacity:45}")
    private int capacity;

    @Value("${app.launch-event.datetime-local:2026-05-09T15:00:00}")
    private String eventDateTimeLocal;

    @Value("${app.launch-event.duration-minutes:120}")
    private int eventDurationMinutes;

    @Value("${app.launch-event.timezone:America/Toronto}")
    private String eventTimezone;

    @Value("${app.launch-event.location:Montreal, Quebec}")
    private String eventLocation;

    @Value("${app.launch-event.title:TarantulApp Live Registration Event}")
    private String eventTitle;

    public LaunchEventService(LaunchEventRegistrationRepository registrationRepository,
                              LaunchEventEmailEventRepository emailEventRepository,
                              JavaMailSender mailSender,
                              ObjectMapper objectMapper) {
        this.registrationRepository = registrationRepository;
        this.emailEventRepository = emailEventRepository;
        this.mailSender = mailSender;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Map<String, Object> register(LaunchRegistrationRequest req) {
        String email = clean(req.email(), 255);
        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("Valid email is required");
        }
        Optional<LaunchEventRegistration> existing = registrationRepository.findByEmailIgnoreCase(email);
        if (existing.isPresent()) {
            return buildResponse(existing.get(), true);
        }
        if (!Boolean.TRUE.equals(req.willAttend())) {
            throw new IllegalArgumentException("Please confirm attendance");
        }
        String fullName = clean(req.fullName(), 140);
        String phone = clean(req.phone(), 40);
        if (fullName == null || phone == null) {
            throw new IllegalArgumentException("Name and phone are required");
        }

        entityManager.createNativeQuery("LOCK TABLE launch_event_registrations IN EXCLUSIVE MODE").executeUpdate();
        long reservedCount = registrationRepository.countByStatus(LaunchEventRegistration.Status.RESERVED);

        LaunchEventRegistration registration = new LaunchEventRegistration();
        registration.setFullName(fullName);
        registration.setEmail(email);
        registration.setPhone(phone);
        registration.setOwnsTarantulas(Boolean.TRUE.equals(req.ownsTarantulas()));
        registration.setTarantulaCount(req.tarantulaCount() != null && req.tarantulaCount() >= 0 ? req.tarantulaCount() : null);
        registration.setWillAttend(true);
        registration.setBringCollectionInfo(Boolean.TRUE.equals(req.bringCollectionInfo()));
        registration.setReminderOptIn(Boolean.TRUE.equals(req.reminderOptIn()));
        registration.setNewsletterOptIn(Boolean.TRUE.equals(req.newsletterOptIn()));
        registration.setLanguage(normalizeLanguage(req.language()));
        registration.setSourcePath(clean(req.sourcePath(), 80));

        if (reservedCount < capacity) {
            int nextSeat = registrationRepository.findMaxReservationIndex() + 1;
            registration.setStatus(LaunchEventRegistration.Status.RESERVED);
            registration.setReservationIndex(nextSeat);
        } else {
            registration.setStatus(LaunchEventRegistration.Status.WAITLIST);
            registration.setReservationIndex(null);
        }
        LaunchEventRegistration saved = registrationRepository.save(registration);
        if (saved.getStatus() == LaunchEventRegistration.Status.RESERVED) {
            sendEmailOnce(saved, EVENT_KEY_CONFIRM, buildConfirmationSubject(saved), buildConfirmationBody(saved));
        }
        return buildResponse(saved, false);
    }

    public Map<String, Object> status() {
        long reserved = registrationRepository.countByStatus(LaunchEventRegistration.Status.RESERVED);
        long waitlist = registrationRepository.countByStatus(LaunchEventRegistration.Status.WAITLIST);
        long remaining = Math.max(0, capacity - reserved);
        return Map.of(
                "capacity", capacity,
                "reserved", reserved,
                "remaining", remaining,
                "waitlist", waitlist
        );
    }

    public Map<String, Object> checkQuebecEligibility(HttpServletRequest request) {
        String headerCountry = upper(request.getHeader("CF-IPCountry"));
        String headerRegion = upper(orElse(request.getHeader("CF-Region-Code"), request.getHeader("X-Region-Code")));
        if ("CA".equals(headerCountry) && "QC".equals(headerRegion)) {
            return Map.of("eligible", true, "region", "QC", "country", "CA", "source", "edge_headers");
        }
        String ip = extractClientIp(request);
        if (ip == null) {
            return Map.of("eligible", false, "source", "no_ip");
        }
        try {
            HttpClient client = HttpClient.newBuilder().build();
            HttpRequest ipReq = HttpRequest.newBuilder()
                    .uri(URI.create("https://ipapi.co/" + ip + "/json/"))
                    .GET()
                    .timeout(java.time.Duration.ofSeconds(3))
                    .build();
            HttpResponse<String> resp = client.send(ipReq, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() >= 200 && resp.statusCode() < 300) {
                JsonNode root = objectMapper.readTree(resp.body());
                String country = upper(root.path("country_code").asText(""));
                String regionCode = upper(root.path("region_code").asText(""));
                String regionName = upper(root.path("region").asText(""));
                boolean eligible = "CA".equals(country) && ("QC".equals(regionCode) || regionName.contains("QUEBEC"));
                return Map.of(
                        "eligible", eligible,
                        "country", country,
                        "region", regionCode.isBlank() ? regionName : regionCode,
                        "source", "ipapi"
                );
            }
        } catch (Exception ex) {
            log.warn("Launch Quebec eligibility lookup failed: {}", ex.getMessage());
        }
        return Map.of("eligible", false, "source", "lookup_failed");
    }

    @Scheduled(cron = "${app.launch-event.reminders-cron:0 0 10 * * *}")
    @Transactional
    public void sendScheduledReminders() {
        ZoneId zoneId = ZoneId.of(eventTimezone);
        LocalDate eventDate = eventStart().toLocalDate();
        LocalDate nowDate = LocalDate.now(zoneId);
        List<LaunchEventRegistration> reserved = registrationRepository.findByStatusAndWillAttendTrue(LaunchEventRegistration.Status.RESERVED);
        if (reserved.isEmpty()) {
            return;
        }
        if (nowDate.equals(eventDate.minusDays(2))) {
            for (LaunchEventRegistration registration : reserved) {
                if (registration.isReminderOptIn()) {
                    sendEmailOnce(
                            registration,
                            EVENT_KEY_REMINDER_2D,
                            "Reminder - limited group, we're expecting you",
                            buildReminderBody(registration, 2)
                    );
                }
            }
        }
        if (nowDate.equals(eventDate.minusDays(1))) {
            for (LaunchEventRegistration registration : reserved) {
                sendEmailOnce(
                        registration,
                        EVENT_KEY_REMINDER_1D,
                        "See you tomorrow - doors open at 3 PM",
                        buildReminderBody(registration, 1)
                );
            }
        }
    }

    private void sendEmailOnce(LaunchEventRegistration registration, String eventKey, String subject, String body) {
        if (emailEventRepository.existsByRegistrationAndEventKey(registration, eventKey)) {
            return;
        }
        try {
            sendEmail(registration.getEmail(), subject, body);
            LaunchEventEmailEvent event = new LaunchEventEmailEvent();
            event.setRegistration(registration);
            event.setEventKey(eventKey);
            emailEventRepository.save(event);
        } catch (DataIntegrityViolationException ignored) {
            // Duplicate send prevented by unique constraint.
        }
    }

    private void sendEmail(String to, String subject, String body) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body);
            if (replyToAddress != null && !replyToAddress.isBlank()) {
                helper.setReplyTo(replyToAddress);
            }
            helper.addAttachment("TarantulApp-Montreal-Launch.ics", new ByteArrayResource(buildCalendarInvite().getBytes(StandardCharsets.UTF_8)));
            mailSender.send(msg);
        } catch (Exception ex) {
            log.error("Launch event email failed for {}: {}", to, ex.getMessage());
        }
    }

    private String buildCalendarInvite() {
        ZoneId zone = ZoneId.of(eventTimezone);
        LocalDateTime start = eventStart();
        LocalDateTime end = start.plusMinutes(eventDurationMinutes);
        return "BEGIN:VCALENDAR\r\n"
                + "VERSION:2.0\r\n"
                + "PRODID:-//TarantulApp//Montreal Launch Event//EN\r\n"
                + "CALSCALE:GREGORIAN\r\n"
                + "METHOD:PUBLISH\r\n"
                + "BEGIN:VEVENT\r\n"
                + "UID:tarantulapp-launch-montreal-20260509@tarantulapp.com\r\n"
                + "DTSTAMP:" + ICS_DATE.format(LocalDateTime.now(ZoneId.of("UTC"))) + "Z\r\n"
                + "DTSTART;TZID=" + zone.getId() + ":" + ICS_DATE.format(start) + "\r\n"
                + "DTEND;TZID=" + zone.getId() + ":" + ICS_DATE.format(end) + "\r\n"
                + "SUMMARY:" + escapeIcs(eventTitle) + "\r\n"
                + "LOCATION:" + escapeIcs(eventLocation) + "\r\n"
                + "DESCRIPTION:" + escapeIcs("TarantulApp in-person registration event in Montreal. Doors open at 3 PM.") + "\r\n"
                + "BEGIN:VALARM\r\n"
                + "TRIGGER:-PT24H\r\n"
                + "ACTION:DISPLAY\r\n"
                + "DESCRIPTION:Event reminder\r\n"
                + "END:VALARM\r\n"
                + "END:VEVENT\r\n"
                + "END:VCALENDAR\r\n";
    }

    private String buildConfirmationSubject(LaunchEventRegistration registration) {
        return "fr".equals(registration.getLanguage())
                ? "Votre place est confirmee - TarantulApp Montreal"
                : "Your spot is confirmed - TarantulApp Montreal";
    }

    private String buildConfirmationBody(LaunchEventRegistration registration) {
        if ("fr".equals(registration.getLanguage())) {
            return "Felicitations, vous etes arrive a temps.\n\n"
                    + "Votre place est reservee pour l'evenement TarantulApp a Montreal.\n"
                    + "Date: samedi 9 mai\n"
                    + "Heure: 15h00 (portes ouvertes)\n"
                    + "Lieu: " + eventLocation + "\n\n"
                    + "On a hate de vous voir.\n"
                    + "- Equipe TarantulApp";
        }
        return "Congratulations, you've arrived in time.\n\n"
                + "Your spot is reserved for the TarantulApp event in Montreal.\n"
                + "Date: Saturday, May 9\n"
                + "Time: 3:00 PM (doors open)\n"
                + "Location: " + eventLocation + "\n\n"
                + "We can't wait to see you.\n"
                + "- TarantulApp Team";
    }

    private String buildReminderBody(LaunchEventRegistration registration, int daysBefore) {
        boolean fr = "fr".equals(registration.getLanguage());
        if (fr) {
            if (daysBefore == 2) {
                return "Rappel - groupe limite, on vous attend.\n\n"
                        + "Votre reservation pour l'evenement TarantulApp est active.\n"
                        + "A bientot a Montreal.";
            }
            return "A demain - ouverture des portes a 15h00.\n\n"
                    + "Votre reservation est prete.\n"
                    + "A demain a Montreal.";
        }
        if (daysBefore == 2) {
            return "Reminder - limited group, we're expecting you.\n\n"
                    + "Your TarantulApp reservation is active.\n"
                    + "See you soon in Montreal.";
        }
        return "See you tomorrow - doors open at 3 PM.\n\n"
                + "Your reservation is all set.\n"
                + "See you in Montreal.";
    }

    private Map<String, Object> buildResponse(LaunchEventRegistration registration, boolean alreadyRegistered) {
        long reserved = registrationRepository.countByStatus(LaunchEventRegistration.Status.RESERVED);
        long remaining = Math.max(0, capacity - reserved);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("alreadyRegistered", alreadyRegistered);
        out.put("status", registration.getStatus().name());
        out.put("isReserved", registration.getStatus() == LaunchEventRegistration.Status.RESERVED);
        out.put("reservationIndex", registration.getReservationIndex());
        out.put("capacity", capacity);
        out.put("reserved", reserved);
        out.put("remaining", remaining);
        return out;
    }

    private String normalizeLanguage(String language) {
        if (language == null) {
            return "en";
        }
        String trimmed = language.trim().toLowerCase(Locale.ROOT);
        return trimmed.startsWith("fr") ? "fr" : "en";
    }

    private String clean(String value, int maxLen) {
        if (value == null) {
            return null;
        }
        String out = value.trim().replaceAll("\\s+", " ");
        if (out.isEmpty()) {
            return null;
        }
        return out.length() > maxLen ? out.substring(0, maxLen) : out;
    }

    private String extractClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            String first = xff.split(",")[0].trim();
            if (!first.isEmpty()) {
                return first;
            }
        }
        String remote = request.getRemoteAddr();
        if (remote != null && !remote.isBlank()) {
            return remote;
        }
        return null;
    }

    private String orElse(String first, String second) {
        return (first != null && !first.isBlank()) ? first : second;
    }

    private String upper(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String escapeIcs(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n");
    }

    private LocalDateTime eventStart() {
        return LocalDateTime.parse(eventDateTimeLocal);
    }

    public record LaunchRegistrationRequest(
            String fullName,
            String email,
            String phone,
            Boolean ownsTarantulas,
            Integer tarantulaCount,
            Boolean willAttend,
            Boolean bringCollectionInfo,
            Boolean reminderOptIn,
            Boolean newsletterOptIn,
            String language,
            String sourcePath
    ) {}
}
