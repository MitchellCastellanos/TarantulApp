package com.tarantulapp.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Default cache backend (Caffeine, in-process). Used when Redis is not enabled. {@code RedisConfig}
 * supplies a {@link CacheManager} marked {@code @Primary} that takes precedence when active, so
 * production with Redis gets a shared cache and dev/CI gets per-process Caffeine without extra ops.
 *
 * Cache names are stable across both backends so {@code @Cacheable("usersByEmail")} works the same
 * way in either mode.
 */
@Configuration
public class CacheConfig {

    @Bean
    public CacheManager caffeineCacheManager() {
        CaffeineCacheManager mgr = new CaffeineCacheManager(
                "usersByEmail",
                "speciesSearch",
                "publicKeeperProfile",
                "gbifTaxonomy",
                "discoverSearch",
                "discoverTaxonDetail");
        mgr.setCaffeine(Caffeine.newBuilder()
                .maximumSize(10_000)
                .expireAfterWrite(Duration.ofMinutes(5)));
        mgr.setAllowNullValues(false);
        return mgr;
    }
}
