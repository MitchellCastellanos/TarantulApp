package com.tarantulapp.service;

import com.tarantulapp.entity.SexIdPointAward;
import com.tarantulapp.repository.SexIdPointAwardRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class SexIdPointService {

    private final SexIdPointAwardRepository sexIdPointAwardRepository;

    public SexIdPointService(SexIdPointAwardRepository sexIdPointAwardRepository) {
        this.sexIdPointAwardRepository = sexIdPointAwardRepository;
    }

    @Transactional
    public int awardIfMissing(UUID userId, UUID caseId, String reason, int points) {
        if (userId == null || caseId == null || reason == null || reason.isBlank() || points <= 0) {
            return 0;
        }
        SexIdPointAward award = new SexIdPointAward();
        award.setUserId(userId);
        award.setCaseId(caseId);
        award.setReason(reason.trim().toUpperCase());
        award.setPoints(points);
        try {
            sexIdPointAwardRepository.save(award);
            return points;
        } catch (DataIntegrityViolationException ignored) {
            return 0;
        }
    }
}
