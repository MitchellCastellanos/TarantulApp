package com.tarantulapp.dto;

import jakarta.validation.constraints.NotNull;

public class AdminCreatePassportRequest {

    @NotNull
    private Integer speciesId;

    private String stage;
    private String sex;
    private String labelNotes;
    private Integer proGiftDays;

    /** When set, attributed as passport creator / origin holder. */
    private java.util.UUID createdByUserId;

    public Integer getSpeciesId() { return speciesId; }
    public void setSpeciesId(Integer speciesId) { this.speciesId = speciesId; }
    public String getStage() { return stage; }
    public void setStage(String stage) { this.stage = stage; }
    public String getSex() { return sex; }
    public void setSex(String sex) { this.sex = sex; }
    public String getLabelNotes() { return labelNotes; }
    public void setLabelNotes(String labelNotes) { this.labelNotes = labelNotes; }
    public Integer getProGiftDays() { return proGiftDays; }
    public void setProGiftDays(Integer proGiftDays) { this.proGiftDays = proGiftDays; }
    public java.util.UUID getCreatedByUserId() { return createdByUserId; }
    public void setCreatedByUserId(java.util.UUID createdByUserId) { this.createdByUserId = createdByUserId; }
}
