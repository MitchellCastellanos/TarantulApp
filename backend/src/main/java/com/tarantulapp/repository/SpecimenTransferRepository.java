package com.tarantulapp.repository;

import com.tarantulapp.entity.SpecimenTransfer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SpecimenTransferRepository extends JpaRepository<SpecimenTransfer, UUID> {

    Optional<SpecimenTransfer> findByPassportIdAndStatus(UUID passportId, String status);

    List<SpecimenTransfer> findByToEmailIgnoreCaseAndStatusOrderByCreatedAtDesc(String toEmail, String status);

    List<SpecimenTransfer> findByFromUserIdOrderByCreatedAtDesc(UUID fromUserId);

    List<SpecimenTransfer> findByPassportIdOrderByCreatedAtDesc(UUID passportId);
}
