package com.tarantulapp.repository;

import com.tarantulapp.entity.Species;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpeciesRepository extends JpaRepository<Species, Integer> {
    List<Species> findByScientificNameContainingIgnoreCaseOrCommonNameContainingIgnoreCase(
            String scientific, String common);
}
