package com.tarantulapp.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * One aggregated row per client session ("visit"). Heartbeats accumulate
 * {@code durationSeconds} and {@code pageViews} onto the same row (keyed by
 * {@code sessionId}). Country/city are resolved at write time; no raw IP is stored.
 */
@Entity
@Table(name = "app_visits")
public class AppVisit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "session_id", length = 64, nullable = false, unique = true)
    private String sessionId;

    @Column(name = "user_id", columnDefinition = "uuid")
    private UUID userId;

    @Column(name = "first_seen_at", nullable = false)
    private Instant firstSeenAt;

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt;

    @Column(name = "duration_seconds", nullable = false)
    private long durationSeconds = 0L;

    @Column(name = "page_views", nullable = false)
    private int pageViews = 1;

    @Column(name = "country", length = 80)
    private String country;

    @Column(name = "country_code", length = 8)
    private String countryCode;

    @Column(name = "city", length = 120)
    private String city;

    @Column(name = "region", length = 120)
    private String region;

    @Column(name = "timezone", length = 64)
    private String timezone;

    @Column(name = "locale", length = 16)
    private String locale;

    @Column(name = "platform", length = 16)
    private String platform;

    @Column(name = "app_version", length = 40)
    private String appVersion;

    @Column(name = "landing_path", length = 300)
    private String landingPath;

    @Column(name = "referrer_host", length = 160)
    private String referrerHost;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public Instant getFirstSeenAt() { return firstSeenAt; }
    public void setFirstSeenAt(Instant firstSeenAt) { this.firstSeenAt = firstSeenAt; }
    public Instant getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(Instant lastSeenAt) { this.lastSeenAt = lastSeenAt; }
    public long getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(long durationSeconds) { this.durationSeconds = durationSeconds; }
    public int getPageViews() { return pageViews; }
    public void setPageViews(int pageViews) { this.pageViews = pageViews; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public String getCountryCode() { return countryCode; }
    public void setCountryCode(String countryCode) { this.countryCode = countryCode; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
    public String getLocale() { return locale; }
    public void setLocale(String locale) { this.locale = locale; }
    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }
    public String getAppVersion() { return appVersion; }
    public void setAppVersion(String appVersion) { this.appVersion = appVersion; }
    public String getLandingPath() { return landingPath; }
    public void setLandingPath(String landingPath) { this.landingPath = landingPath; }
    public String getReferrerHost() { return referrerHost; }
    public void setReferrerHost(String referrerHost) { this.referrerHost = referrerHost; }
}
