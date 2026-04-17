package com.tarantulapp.service;

import com.tarantulapp.entity.Tarantula;
import com.tarantulapp.entity.User;
import com.tarantulapp.entity.UserPlan;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.exception.ReadOnlyModeException;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PlanAccessService {

    /** Cupo editable en plan Free (sin Pro ni prueba activa). Las siguientes quedan solo lectura. */
    public static final int FREE_TARANTULA_LIMIT = 6;

    private final UserRepository userRepository;
    private final TarantulaRepository tarantulaRepository;

    public PlanAccessService(UserRepository userRepository, TarantulaRepository tarantulaRepository) {
        this.userRepository = userRepository;
        this.tarantulaRepository = tarantulaRepository;
    }

    /** PRO o periodo de prueba activo: sin bloqueo por cupo en ninguna tarántula. */
    public boolean hasProFeatures(User user) {
        if (user.getPlan() == UserPlan.PRO) {
            return true;
        }
        return isTrialActive(user);
    }

    public boolean isTrialActive(User user) {
        if (user.getTrialEndsAt() == null) {
            return false;
        }
        return LocalDateTime.now().isBefore(user.getTrialEndsAt());
    }

    /**
     * IDs de tarántulas que exceden el cupo de 6 en Free (las 6 más antiguas por fecha de creación son editables).
     * Vacío si hay Pro o prueba activa.
     */
    public Set<UUID> lockedTarantulaIds(User user) {
        if (hasProFeatures(user)) {
            return Collections.emptySet();
        }
        List<Tarantula> ordered = tarantulaRepository.findByUserIdOrderByCreatedAtAscIdAsc(user.getId());
        if (ordered.size() <= FREE_TARANTULA_LIMIT) {
            return Collections.emptySet();
        }
        return ordered.subList(FREE_TARANTULA_LIMIT, ordered.size()).stream()
                .map(Tarantula::getId)
                .collect(Collectors.toCollection(HashSet::new));
    }

    public boolean isTarantulaLocked(User user, UUID tarantulaId) {
        return lockedTarantulaIds(user).contains(tarantulaId);
    }

    /** Hay más de 6 ejemplares y el usuario está en Free sin prueba (hay al menos una tarántula bloqueada). */
    public boolean hasExcessLockedTarantulas(User user) {
        return !lockedTarantulaIds(user).isEmpty();
    }

    /** Compatibilidad API: ya no hay “solo lectura global” por cuenta; solo por tarántula. */
    public boolean isReadOnly(User user) {
        return false;
    }

    public boolean isStrictReadOnly(User user) {
        return false;
    }

    public boolean isOverFreeTierLimit(User user) {
        return hasExcessLockedTarantulas(user);
    }

    public void enforceTarantulaWrite(UUID userId, UUID tarantulaId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        if (isTarantulaLocked(user, tarantulaId)) {
            throw new ReadOnlyModeException(
                    "Esta tarántula está fuera del cupo de 6 del plan gratuito. Edita solo las 6 más antiguas, elimina ejemplares o pasa a Pro.");
        }
    }

}
