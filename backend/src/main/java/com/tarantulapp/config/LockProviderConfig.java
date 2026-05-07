package com.tarantulapp.config;

import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.provider.jdbctemplate.JdbcTemplateLockProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

/**
 * Fallback {@link LockProvider} that lives in Postgres (table {@code shedlock}, V67). Used when
 * Redis is not enabled — the Redis-backed provider in {@code RedisConfig} is {@code @Primary}
 * and wins whenever it's present, which is what we want in prod.
 */
@Configuration
public class LockProviderConfig {

    @Bean
    @ConditionalOnMissingBean(LockProvider.class)
    public LockProvider jdbcLockProvider(DataSource dataSource) {
        return new JdbcTemplateLockProvider(JdbcTemplateLockProvider.Configuration.builder()
                .withJdbcTemplate(new JdbcTemplate(dataSource))
                .usingDbTime()
                .build());
    }
}
