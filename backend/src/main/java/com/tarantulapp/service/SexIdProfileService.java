package com.tarantulapp.service;

import com.tarantulapp.repository.SexIdCaseRepository;
import com.tarantulapp.repository.SexIdCaseVoteRepository;
import com.tarantulapp.repository.SexIdPointAwardRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SexIdProfileService {

    private final SexIdPointAwardRepository sexIdPointAwardRepository;
    private final SexIdCaseVoteRepository sexIdCaseVoteRepository;
    private final SexIdCaseRepository sexIdCaseRepository;

    public SexIdProfileService(SexIdPointAwardRepository sexIdPointAwardRepository,
                               SexIdCaseVoteRepository sexIdCaseVoteRepository,
                               SexIdCaseRepository sexIdCaseRepository) {
        this.sexIdPointAwardRepository = sexIdPointAwardRepository;
        this.sexIdCaseVoteRepository = sexIdCaseVoteRepository;
        this.sexIdCaseRepository = sexIdCaseRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> publicStats(UUID userId) {
        int totalPoints = sexIdPointAwardRepository.totalForUser(userId);
        long totalVotes = sexIdCaseVoteRepository.countByVoterUserId(userId);
        long settledVotes = sexIdCaseVoteRepository.countSettledByVoterUserId(userId);
        long correctResolvedVotes = sexIdCaseVoteRepository.countCorrectResolvedByVoterUserId(userId);
        long authoredCases = sexIdCaseRepository.countByAuthorUserId(userId);
        long authoredResolved = sexIdCaseRepository.countByAuthorUserIdAndStatus(userId, "RESOLVED");
        long authoredExpired = sexIdCaseRepository.countByAuthorUserIdAndStatus(userId, "EXPIRED");

        int accuracyPct = settledVotes <= 0 ? 0 : (int) Math.round((correctResolvedVotes * 100.0) / settledVotes);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("points", totalPoints);
        out.put("totalVotes", totalVotes);
        out.put("settledVotes", settledVotes);
        out.put("correctResolvedVotes", correctResolvedVotes);
        out.put("accuracyPct", accuracyPct);
        out.put("authoredCases", authoredCases);
        out.put("authoredResolved", authoredResolved);
        out.put("authoredExpired", authoredExpired);
        out.put("level", levelKeyFromPoints(totalPoints));
        out.put("achievements", buildAchievements(totalPoints, totalVotes, correctResolvedVotes, accuracyPct, authoredResolved));
        return out;
    }

    private String levelKeyFromPoints(int points) {
        if (points >= 500) return "oracle";
        if (points >= 250) return "expert";
        if (points >= 100) return "adept";
        if (points >= 30) return "apprentice";
        return "rookie";
    }

    private List<Map<String, Object>> buildAchievements(int points,
                                                        long totalVotes,
                                                        long correctResolvedVotes,
                                                        int accuracyPct,
                                                        long authoredResolved) {
        List<Map<String, Object>> items = new ArrayList<>();
        if (points >= 30) {
            items.add(achievement("first_30_points", "first_30_points"));
        }
        if (points >= 100) {
            items.add(achievement("century_club", "century_club"));
        }
        if (totalVotes >= 25) {
            items.add(achievement("community_eye", "community_eye"));
        }
        if (correctResolvedVotes >= 15 && accuracyPct >= 70) {
            items.add(achievement("sharp_classifier", "sharp_classifier"));
        }
        if (authoredResolved >= 10) {
            items.add(achievement("trusted_submitter", "trusted_submitter"));
        }
        return items;
    }

    private Map<String, Object> achievement(String key, String labelKey) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("key", key);
        m.put("labelKey", labelKey);
        return m;
    }
}
