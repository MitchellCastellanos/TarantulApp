package com.tarantulapp.service;

import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TarantulaCollectionVisibilityTest {

    @Mock
    private TarantulaRepository tarantulaRepository;
    @Mock
    private UserRepository userRepository;

    private TarantulaService tarantulaService;

    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        tarantulaService = new TarantulaService(
                tarantulaRepository,
                null, null, null, null,
                null, null, null, null,
                userRepository, null, null, null, null,
                null, null, null);
    }

    @Test
    void bulkSetVisibilityUpdatesUserDefaultAndAllSpiders() {
        User user = new User();
        user.setId(userId);
        user.setDefaultTarantulaPublic(false);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(tarantulaRepository.setVisibilityByUserId(userId, true)).thenReturn(4);

        Map<String, Object> out = tarantulaService.bulkSetVisibility(userId, true);

        assertEquals(4, out.get("updatedCount"));
        assertEquals(true, out.get("isPublic"));
        assertEquals(true, out.get("defaultTarantulaPublic"));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertTrue(saved.getValue().getDefaultTarantulaPublic());
        verify(tarantulaRepository).setVisibilityByUserId(eq(userId), eq(true));
    }

    @Test
    void bulkSetVisibilityThrowsWhenUserMissing() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        assertThrows(NotFoundException.class, () -> tarantulaService.bulkSetVisibility(userId, false));
    }
}
