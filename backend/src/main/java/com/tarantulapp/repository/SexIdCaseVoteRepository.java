package com.tarantulapp.repository;

import com.tarantulapp.entity.SexIdCaseVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SexIdCaseVoteRepository extends JpaRepository<SexIdCaseVote, UUID> {

    Optional<SexIdCaseVote> findByCaseIdAndVoterUserId(UUID caseId, UUID voterUserId);

    @Query("select v.choice, count(v) from SexIdCaseVote v where v.caseId = :caseId group by v.choice")
    List<Object[]> countByChoiceForCase(@Param("caseId") UUID caseId);

    @Query("select count(v) from SexIdCaseVote v where v.caseId = :caseId")
    long countByCaseId(@Param("caseId") UUID caseId);

    @Query("select v.caseId, count(v) from SexIdCaseVote v where v.caseId in :ids group by v.caseId")
    List<Object[]> countTotalsByCaseIdIn(@Param("ids") List<UUID> ids);
}
