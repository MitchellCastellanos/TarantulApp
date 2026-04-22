package com.tarantulapp.service;

import com.tarantulapp.entity.SexIdCase;
import com.tarantulapp.entity.SexIdCaseVote;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.SexIdCaseRepository;
import com.tarantulapp.repository.SexIdCaseVoteRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    private final SexIdCaseRepository sexIdCaseRepository;
    private final SexIdCaseVoteRepository sexIdCaseVoteRepository;
    private final UserRepository userRepository;

    public SexIdCaseService(SexIdCaseRepository sexIdCaseRepository,
                            SexIdCaseVoteRepository sexIdCaseVoteRepository,
                            UserRepository userRepository) {
        this.sexIdCaseRepository = sexIdCaseRepository;
        this.sexIdCaseVoteRepository = sexIdCaseVoteRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Map<String, Object> create(UUID authorId, String title, String imageUrl, String speciesHint) {
        String img = cleanText(imageUrl, 500);
        if (img == null) {
            throw new IllegalArgumentException("Imagen requerida");
        }
        SexIdCase c = new SexIdCase();
        c.setAuthorUserId(authorId);
        c.setTitle(cleanText(title, 200));
        c.setImageUrl(img);
        c.setSpeciesHint(cleanText(speciesHint, 200));
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
        return getPublicCase(caseId, Optional.of(voterId));
    }

    private Aggregates aggregateForCase(UUID caseId) {
        List<Object[]> rows = sexIdCaseVoteRepository.countByChoiceForCase(caseId);
        int male = 0;
        int female = 0;
        int unc = 0;
        for (Object[] row : rows) {
            String ch = (String) row[0];
            int cnt = ((Number) row[1]).intValue();
            if (C_MALE.equals(ch)) {
                male = cnt;
            } else if (C_FEMALE.equals(ch)) {
                female = cnt;
            } else if (C_UNCERTAIN.equals(ch)) {
                unc = cnt;
            }
        }
        return new Aggregates(male, female, unc);
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
        int total = ag.male + ag.female + ag.uncertain;
        Map<String, Object> tallies = new LinkedHashMap<>();
        tallies.put(C_MALE, ag.male);
        tallies.put(C_FEMALE, ag.female);
        tallies.put(C_UNCERTAIN, ag.uncertain);
        Map<String, Object> pct = new LinkedHashMap<>();
        pct.put(C_MALE, total == 0 ? 0 : Math.round(100.0 * ag.male / total));
        pct.put(C_FEMALE, total == 0 ? 0 : Math.round(100.0 * ag.female / total));
        pct.put(C_UNCERTAIN, total == 0 ? 0 : Math.round(100.0 * ag.uncertain / total));
        int max = Math.max(ag.male, Math.max(ag.female, ag.uncertain));
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
        double confidence = total == 0 ? 0.0 : (double) max / (double) total;

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", c.getId());
        out.put("title", c.getTitle() == null ? "" : c.getTitle());
        out.put("imageUrl", c.getImageUrl());
        out.put("speciesHint", c.getSpeciesHint() == null ? "" : c.getSpeciesHint());
        out.put("authorUserId", c.getAuthorUserId());
        out.put("authorDisplayName", display);
        out.put("createdAt", c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
        out.put("totals", tallies);
        out.put("totalVotes", total);
        out.put("percentages", pct);
        out.put("leadingChoice", leading);
        out.put("confidence", round3(confidence));

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

    private int clampSize(int size) {
        if (size < 1) {
            return 20;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private static final class Aggregates {
        final int male;
        final int female;
        final int uncertain;

        Aggregates(int male, int female, int uncertain) {
            this.male = male;
            this.female = female;
            this.uncertain = uncertain;
        }
    }
}
