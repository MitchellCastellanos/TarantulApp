package com.tarantulapp.dto;

import jakarta.validation.constraints.Size;

public class PassportClaimRequest {

    @Size(max = 100)
    private String name;

    /** When true (default), create a first feeding reminder based on life stage. */
    private Boolean setupFeedingReminder = true;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Boolean getSetupFeedingReminder() { return setupFeedingReminder; }
    public void setSetupFeedingReminder(Boolean setupFeedingReminder) { this.setupFeedingReminder = setupFeedingReminder; }
}
