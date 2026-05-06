package com.tarantulapp.config;

import com.tarantulapp.security.InMemoryRateLimiter;
import com.tarantulapp.security.RateLimiter;
import com.tarantulapp.security.RedisRateLimiter;
import io.lettuce.core.ClientOptions;
import io.lettuce.core.SocketOptions;
import io.lettuce.core.TimeoutOptions;
import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.provider.redis.spring.RedisLockProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import java.net.URI;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Active only when {@code app.redis.enabled=true}. Brings up Lettuce connection factory from
 * a {@code REDIS_URL} env var (Railway / Upstash format), declares a {@link StringRedisTemplate},
 * a {@link RedisCacheManager}, and overrides the {@link RateLimiter} bean to the Redis-backed
 * one. ShedLock provider becomes Redis-based so {@code @Scheduled} jobs only fire on one replica.
 */
@Configuration
@ConditionalOnProperty(name = "app.redis.enabled", havingValue = "true")
public class RedisConfig {

    private static final Logger log = LoggerFactory.getLogger(RedisConfig.class);

    @Bean
    public RedisConnectionFactory redisConnectionFactory(
            @Value("${app.redis.url:${REDIS_URL:}}") String redisUrl) {
        if (redisUrl == null || redisUrl.isBlank()) {
            throw new IllegalStateException(
                    "app.redis.enabled=true but REDIS_URL is empty. Either set REDIS_URL or set app.redis.enabled=false.");
        }
        URI uri = URI.create(redisUrl);
        String host = uri.getHost();
        int port = uri.getPort() > 0 ? uri.getPort() : 6379;
        String userInfo = uri.getUserInfo();
        String password = null;
        if (userInfo != null && userInfo.contains(":")) {
            password = userInfo.substring(userInfo.indexOf(':') + 1);
        } else if (userInfo != null) {
            password = userInfo;
        }
        boolean ssl = "rediss".equalsIgnoreCase(uri.getScheme());

        RedisStandaloneConfiguration standalone = new RedisStandaloneConfiguration(host, port);
        if (password != null && !password.isEmpty()) {
            standalone.setPassword(password);
        }

        ClientOptions options = ClientOptions.builder()
                .socketOptions(SocketOptions.builder().connectTimeout(Duration.ofSeconds(5)).build())
                .timeoutOptions(TimeoutOptions.enabled(Duration.ofSeconds(2)))
                .build();
        LettuceClientConfiguration.LettuceClientConfigurationBuilder clientCfg = LettuceClientConfiguration.builder()
                .clientOptions(options)
                .commandTimeout(Duration.ofSeconds(2));
        if (ssl) {
            clientCfg.useSsl();
        }
        log.info("Redis enabled: host={}, port={}, ssl={}", host, port, ssl);
        return new LettuceConnectionFactory(standalone, clientCfg.build());
    }

    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory cf) {
        return new StringRedisTemplate(cf);
    }

    @Bean
    @Primary
    public RateLimiter redisRateLimiter(StringRedisTemplate template, InMemoryRateLimiter fallback) {
        return new RedisRateLimiter(template, fallback);
    }

    @Bean
    public CacheManager redisCacheManager(RedisConnectionFactory cf) {
        Map<String, RedisCacheConfiguration> caches = new HashMap<>();
        caches.put("usersByEmail", config(Duration.ofSeconds(60)));
        caches.put("speciesSearch", config(Duration.ofHours(1)));
        caches.put("publicKeeperProfile", config(Duration.ofMinutes(5)));
        caches.put("gbifTaxonomy", config(Duration.ofHours(24)));
        return RedisCacheManager.builder(cf)
                .cacheDefaults(config(Duration.ofMinutes(5)))
                .withInitialCacheConfigurations(caches)
                .build();
    }

    private static RedisCacheConfiguration config(Duration ttl) {
        return RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(ttl)
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(
                        new org.springframework.data.redis.serializer.StringRedisSerializer()));
    }

    @Bean
    @Primary
    public LockProvider redisLockProvider(RedisConnectionFactory cf) {
        return new RedisLockProvider(cf, "tarantulapp");
    }
}
