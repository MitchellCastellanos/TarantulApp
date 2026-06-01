package com.tarantulapp.service;

import com.tarantulapp.entity.Passport;
import com.tarantulapp.repository.InventoryAdjustmentRepository;
import com.tarantulapp.repository.PassportRepository;
import com.tarantulapp.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class AdminLabelsServiceTest {

    @Mock private PassportRepository passportRepository;
    @Mock private UserRepository userRepository;
    @Mock private InventoryAdjustmentRepository adjustmentRepository;

    private AdminLabelsService service;
    private final Instant now = Instant.now();

    @BeforeEach
    void setUp() {
        service = new AdminLabelsService(passportRepository, userRepository, adjustmentRepository);
    }

    private Passport passport(Instant claimedAt, boolean confirmed) {
        Passport p = new Passport();
        p.setId(UUID.randomUUID());
        p.setClaimedAt(claimedAt);
        lenient().when(adjustmentRepository.existsByPassportIdAndReason(eq(p.getId()), any())).thenReturn(confirmed);
        return p;
    }

    @Test
    void unclaimedIsGrey() {
        Passport p = passport(null, false);
        assertEquals("UNCLAIMED", service.statusOf(p, now));
        assertEquals("grey", AdminLabelsService.colorOf("UNCLAIMED"));
    }

    @Test
    void confirmedIsGreen() {
        Passport p = passport(now.minus(5, ChronoUnit.HOURS), true);
        assertEquals("CONFIRMED", service.statusOf(p, now));
        assertEquals("green", AdminLabelsService.colorOf("CONFIRMED"));
    }

    @Test
    void recentUnconfirmedIsPendingYellow() {
        Passport p = passport(now.minus(30, ChronoUnit.MINUTES), false);
        assertEquals("PENDING", service.statusOf(p, now));
        assertEquals("yellow", AdminLabelsService.colorOf("PENDING"));
    }

    @Test
    void staleUnconfirmedIsOverdueRed() {
        Passport p = passport(now.minus(3, ChronoUnit.HOURS), false);
        assertEquals("OVERDUE", service.statusOf(p, now));
        assertEquals("red", AdminLabelsService.colorOf("OVERDUE"));
    }
}
