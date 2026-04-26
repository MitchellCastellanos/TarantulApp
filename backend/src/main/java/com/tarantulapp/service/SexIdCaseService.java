package com.tarantulapp.service;

import com.tarantulapp.entity.SexIdCase;
import com.tarantulapp.entity.SexIdCaseVote;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.SexIdCaseRepository;
import com.tarantulapp.repository.SexIdCaseVoteRepository;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.repository.FeedingLogRepository;
import com.tarantulapp.repository.MoltLogRepository;
import com.tarantulapp.repository.BehaviorLogRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class SexIdCaseService {

    private static final int MAX_PAGE_SIZE = 40;
    private static final String C_MALE = "MALE";
    private static final String C_FEMALE = "FEMALE";
    private static final String C_UNCERTAIN = "UNCERTAIN";
    private static final String S_OPEN = "OPEN";
    private static final String S_LOCKED = "LOCKED";
    private static final String S_RESOLVED = "RESOLVED";
    private static final String S_EXPIRED = "EXPIRED";
    private static final double AI_WEIGHT = 0.3;
    private static final double COMMUNITY_WEIGHT = 0.7;
    private static final Duration BASE_VOTING_WINDOW = Duration.ofHours(72);
    private static final Duration MIN_EARLY_CLOSE_AGE = Duration.ofHours(24);
    private static final Duration EXTENSION_WINDOW = Duration.ofHours(24);
    private static final int EARLY_CLOSE_MIN_VOTES = 12;
    private static final int MIN_RESOLUTION_VOTES = 8;
    private static final double EARLY_CLOSE_MIN_CONFIDENCE = 0.65;
    private static final double TIE_EXTENSION_THRESHOLD = 0.10;
    private static final double UNCERTAIN_MARGIN = 0.07;
    private static final int POINTS_PARTICIPATION = 2;
    private static final int POINTS_ACCURATE = 5;
    private static final int POINTS_HIGH_CONFIDENCE_BONUS = 2;
    private static final double HIGH_CONFIDENCE_SCORE = 0.80;
    private static final double MIN_RESOLVE_CONFIDENCE = 0.60;

    private final SexIdCaseRepository sexIdCaseRepository;
    private final SexIdCaseVoteRepository sexIdCaseVoteRepository;
    private final UserRepository userRepository;
    private final TarantulaRepository tarantulaRepository;
    private final FeedingLogRepository feedingLogRepository;
    private final MoltLogRepository moltLogRepository;
    private final BehaviorLogRepository behaviorLogRepository;
    private final SexIdExplanationService sexIdExplanationService;
    private final NotificationService notificationService;
    private final SexIdPointService sexIdPointService;

    public SexIdCaseService(SexIdCaseRepository sexIdCaseRepository,
                            SexIdCaseVoteRepository sexIdCaseVoteRepository,
                            UserRepository userRepository,
                            TarantulaRepository tarantulaRepository,
                            FeedingLogRepository feedingLogRepository,
                            MoltLogRepository moltLogRepository,
                            BehaviorLogRepository behaviorLogRepository,
                            SexIdExplanationService sexIdExplanationService,
                            NotificationService notificationService,
                            SexIdPointService sexIdPointService) {
        this.sexIdCaseRepository = sexIdCaseRepository;
        this.sexIdCaseVoteRepository = sexIdCaseVoteRepository;
        this.userRepository = userRepository;
        this.tarantulaRepository = tarantulaRepository;
        this.feedingLogRepository = feedingLogRepository;
        this.moltLogRepository = moltLogRepository;
        this.behaviorLogRepository = behaviorLogRepository;
        this.sexIdExplanationService = sexIdExplanationService;
        this.notificationService = notificationService;
        this.sexIdPointService = sexIdPointService;
    }

    @Transactional
    public Map<String, Object> create(UUID authorId, String title, String imageUrl, String speciesHint, String stageRaw, String imageTypeRaw) {
        String img = cleanText(imageUrl, 500);
        if (img == null) {
            throw new IllegalArgumentException("Imagen requerida");
        }
        String stage = normalizeStage(stageRaw);
        String imageType = normalizeImageType(imageTypeRaw);
        String species = cleanText(speciesHint, 200);
        HeuristicResult ai = estimateAi(stage, imageType, species);
        String explanation = sexIdExplanationService
                .generateExplanation(ai.maleProbability, ai.confidence, stage, imageType, species)
                .orElse(ai.explanation);
        SexIdCase c = new SexIdCase();
        c.setAuthorUserId(authorId);
        c.setTitle(cleanText(title, 200));
        c.setImageUrl(img);
        c.setSpeciesHint(species);
        c.setStage(stage);
        c.setImageType(imageType);
        c.setAiMaleProbability(round3(ai.maleProbability));
        c.setAiConfidence(round3(ai.confidence));
        c.setAiConfidenceLabel(ai.confidenceLabel);
        c.setAiExplanation(cleanText(explanation, 800));
        c.setStatus(S_OPEN);
        c.setVotingClosesAt(Instant.now().plus(BASE_VOTING_WINDOW));
        SexIdCase saved = sexIdCaseRepository.save(c);
        return toCaseDto(saved, Optional.of(authorId), aggregateForCase(saved.getId()));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPublicCase(UUID caseId, Optional<UUID> viewerId) {
        SexIdCase c = sexIdCaseRepository.findById(caseId)
                .orElseThrow(() -> new NotFoundException("Caso no encontrado"));
        if (c.getHiddenAt() != null) {
            throw new NotFoundException("Caso no encontrado");
        }
        return toCaseDto(c, viewerId, aggregateForCase(caseId));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> publicList(int page, int size) {
        Pageable p = PageRequest.of(page, clampSize(size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<SexIdCase> rows = sexIdCaseRepository.findByHiddenAtIsNullOrderByCreatedAtDesc(p);
        List<UUID> ids = rows.getContent().stream().map(SexIdCase::getId).toList();
        Map<UUID, Long> totals = loadVoteTotalsForCaseIds(ids);
        List<Map<String, Object>> content = new ArrayList<>();
        for (SexIdCase c : rows.getContent()) {
            Map<String, Object> row = summaryRow(c, totals.getOrDefault(c.getId(), 0L));
            content.add(row);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("content", content);
        out.put("number", rows.getNumber());
        out.put("size", rows.getSize());
        out.put("totalElements", rows.getTotalElements());
        out.put("totalPages", rows.getTotalPages());
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> myCases(UUID userId, int page, int size) {
        Pageable p = PageRequest.of(page, clampSize(size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<SexIdCase> rows = sexIdCaseRepository.findByAuthorUserIdOrderByCreatedAtDesc(userId, p);
        List<UUID> ids = rows.getContent().stream().map(SexIdCase::getId).toList();
        Map<UUID, Long> totals = loadVoteTotalsForCaseIds(ids);
        List<Map<String, Object>> content = new ArrayList<>();
        for (SexIdCase c : rows.getContent()) {
            content.add(summaryRow(c, totals.getOrDefault(c.getId(), 0L)));
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("content", content);
        out.put("number", rows.getNumber());
        out.put("size", rows.getSize());
        out.put("totalElements", rows.getTotalElements());
        out.put("totalPages", rows.getTotalPages());
        return out;
    }

    @Transactional
    public Map<String, Object> vote(UUID voterId, UUID caseId, String choiceRaw) {
        String choice = normalizeChoice(choiceRaw);
        SexIdCase c = sexIdCaseRepository.findById(caseId)
                .orElseThrow(() -> new NotFoundException("Caso no encontrado"));
        if (c.getHiddenAt() != null) {
            throw new NotFoundException("Caso no encontrado");
        }
        if (!S_OPEN.equals(c.getStatus()) || c.getVotingClosesAt() == null || Instant.now().isAfter(c.getVotingClosesAt())) {
            throw new AccessDeniedException("La votacion de este caso ya esta cerrada");
        }
        if (voterId.equals(c.getAuthorUserId())) {
            throw new AccessDeniedException("El autor no puede votar su propio caso");
        }
        Optional<SexIdCaseVote> existing = sexIdCaseVoteRepository.findByCaseIdAndVoterUserId(caseId, voterId);
        if (existing.isPresent()) {
            SexIdCaseVote v = existing.get();
            v.setChoice(choice);
            sexIdCaseVoteRepository.save(v);
        } else {
            SexIdCaseVote v = new SexIdCaseVote();
            v.setCaseId(caseId);
            v.setVoterUserId(voterId);
            v.setChoice(choice);
            sexIdCaseVoteRepository.save(v);
        }
        User actor = userRepository.findById(voterId).orElse(null);
        String actorLabel = actor != null && actor.getDisplayName() != null && !actor.getDisplayName().isBlank()
                ? actor.getDisplayName()
                : "Un keeper";
        notificationService.create(
                c.getAuthorUserId(),
                voterId,
                "SEX_ID_VOTE",
                actorLabel + " voto tu caso Sex ID",
                "Voto: " + choice,
                Map.of(
                        "caseId", String.valueOf(caseId),
                        "choice", choice,
                        "route", "/sex-id/" + caseId
                )
        );
        return getPublicCase(caseId, Optional.of(voterId));
    }

    private Aggregates aggregateForCase(UUID caseId) {
        double male = 0;
        double female = 0;
        double unc = 0;
        double raw = 0;
        List<SexIdCaseVote> votes = sexIdCaseVoteRepository.findByCaseId(caseId);
        for (SexIdCaseVote vote : votes) {
            String ch = vote.getChoice();
            User voter = userRepository.findById(vote.getVoterUserId()).orElse(null);
            double weighted = voteWeight(ch, voter);
            raw += 1;
            if (C_MALE.equals(ch)) {
                male += weighted;
            } else if (C_FEMALE.equals(ch)) {
                female += weighted;
            } else if (C_UNCERTAIN.equals(ch)) {
                unc += weighted;
            }
        }
        return new Aggregates(male, female, unc, raw);
    }

    private Map<UUID, Long> loadVoteTotalsForCaseIds(List<UUID> ids) {
        Map<UUID, Long> map = new HashMap<>();
        if (ids == null || ids.isEmpty()) {
            return map;
        }
        for (Object[] row : sexIdCaseVoteRepository.countTotalsByCaseIdIn(ids)) {
            UUID id = (UUID) row[0];
            long cnt = ((Number) row[1]).longValue();
            map.put(id, cnt);
        }
        return map;
    }

    private Map<String, Object> summaryRow(SexIdCase c, long totalVotes) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("title", c.getTitle() == null ? "" : c.getTitle());
        m.put("imageUrl", c.getImageUrl());
        m.put("speciesHint", c.getSpeciesHint() == null ? "" : c.getSpeciesHint());
        m.put("createdAt", c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
        m.put("totalVotes", totalVotes);
        m.put("status", c.getStatus());
        m.put("votingClosesAt", c.getVotingClosesAt() == null ? null : c.getVotingClosesAt().toString());
        m.put("hidden", c.getHiddenAt() != null);
        return m;
    }

    private Map<String, Object> toCaseDto(SexIdCase c, Optional<UUID> viewerId, Aggregates ag) {
        User author = userRepository.findById(c.getAuthorUserId()).orElse(null);
        String display = author == null
                ? "keeper"
                : (author.getDisplayName() == null || author.getDisplayName().isBlank()
                    ? (author.getEmail() != null ? author.getEmail() : "keeper")
                    : author.getDisplayName());
        double totalWeighted = ag.male + ag.female + ag.uncertain;
        int totalRawVotes = (int) Math.round(ag.rawVotes);
        Map<String, Object> tallies = new LinkedHashMap<>();
        tallies.put(C_MALE, Math.round(ag.male));
        tallies.put(C_FEMALE, Math.round(ag.female));
        tallies.put(C_UNCERTAIN, Math.round(ag.uncertain));
        Map<String, Object> pct = new LinkedHashMap<>();
        pct.put(C_MALE, totalWeighted == 0 ? 0 : Math.round(100.0 * ag.male / totalWeighted));
        pct.put(C_FEMALE, totalWeighted == 0 ? 0 : Math.round(100.0 * ag.female / totalWeighted));
        pct.put(C_UNCERTAIN, totalWeighted == 0 ? 0 : Math.round(100.0 * ag.uncertain / totalWeighted));
        double max = Math.max(ag.male, Math.max(ag.female, ag.uncertain));
        String leading;
        if (max == 0) {
            leading = null;
        } else {
            if (ag.male == max) {
                leading = C_MALE;
            } else if (ag.female == max) {
                leading = C_FEMALE;
            } else {
                leading = C_UNCERTAIN;
            }
        }
        double confidence = totalWeighted == 0 ? 0.0 : max / totalWeighted;
        double aiMale = c.getAiMaleProbability() == null ? 0.5 : clamp01(c.getAiMaleProbability());
        double aiFemale = 1.0 - aiMale;
        double communityMale = totalWeighted > 0 ? ag.male / totalWeighted : 0.5;
        double communityFemale = totalWeighted > 0 ? ag.female / totalWeighted : 0.5;
        double finalMale = (communityMale * COMMUNITY_WEIGHT) + (aiMale * AI_WEIGHT);
        double finalFemale = (communityFemale * COMMUNITY_WEIGHT) + (aiFemale * AI_WEIGHT);
        String finalLeading = finalFemale >= finalMale ? C_FEMALE : C_MALE;
        double finalScore = Math.max(finalMale, finalFemale);
        String finalConfidenceLabel = labelFromConfidence(finalScore);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", c.getId());
        out.put("title", c.getTitle() == null ? "" : c.getTitle());
        out.put("imageUrl", c.getImageUrl());
        out.put("speciesHint", c.getSpeciesHint() == null ? "" : c.getSpeciesHint());
        out.put("stage", c.getStage());
        out.put("imageType", c.getImageType());
        out.put("authorUserId", c.getAuthorUserId());
        out.put("authorDisplayName", display);
        out.put("createdAt", c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
        out.put("totals", tallies);
        out.put("totalVotes", totalRawVotes);
        out.put("percentages", pct);
        out.put("leadingChoice", leading);
        out.put("confidence", round3(confidence));
        out.put("status", c.getStatus());
        out.put("votingClosesAt", c.getVotingClosesAt() == null ? null : c.getVotingClosesAt().toString());
        out.put("resolvedAt", c.getResolvedAt() == null ? null : c.getResolvedAt().toString());
        out.put("resolutionChoice", c.getResolutionChoice());
        out.put("resolutionConfidence", c.getResolutionConfidence() == null ? null : round3(c.getResolutionConfidence()));
        out.put("resolutionConfidenceLabel", c.getResolutionConfidenceLabel());
        out.put("aiOpinion", buildAiOpinion(c));
        out.put("communityOpinion", buildCommunityOpinion(ag, totalWeighted, totalRawVotes));
        out.put("finalOpinion", buildFinalOpinion(finalLeading, finalScore, finalConfidenceLabel, finalMale, finalFemale));

        Optional<String> my = Optional.empty();
        if (viewerId.isPresent()) {
            my = sexIdCaseVoteRepository.findByCaseIdAndVoterUserId(c.getId(), viewerId.get()).map(SexIdCaseVote::getChoice);
        }
        out.put("myChoice", my.orElse(null));
        return out;
    }

    private static double round3(double v) {
        return Math.round(v * 1000.0) / 1000.0;
    }

    private Map<String, Object> buildAiOpinion(SexIdCase c) {
        double male = c.getAiMaleProbability() == null ? 0.5 : clamp01(c.getAiMaleProbability());
        double female = 1.0 - male;
        String leading = female >= male ? C_FEMALE : C_MALE;
        int pct = (int) Math.round(Math.max(male, female) * 100.0);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("leadingChoice", leading);
        out.put("probability", round3(Math.max(male, female)));
        out.put("probabilityPercent", pct);
        out.put("confidence", c.getAiConfidence() == null ? 0.5 : round3(clamp01(c.getAiConfidence())));
        out.put("confidenceLabel", c.getAiConfidenceLabel() == null ? "medium" : c.getAiConfidenceLabel());
        out.put("message", "TarantulApp dice: " + pct + "% probable " + ("FEMALE".equals(leading) ? "female" : "male"));
        out.put("explanation", c.getAiExplanation());
        return out;
    }

    private Map<String, Object> buildCommunityOpinion(Aggregates ag, double totalWeighted, int totalVotes) {
        double male = totalWeighted > 0 ? ag.male / totalWeighted : 0;
        double female = totalWeighted > 0 ? ag.female / totalWeighted : 0;
        double uncertain = totalWeighted > 0 ? ag.uncertain / totalWeighted : 0;
        String leading = null;
        if (totalWeighted > 0) {
            if (female >= male && female >= uncertain) {
                leading = C_FEMALE;
            } else if (male >= female && male >= uncertain) {
                leading = C_MALE;
            } else {
                leading = C_UNCERTAIN;
            }
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("leadingChoice", leading);
        out.put("maleProbability", round3(male));
        out.put("femaleProbability", round3(female));
        out.put("uncertainProbability", round3(uncertain));
        out.put("weightedTotal", round3(totalWeighted));
        out.put("rawVotes", totalVotes);
        return out;
    }

    private Map<String, Object> buildFinalOpinion(String leading, double score, String confidenceLabel, double male, double female) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("leadingChoice", leading);
        out.put("score", round3(score));
        out.put("scorePercent", (int) Math.round(score * 100.0));
        out.put("confidenceLabel", confidenceLabel);
        out.put("maleProbability", round3(male));
        out.put("femaleProbability", round3(female));
        return out;
    }

    private String normalizeChoice(String raw) {
        if (raw == null) {
            throw new IllegalArgumentException("Voto requerido");
        }
        String s = raw.trim().toUpperCase();
        if (C_MALE.equals(s) || C_FEMALE.equals(s) || C_UNCERTAIN.equals(s)) {
            return s;
        }
        throw new IllegalArgumentException("Voto no valido");
    }

    private String cleanText(String t, int max) {
        if (t == null) {
            return null;
        }
        String s = t.trim();
        if (s.isEmpty()) {
            return null;
        }
        if (s.length() > max) {
            s = s.substring(0, max);
        }
        return s;
    }

    private String normalizeStage(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String s = raw.trim().toLowerCase();
        if ("sling".equals(s) || "juvenile".equals(s) || "adult".equals(s)) {
            return s;
        }
        return null;
    }

    private String normalizeImageType(String raw) {
        if (raw == null || raw.isBlank()) {
            return "ventral";
        }
        String s = raw.trim().toLowerCase();
        if ("ventral".equals(s) || "exuvia".equals(s)) {
            return s;
        }
        return "ventral";
    }

    private HeuristicResult estimateAi(String stage, String imageType, String species) {
        double male = 0.60;
        double confidence = 0.50;
        if ("juvenile".equals(stage) || "sling".equals(stage)) {
            confidence -= 0.18;
            male -= 0.04;
        }
        if (!"exuvia".equals(imageType)) {
            confidence -= 0.10;
        } else {
            confidence += 0.08;
        }
        String s = species == null ? "" : species.toLowerCase();
        if (s.contains("brachypelma") || s.contains("grammostola") || s.contains("aphonopelma")) {
            confidence -= 0.07;
        }
        confidence = clamp01(confidence);
        male = clamp01(male);
        return new HeuristicResult(
                male,
                confidence,
                labelFromConfidence(confidence),
                buildAiExplanation(stage, imageType, species, confidence)
        );
    }

    private String labelFromConfidence(double confidence) {
        if (confidence >= 0.75) {
            return "high";
        }
        if (confidence >= 0.45) {
            return "medium";
        }
        return "low";
    }

    private String buildAiExplanation(String stage, String imageType, String species, double confidence) {
        List<String> reasons = new ArrayList<>();
        if ("juvenile".equals(stage) || "sling".equals(stage)) {
            reasons.add("En ejemplares juveniles o sling es mas dificil confirmar estructuras sexuales");
        }
        if (!"exuvia".equals(imageType)) {
            reasons.add("La imagen ventral puede no mostrar detalles reproductivos con nitidez");
        }
        if (species != null && !species.isBlank()) {
            String low = species.toLowerCase();
            if (low.contains("brachypelma") || low.contains("grammostola") || low.contains("aphonopelma")) {
                reasons.add("Esta especie o genero suele requerir una revision muy clara para sexado");
            }
        }
        if (reasons.isEmpty()) {
            reasons.add("La lectura visual es razonable, pero siempre puede cambiar con nuevas evidencias");
        }
        reasons.add("Resultado orientativo: probablemente " + (confidence >= 0.5 ? "con fiabilidad media" : "con fiabilidad limitada") + ", no definitivo");
        return String.join(". ", reasons) + ".";
    }

    private double voteWeight(String choice, User voter) {
        double base = C_UNCERTAIN.equals(choice) ? 0.6 : 1.0;
        if (voter == null) {
            return base;
        }
        double reputation = 0.7 + (computeReputationScore(voter.getId()) / 100.0);
        double expertise = 0.7 + (computeExpertiseScore(voter.getId()) / 100.0);
        return base * reputation * expertise;
    }

    private double computeReputationScore(UUID userId) {
        long total = tarantulaRepository.countByUserId(userId);
        long species = tarantulaRepository.countDistinctSpeciesByUserId(userId);
        long events = feedingLogRepository.countByOwnerUserId(userId)
                + moltLogRepository.countByOwnerUserId(userId)
                + behaviorLogRepository.countByOwnerUserId(userId);
        return Math.min(100.0, (total * 2.0) + (species * 3.0) + Math.min(30.0, events / 5.0));
    }

    private double computeExpertiseScore(UUID userId) {
        long species = tarantulaRepository.countDistinctSpeciesByUserId(userId);
        long molts = moltLogRepository.countByOwnerUserId(userId);
        double score = Math.min(100.0, (species * 5.0) + Math.min(50.0, molts * 1.2));
        return score;
    }

    private double clamp01(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }

    private int clampSize(int size) {
        if (size < 1) {
            return 20;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }

    @Transactional
    public int settleDueCases() {
        Instant now = Instant.now();
        int changed = 0;
        List<SexIdCase> openCases = sexIdCaseRepository.findByHiddenAtIsNullAndStatus(S_OPEN);
        for (SexIdCase c : openCases) {
            if (shouldCloseEarly(c, now)) {
                resolveCase(c, now);
                sexIdCaseRepository.save(c);
                changed++;
                continue;
            }
            if (c.getVotingClosesAt() != null && now.isAfter(c.getVotingClosesAt()) && attemptExtension(c, now)) {
                sexIdCaseRepository.save(c);
                changed++;
                continue;
            }
            if (c.getVotingClosesAt() != null && now.isAfter(c.getVotingClosesAt())) {
                resolveCase(c, now);
                sexIdCaseRepository.save(c);
                changed++;
            }
        }
        return changed;
    }

    private boolean attemptExtension(SexIdCase c, Instant now) {
        Aggregates ag = aggregateForCase(c.getId());
        int totalVotes = (int) Math.round(ag.rawVotes);
        if (totalVotes < MIN_RESOLUTION_VOTES) {
            return false;
        }
        double totalWeighted = ag.male + ag.female + ag.uncertain;
        if (totalWeighted <= 0) {
            return false;
        }
        double first = Math.max(ag.male, Math.max(ag.female, ag.uncertain));
        double second = secondHighest(ag.male, ag.female, ag.uncertain);
        double gap = (first - second) / totalWeighted;
        Instant baseMaxClose = c.getCreatedAt().plus(BASE_VOTING_WINDOW).plus(EXTENSION_WINDOW);
        if (gap < TIE_EXTENSION_THRESHOLD && c.getVotingClosesAt().isBefore(baseMaxClose)) {
            c.setVotingClosesAt(c.getVotingClosesAt().plus(EXTENSION_WINDOW));
            return true;
        }
        return false;
    }

    private boolean shouldCloseEarly(SexIdCase c, Instant now) {
        if (c.getCreatedAt() == null) {
            return false;
        }
        Duration age = Duration.between(c.getCreatedAt(), now);
        if (age.compareTo(MIN_EARLY_CLOSE_AGE) < 0) {
            return false;
        }
        Aggregates ag = aggregateForCase(c.getId());
        int totalVotes = (int) Math.round(ag.rawVotes);
        if (totalVotes < EARLY_CLOSE_MIN_VOTES) {
            return false;
        }
        double totalWeighted = ag.male + ag.female + ag.uncertain;
        if (totalWeighted <= 0) {
            return false;
        }
        double first = Math.max(ag.male, Math.max(ag.female, ag.uncertain));
        return (first / totalWeighted) >= EARLY_CLOSE_MIN_CONFIDENCE;
    }

    private void resolveCase(SexIdCase c, Instant now) {
        Aggregates ag = aggregateForCase(c.getId());
        FinalResolution resolution = computeResolution(c, ag);
        c.setStatus(resolution.expired ? S_EXPIRED : S_RESOLVED);
        c.setLockedAt(now);
        c.setResolvedAt(now);
        c.setResolutionChoice(resolution.choice);
        c.setResolutionConfidence(round3(resolution.score));
        c.setResolutionConfidenceLabel(resolution.confidenceLabel);
        c.setVotingClosesAt(now);
        settlePointsAndNotify(c, resolution, now);
        c.setSettledAt(now);
    }

    private FinalResolution computeResolution(SexIdCase c, Aggregates ag) {
        int totalVotes = (int) Math.round(ag.rawVotes);
        double totalWeighted = ag.male + ag.female + ag.uncertain;
        if (totalVotes < MIN_RESOLUTION_VOTES || totalWeighted <= 0) {
            return new FinalResolution(C_UNCERTAIN, 0.0, "low", true);
        }
        double aiMale = c.getAiMaleProbability() == null ? 0.5 : clamp01(c.getAiMaleProbability());
        double aiFemale = 1.0 - aiMale;
        double communityMale = ag.male / totalWeighted;
        double communityFemale = ag.female / totalWeighted;
        double finalMale = (communityMale * COMMUNITY_WEIGHT) + (aiMale * AI_WEIGHT);
        double finalFemale = (communityFemale * COMMUNITY_WEIGHT) + (aiFemale * AI_WEIGHT);
        double score = Math.max(finalMale, finalFemale);
        String label = labelFromConfidence(score);
        String choice;
        if (Math.abs(finalMale - finalFemale) < UNCERTAIN_MARGIN) {
            choice = C_UNCERTAIN;
        } else {
            choice = finalFemale >= finalMale ? C_FEMALE : C_MALE;
        }
        boolean expired = score < MIN_RESOLVE_CONFIDENCE;
        return new FinalResolution(choice, score, label, expired);
    }

    private void settlePointsAndNotify(SexIdCase c, FinalResolution resolution, Instant now) {
        List<SexIdCaseVote> votes = sexIdCaseVoteRepository.findByCaseId(c.getId());
        Map<UUID, String> latestChoiceByUser = new HashMap<>();
        for (SexIdCaseVote vote : votes) {
            latestChoiceByUser.put(vote.getVoterUserId(), vote.getChoice());
        }
        for (Map.Entry<UUID, String> e : latestChoiceByUser.entrySet()) {
            UUID voterId = e.getKey();
            String choice = e.getValue();
            int gained = 0;
            if (!resolution.expired) {
                gained += sexIdPointService.awardIfMissing(voterId, c.getId(), "PARTICIPATION", POINTS_PARTICIPATION);
                if (resolution.choice.equals(choice)) {
                    gained += sexIdPointService.awardIfMissing(voterId, c.getId(), "ACCURATE", POINTS_ACCURATE);
                    if (resolution.score >= HIGH_CONFIDENCE_SCORE) {
                        gained += sexIdPointService.awardIfMissing(voterId, c.getId(), "HIGH_CONFIDENCE", POINTS_HIGH_CONFIDENCE_BONUS);
                    }
                }
            }
            notificationService.create(
                    voterId,
                    c.getAuthorUserId(),
                    "SEX_ID_RESOLVED",
                    "Caso Sex ID resuelto",
                    resolution.expired
                            ? "El caso cerro sin consenso fuerte"
                            : "Resultado final: " + resolution.choice + (gained > 0 ? " | +" + gained + " puntos" : ""),
                    Map.of(
                            "caseId", String.valueOf(c.getId()),
                            "status", resolution.expired ? S_EXPIRED : S_RESOLVED,
                            "resolutionChoice", resolution.choice,
                            "resolutionScore", round3(resolution.score),
                            "pointsAwarded", gained,
                            "resolvedAt", now.toString(),
                            "route", "/sex-id/" + c.getId()
                    )
            );
        }
        notificationService.create(
                c.getAuthorUserId(),
                null,
                "SEX_ID_CASE_CLOSED",
                "Tu caso Sex ID cerro",
                resolution.expired
                        ? "No hubo votos/confiabilidad suficientes para resolverlo"
                        : "Resultado final: " + resolution.choice + " (" + resolution.confidenceLabel + ")",
                Map.of(
                        "caseId", String.valueOf(c.getId()),
                        "status", resolution.expired ? S_EXPIRED : S_RESOLVED,
                        "resolutionChoice", resolution.choice,
                        "resolutionScore", round3(resolution.score),
                        "route", "/sex-id/" + c.getId()
                )
        );
    }

    private double secondHighest(double a, double b, double c) {
        if ((a >= b && a <= c) || (a >= c && a <= b)) return a;
        if ((b >= a && b <= c) || (b >= c && b <= a)) return b;
        return c;
    }

    private static final class Aggregates {
        final double male;
        final double female;
        final double uncertain;
        final double rawVotes;

        Aggregates(double male, double female, double uncertain, double rawVotes) {
            this.male = male;
            this.female = female;
            this.uncertain = uncertain;
            this.rawVotes = rawVotes;
        }
    }

    private static final class HeuristicResult {
        final double maleProbability;
        final double confidence;
        final String confidenceLabel;
        final String explanation;

        HeuristicResult(double maleProbability, double confidence, String confidenceLabel, String explanation) {
            this.maleProbability = maleProbability;
            this.confidence = confidence;
            this.confidenceLabel = confidenceLabel;
            this.explanation = explanation;
        }
    }

    private static final class FinalResolution {
        final String choice;
        final double score;
        final String confidenceLabel;
        final boolean expired;

        FinalResolution(String choice, double score, String confidenceLabel, boolean expired) {
            this.choice = choice;
            this.score = score;
            this.confidenceLabel = confidenceLabel;
            this.expired = expired;
        }
    }
}
