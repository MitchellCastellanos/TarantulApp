package com.tarantulapp.service;

import com.tarantulapp.repository.PassportRepository;
import com.tarantulapp.repository.TarantulaRepository;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class ShortIdService {

    private final PassportRepository passportRepository;
    private final TarantulaRepository tarantulaRepository;

    public ShortIdService(PassportRepository passportRepository, TarantulaRepository tarantulaRepository) {
        this.passportRepository = passportRepository;
        this.tarantulaRepository = tarantulaRepository;
    }

    /** 8-char hex slug; unique across passports and legacy tarantula rows during transition. */
    public String generateUniqueShortId() {
        for (int attempts = 0; attempts < 10; attempts++) {
            String id = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
            if (!passportRepository.existsByShortId(id) && !tarantulaRepository.existsByShortId(id)) {
                return id;
            }
        }
        throw new IllegalStateException("No se pudo generar un short_id único");
    }
}
