package com.tarantulapp;

import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Redis is optional. Excluding the auto-configurations means Spring won't try to dial a Redis
 * server at startup just because the starter is on the classpath; {@code RedisConfig} brings up
 * Lettuce + RedisTemplate only when {@code app.redis.enabled=true} (set automatically when REDIS_URL
 * is provided). When disabled, rate limiting / token blacklist / cache fall back to in-memory.
 *
 * ShedLock default lock-at-most-for is 10 minutes — enough that a stuck node can't hold a lock
 * indefinitely; individual @SchedulerLock annotations override per job.
 */
@SpringBootApplication(exclude = {
        RedisAutoConfiguration.class,
        RedisRepositoriesAutoConfiguration.class
})
@EnableScheduling
@EnableAsync
@EnableCaching
@EnableRetry
@EnableSchedulerLock(defaultLockAtMostFor = "PT10M")
public class TarantulAppApplication {
    public static void main(String[] args) {
        SpringApplication.run(TarantulAppApplication.class, args);
    }
}
