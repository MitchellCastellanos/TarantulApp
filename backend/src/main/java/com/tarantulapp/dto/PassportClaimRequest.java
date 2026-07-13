package com.tarantulapp.dto;

import jakarta.validation.constraints.Size;

public class PassportClaimRequest {

    @Size(max = 100)
    private String name;

    /** When true (default), create a first feeding reminder based on life stage. */
    private Boolean setupFeedingReminder = true;

    /** Business-held claim code, required while the passport is ON_SHELF (proof of purchase). */
    @Size(max = 32)
    private String claimCode;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getClaimCode() { return claimCode; }
    public void setClaimCode(String claimCode) { this.claimCode = claimCode; }
    public Boolean getSetupFeedingReminder() { return setupFeedingReminder; }
    public void setSetupFeedingReminder(Boolean setupFeedingReminder) { this.setupFeedingReminder = setupFeedingReminder; }
}
