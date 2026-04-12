package com.tarantulapp.dto;

import com.tarantulapp.entity.Species;
import java.math.BigDecimal;

public class SpeciesDTO {
    private Integer id;
    private String scientificName;
    private String commonName;
    private String originRegion;
    private String habitatType;
    private BigDecimal adultSizeCmMin;
    private BigDecimal adultSizeCmMax;
    private String growthRate;
    private String temperament;
    private Integer humidityMin;
    private Integer humidityMax;
    private String ventilation;
    private String substrateType;
    private String experienceLevel;
    private String careNotes;
    private Boolean isCustom;

    public static SpeciesDTO from(Species s) {
        if (s == null) return null;
        SpeciesDTO dto = new SpeciesDTO();
        dto.id = s.getId();
        dto.scientificName = s.getScientificName();
        dto.commonName = s.getCommonName();
        dto.originRegion = s.getOriginRegion();
        dto.habitatType = s.getHabitatType();
        dto.adultSizeCmMin = s.getAdultSizeCmMin();
        dto.adultSizeCmMax = s.getAdultSizeCmMax();
        dto.growthRate = s.getGrowthRate();
        dto.temperament = s.getTemperament();
        dto.humidityMin = s.getHumidityMin();
        dto.humidityMax = s.getHumidityMax();
        dto.ventilation = s.getVentilation();
        dto.substrateType = s.getSubstrateType();
        dto.experienceLevel = s.getExperienceLevel();
        dto.careNotes = s.getCareNotes();
        dto.isCustom = s.getIsCustom();
        return dto;
    }

    public Integer getId() { return id; }
    public String getScientificName() { return scientificName; }
    public String getCommonName() { return commonName; }
    public String getOriginRegion() { return originRegion; }
    public String getHabitatType() { return habitatType; }
    public BigDecimal getAdultSizeCmMin() { return adultSizeCmMin; }
    public BigDecimal getAdultSizeCmMax() { return adultSizeCmMax; }
    public String getGrowthRate() { return growthRate; }
    public String getTemperament() { return temperament; }
    public Integer getHumidityMin() { return humidityMin; }
    public Integer getHumidityMax() { return humidityMax; }
    public String getVentilation() { return ventilation; }
    public String getSubstrateType() { return substrateType; }
    public String getExperienceLevel() { return experienceLevel; }
    public String getCareNotes() { return careNotes; }
    public Boolean getIsCustom() { return isCustom; }
}
