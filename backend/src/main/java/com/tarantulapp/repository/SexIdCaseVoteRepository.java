package com.tarantulapp.repository;

import com.tarantulapp.entity.SexIdCaseVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SexIdCaseVoteRepository extends JpaRepository<SexIdCaseVote, UUID> {

    List<SexIdCaseVote> findByCaseId(UUID caseId);

    Optional<SexIdCaseVote> findByCaseIdAndVoterUserId(UUID caseId, UUID voterUserId);

    @Query("select v.choice, count(v) from SexIdCaseVote v where v.caseId = :caseId group by v.choice")
    List<Object[]> countByChoiceForCase(@Param("caseId") UUID caseId);

    @Query("select count(v) from SexIdCaseVote v where v.caseId = :caseId")
    long countByCaseId(@Param("caseId") UUID caseId);

    @Query("select v.caseId, count(v) from SexIdCaseVote v where v.caseId in :ids group by v.caseId")
    List<Object[]> countTotalsByCaseIdIn(@Param("ids") List<UUID> ids);

    @Query("select distinct v.voterUserId from SexIdCaseVote v where v.caseId = :caseId")
    List<UUID> findDistinctVoterIdsByCaseId(@Param("caseId") UUID caseId);

    long countByVoterUserId(UUID voterUserId);

    @Query("""
            select count(v)
            from SexIdCaseVote v
            join SexIdCase c on c.id = v.caseId
            where v.voterUserId = :voterUserId
              and c.status in ('RESOLVED', 'EXPIRED')
            """)
    long countSettledByVoterUserId(@Param("voterUserId") UUID voterUserId);

    @Query("""
            select count(v)
            from SexIdCaseVote v
            join SexIdCase c on c.id = v.caseId
            where v.voterUserId = :voterUserId
              and c.status = 'RESOLVED'
              and c.resolutionChoice = v.choice
            """)
    long countCorrectResolvedByVoterUserId(@Param("voterUserId") UUID voterUserId);
}
