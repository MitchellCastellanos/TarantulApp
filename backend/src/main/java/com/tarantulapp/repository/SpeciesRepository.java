package com.tarantulapp.repository;

import com.tarantulapp.entity.Species;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SpeciesRepository extends JpaRepository<Species, Integer>, JpaSpecificationExecutor<Species> {

    Optional<Species> findByScientificNameIgnoreCase(String scientificName);

    Optional<Species> findByGbifUsageKey(Long gbifUsageKey);

    List<Species> findByGbifUsageKeyIsNotNull();

    /** Busca por nombre científico, nombre común o cualquier sinónimo registrado. */
    @Query(value = """
            SELECT DISTINCT s.* FROM species s
            LEFT JOIN species_synonyms syn ON syn.species_id = s.id
            WHERE LOWER(s.scientific_name) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(s.common_name)     LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(syn.synonym)       LIKE LOWER(CONCAT('%', :q, '%'))
            """, nativeQuery = true)
    List<Species> searchIncludingSynonyms(@Param("q") String q);
}
