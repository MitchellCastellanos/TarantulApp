package com.tarantulapp.repository;

import com.tarantulapp.entity.SpeciesSynonym;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SpeciesSynonymRepository extends JpaRepository<SpeciesSynonym, Integer> {
    boolean existsBySynonymIgnoreCase(String synonym);
    Optional<SpeciesSynonym> findBySynonymIgnoreCase(String synonym);
    List<SpeciesSynonym> findAllBySpeciesId(Integer speciesId);
}
