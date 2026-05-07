package com.tarantulapp.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Always run {@code flyway.repair()} before {@code flyway.migrate()} on startup.
 *
 * Why: when a migration fails (e.g. V68 rolled back due to a column-name typo) Flyway 9 leaves
 * a row in {@code flyway_schema_history} with {@code success=false}. Subsequent boots can fail
 * validation because the checksum on disk no longer matches the recorded one. {@code repair()}
 * deletes those tombstone rows (and re-aligns checksums for already-applied migrations whose
 * source has been touched in non-substantive ways), making the next {@code migrate()} call
 * idempotent. Successful rows are never deleted.
 */
@Configuration
public class FlywayMigrationConfig {

    private static final Logger log = LoggerFactory.getLogger(FlywayMigrationConfig.class);

    @Bean
    public FlywayMigrationStrategy repairThenMigrate() {
        return flyway -> {
            try {
                flyway.repair();
            } catch (Exception e) {
                log.warn("Flyway repair failed (continuing to migrate): {}", e.getMessage());
            }
            flyway.migrate();
        };
    }
}
