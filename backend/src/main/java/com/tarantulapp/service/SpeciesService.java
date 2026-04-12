package com.tarantulapp.service;

import com.tarantulapp.dto.SpeciesDTO;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.SpeciesRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SpeciesService {

    private final SpeciesRepository speciesRepository;

    public SpeciesService(SpeciesRepository speciesRepository) {
        this.speciesRepository = speciesRepository;
    }

    public List<SpeciesDTO> findAll() {
        return speciesRepository.findAll().stream()
                .map(SpeciesDTO::from)
                .collect(Collectors.toList());
    }

    public SpeciesDTO findById(Integer id) {
        return speciesRepository.findById(id)
                .map(SpeciesDTO::from)
                .orElseThrow(() -> new NotFoundException("Especie no encontrada"));
    }

    public List<SpeciesDTO> search(String query) {
        if (query == null || query.isBlank()) return findAll();
        return speciesRepository
                .findByScientificNameContainingIgnoreCaseOrCommonNameContainingIgnoreCase(query, query)
                .stream().map(SpeciesDTO::from).collect(Collectors.toList());
    }
}
