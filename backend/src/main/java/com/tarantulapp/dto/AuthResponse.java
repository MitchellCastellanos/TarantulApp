package com.tarantulapp.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class AuthResponse {

    private String token;
    private String email;
    private String displayName;
    private UUID userId;
    private String plan;
    private LocalDateTime trialEndsAt;
    private boolean readOnly;
    private boolean inTrial;
    private boolean overFreeLimit;
    private boolean strictReadOnly;

    public AuthResponse(String token, String email, String displayName, UUID userId, String plan) {
        this.token = token;
        this.email = email;
        this.displayName = displayName;
        this.userId = userId;
        this.plan = plan;
    }

    public String getToken() { return token; }
    public String getEmail() { return email; }
    public String getDisplayName() { return displayName; }
    public UUID getUserId() { return userId; }
    public String getPlan() { return plan; }

    public LocalDateTime getTrialEndsAt() { return trialEndsAt; }
    public void setTrialEndsAt(LocalDateTime trialEndsAt) { this.trialEndsAt = trialEndsAt; }

    public boolean isReadOnly() { return readOnly; }
    public void setReadOnly(boolean readOnly) { this.readOnly = readOnly; }

    public boolean isInTrial() { return inTrial; }
    public void setInTrial(boolean inTrial) { this.inTrial = inTrial; }

    public boolean isOverFreeLimit() { return overFreeLimit; }
    public void setOverFreeLimit(boolean overFreeLimit) { this.overFreeLimit = overFreeLimit; }

    public boolean isStrictReadOnly() { return strictReadOnly; }
    public void setStrictReadOnly(boolean strictReadOnly) { this.strictReadOnly = strictReadOnly; }
}
