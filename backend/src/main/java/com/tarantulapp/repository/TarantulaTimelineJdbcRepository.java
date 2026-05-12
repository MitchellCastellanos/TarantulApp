package com.tarantulapp.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Merged timeline (feeding + molt + behavior) with SQL-level sort and pagination.
 * Uses portable casts compatible with PostgreSQL and H2 ({@code MODE=PostgreSQL} in tests).
 */
@Repository
public class TarantulaTimelineJdbcRepository {

    private static final String COUNT_SQL = """
            SELECT (
                (SELECT COUNT(*) FROM feeding_logs WHERE tarantula_id = CAST(? AS UUID))
              + (SELECT COUNT(*) FROM molt_logs WHERE tarantula_id = CAST(? AS UUID))
              + (SELECT COUNT(*) FROM behavior_logs WHERE tarantula_id = CAST(? AS UUID))
            ) AS c
            """;

    private static final String SLICE_SQL = """
            SELECT ev_type, ev_id, ev_at, feed_accepted, feed_qty, feed_prey_type, feed_prey_size, feed_notes,
                   molt_pre, molt_post, molt_notes, molt_successful, molt_comp, molt_dur, beh_mood, beh_notes
            FROM (
                SELECT
                    'feeding' AS ev_type,
                    CAST(f.id AS VARCHAR(36)) AS ev_id,
                    f.fed_at AS ev_at,
                    f.accepted AS feed_accepted,
                    f.quantity AS feed_qty,
                    f.prey_type AS feed_prey_type,
                    f.prey_size AS feed_prey_size,
                    f.notes AS feed_notes,
                    CAST(NULL AS DECIMAL(10,1)) AS molt_pre,
                    CAST(NULL AS DECIMAL(10,1)) AS molt_post,
                    CAST(NULL AS VARCHAR(500)) AS molt_notes,
                    CAST(NULL AS BOOLEAN) AS molt_successful,
                    CAST(NULL AS VARCHAR(50)) AS molt_comp,
                    CAST(NULL AS INTEGER) AS molt_dur,
                    CAST(NULL AS VARCHAR(30)) AS beh_mood,
                    CAST(NULL AS VARCHAR(500)) AS beh_notes
                FROM feeding_logs f
                WHERE f.tarantula_id = CAST(? AS UUID)
                UNION ALL
                SELECT
                    'molt',
                    CAST(m.id AS VARCHAR(36)),
                    m.molted_at,
                    CAST(NULL AS BOOLEAN),
                    CAST(NULL AS INTEGER),
                    CAST(NULL AS VARCHAR(50)),
                    CAST(NULL AS VARCHAR(20)),
                    CAST(NULL AS VARCHAR(500)),
                    m.pre_size_cm,
                    m.post_size_cm,
                    m.notes,
                    m.successful,
                    m.complication_type,
                    m.duration_minutes,
                    CAST(NULL AS VARCHAR(30)),
                    CAST(NULL AS VARCHAR(500))
                FROM molt_logs m
                WHERE m.tarantula_id = CAST(? AS UUID)
                UNION ALL
                SELECT
                    'behavior',
                    CAST(b.id AS VARCHAR(36)),
                    b.logged_at,
                    CAST(NULL AS BOOLEAN),
                    CAST(NULL AS INTEGER),
                    CAST(NULL AS VARCHAR(50)),
                    CAST(NULL AS VARCHAR(20)),
                    CAST(NULL AS VARCHAR(500)),
                    CAST(NULL AS DECIMAL(10,1)),
                    CAST(NULL AS DECIMAL(10,1)),
                    CAST(NULL AS VARCHAR(500)),
                    CAST(NULL AS BOOLEAN),
                    CAST(NULL AS VARCHAR(50)),
                    CAST(NULL AS INTEGER),
                    b.mood,
                    b.notes
                FROM behavior_logs b
                WHERE b.tarantula_id = CAST(? AS UUID)
            ) merged
            ORDER BY merged.ev_at DESC
            LIMIT ? OFFSET ?
            """;

    private final JdbcTemplate jdbcTemplate;

    public TarantulaTimelineJdbcRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public long countEvents(UUID tarantulaId) {
        Long n = jdbcTemplate.queryForObject(COUNT_SQL, Long.class, tarantulaId, tarantulaId, tarantulaId);
        return n != null ? n : 0L;
    }

    public List<Map<String, Object>> fetchSlice(UUID tarantulaId, int limit, int offset) {
        return jdbcTemplate.queryForList(SLICE_SQL, tarantulaId, tarantulaId, tarantulaId, limit, offset);
    }
}
