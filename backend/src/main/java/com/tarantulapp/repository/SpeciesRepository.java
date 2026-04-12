package com.tarantulapp.repository;

import com.tarantulapp.entity.Species;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SpeciesRepository extends JpaRepository<Species, Integer> {
    List<Species> findByScientificNameContainingIgnoreCaseOrCommonNameContainingIgnoreCase(
            String scientific, String common);

    Optional<Species> findByScientificNameIgnoreCase(String scientificName);
}
