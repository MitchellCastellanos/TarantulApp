package com.tarantulapp.repository;

import com.tarantulapp.entity.SpeciesTradeNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SpeciesTradeNoteRepository extends JpaRepository<SpeciesTradeNote, UUID> {

    List<SpeciesTradeNote> findBySpeciesIdOrderByCountryAsc(Integer speciesId);

    Optional<SpeciesTradeNote> findBySpeciesIdAndCountryIgnoreCase(Integer speciesId, String country);

    void deleteBySpeciesIdAndCountryIgnoreCase(Integer speciesId, String country);
}
