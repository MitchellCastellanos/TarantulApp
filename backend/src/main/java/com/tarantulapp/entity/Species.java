package com.tarantulapp.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "species")
public class Species {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "scientific_name", unique = true, nullable = false, length = 150)
    private String scientificName;

    @Column(name = "common_name", length = 150)
    private String commonName;

    @Column(name = "origin_region", length = 150)
    private String originRegion;

    @Column(name = "habitat_type", length = 20)
    private String habitatType;

    @Column(name = "adult_size_cm_min", precision = 4, scale = 1)
    private BigDecimal adultSizeCmMin;

    @Column(name = "adult_size_cm_max", precision = 4, scale = 1)
    private BigDecimal adultSizeCmMax;

    @Column(name = "growth_rate", length = 20)
    private String growthRate;

    @Column(name = "temperament", length = 200)
    private String temperament;

    @Column(name = "humidity_min")
    private Integer humidityMin;

    @Column(name = "humidity_max")
    private Integer humidityMax;

    @Column(name = "ventilation", length = 20)
    private String ventilation;

    @Column(name = "substrate_type", length = 150)
    private String substrateType;

    @Column(name = "experience_level", length = 20)
    private String experienceLevel;

    @Column(name = "care_notes", columnDefinition = "TEXT")
    private String careNotes;

    @Column(name = "is_custom", nullable = false)
    private Boolean isCustom = false;

    @Column(name = "created_by", columnDefinition = "uuid")
    private UUID createdBy;

    @Column(name = "reference_photo_url", length = 500)
    private String referencePhotoUrl;

    @Column(name = "data_source", nullable = false, length = 30)
    private String dataSource = "manual";

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getScientificName() { return scientificName; }
    public void setScientificName(String scientificName) { this.scientificName = scientificName; }
    public String getCommonName() { return commonName; }
    public void setCommonName(String commonName) { this.commonName = commonName; }
    public String getOriginRegion() { return originRegion; }
    public void setOriginRegion(String originRegion) { this.originRegion = originRegion; }
    public String getHabitatType() { return habitatType; }
    public void setHabitatType(String habitatType) { this.habitatType = habitatType; }
    public BigDecimal getAdultSizeCmMin() { return adultSizeCmMin; }
    public void setAdultSizeCmMin(BigDecimal adultSizeCmMin) { this.adultSizeCmMin = adultSizeCmMin; }
    public BigDecimal getAdultSizeCmMax() { return adultSizeCmMax; }
    public void setAdultSizeCmMax(BigDecimal adultSizeCmMax) { this.adultSizeCmMax = adultSizeCmMax; }
    public String getGrowthRate() { return growthRate; }
    public void setGrowthRate(String growthRate) { this.growthRate = growthRate; }
    public String getTemperament() { return temperament; }
    public void setTemperament(String temperament) { this.temperament = temperament; }
    public Integer getHumidityMin() { return humidityMin; }
    public void setHumidityMin(Integer humidityMin) { this.humidityMin = humidityMin; }
    public Integer getHumidityMax() { return humidityMax; }
    public void setHumidityMax(Integer humidityMax) { this.humidityMax = humidityMax; }
    public String getVentilation() { return ventilation; }
    public void setVentilation(String ventilation) { this.ventilation = ventilation; }
    public String getSubstrateType() { return substrateType; }
    public void setSubstrateType(String substrateType) { this.substrateType = substrateType; }
    public String getExperienceLevel() { return experienceLevel; }
    public void setExperienceLevel(String experienceLevel) { this.experienceLevel = experienceLevel; }
    public String getCareNotes() { return careNotes; }
    public void setCareNotes(String careNotes) { this.careNotes = careNotes; }
    public Boolean getIsCustom() { return isCustom; }
    public void setIsCustom(Boolean isCustom) { this.isCustom = isCustom; }
    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }
    public String getReferencePhotoUrl() { return referencePhotoUrl; }
    public void setReferencePhotoUrl(String referencePhotoUrl) { this.referencePhotoUrl = referencePhotoUrl; }
    public String getDataSource() { return dataSource; }
    public void setDataSource(String dataSource) { this.dataSource = dataSource; }
}
