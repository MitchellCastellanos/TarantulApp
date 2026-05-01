package com.tarantulapp.service;

import com.tarantulapp.dto.CollectionInsightsResponse;
import com.tarantulapp.repository.FeedingLogRepository;
import com.tarantulapp.repository.MoltLogRepository;
import com.tarantulapp.repository.TarantulaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InsightsServiceTest {

    @Mock FeedingLogRepository feedingLogRepository;
    @Mock MoltLogRepository moltLogRepository;
    @Mock TarantulaRepository tarantulaRepository;

    @InjectMocks InsightsService insightsService;

    @Test
    void aggregatesWeeklyBucketsFeedingAttentionAndTotals() {
        UUID uid = UUID.randomUUID();
        when(tarantulaRepository.countByUserIdAndDeceasedAtIsNull(uid)).thenReturn(2L);
        when(feedingLogRepository.countByOwnerUserId(uid)).thenReturn(9L);
        when(moltLogRepository.countByOwnerUserId(uid)).thenReturn(1L);
        when(feedingLogRepository.countSuccessfulFeedingsSince(eq(uid), any())).thenReturn(4L);
        when(moltLogRepository.countMoltsSince(eq(uid), any())).thenReturn(3L);

        Instant w = Instant.parse("2024-01-08T00:00:00Z");
        when(feedingLogRepository.countSuccessfulFeedingsByWeekNative(eq(uid), any()))
                .thenReturn(List.<Object[]>of(new Object[]{Timestamp.from(w), 7L}));
        when(moltLogRepository.countMoltsByWeekNative(eq(uid), any()))
                .thenReturn(List.<Object[]>of(new Object[]{Timestamp.from(w), 2L}));

        UUID tid = UUID.randomUUID();
        when(tarantulaRepository.findFeedingAttentionRows(uid))
                .thenReturn(List.<Object[]>of(new Object[]{tid, "Ada", "x1y2z3", null}));

        CollectionInsightsResponse r = insightsService.getCollectionInsights(uid);
        assertThat(r.getFeedsLast30Days()).isEqualTo(4L);
        assertThat(r.getMoltsLast90Days()).isEqualTo(3L);
        assertThat(r.getFeedingsByWeek()).hasSize(1);
        assertThat(r.getFeedingsByWeek().get(0).getCount()).isEqualTo(7);
        assertThat(r.getMoltsByWeek().get(0).getCount()).isEqualTo(2);
        assertThat(r.getFeedingAttention()).hasSize(1);
        assertThat(r.getFeedingAttention().get(0).getName()).isEqualTo("Ada");
        assertThat(r.getFeedingAttention().get(0).getLastFedAt()).isNull();
        assertThat(r.getFeedingAttention().get(0).getDaysSinceLastFeed()).isNull();
    }
}
