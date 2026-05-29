package com.tarantulapp.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class CreateInventoryBatchRequest {

    @NotNull
    private Integer speciesId;

    @NotBlank
    @Size(max = 120)
    private String name;

    @Min(0)
    private Integer quantityTotal;

    @Size(max = 2000)
    private String notes;

    public Integer getSpeciesId() { return speciesId; }
    public void setSpeciesId(Integer speciesId) { this.speciesId = speciesId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getQuantityTotal() { return quantityTotal; }
    public void setQuantityTotal(Integer quantityTotal) { this.quantityTotal = quantityTotal; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
