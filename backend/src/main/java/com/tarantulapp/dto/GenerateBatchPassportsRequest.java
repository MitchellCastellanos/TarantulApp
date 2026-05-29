package com.tarantulapp.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public class GenerateBatchPassportsRequest {

    @Min(1)
    @Max(500)
    private int count = 1;

    @Size(max = 20)
    private String stage;

    @Size(max = 10)
    private String sex;

    @Size(max = 500)
    private String labelNotes;

    @Min(1)
    @Max(365)
    private Integer proGiftDays;

    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }
    public String getStage() { return stage; }
    public void setStage(String stage) { this.stage = stage; }
    public String getSex() { return sex; }
    public void setSex(String sex) { this.sex = sex; }
    public String getLabelNotes() { return labelNotes; }
    public void setLabelNotes(String labelNotes) { this.labelNotes = labelNotes; }
    public Integer getProGiftDays() { return proGiftDays; }
    public void setProGiftDays(Integer proGiftDays) { this.proGiftDays = proGiftDays; }
}
