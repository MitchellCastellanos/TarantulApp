package com.tarantulapp.dto;

/**
 * Local catalog species row for discover, with optional iNat/GBIF fallback photo when DB has none.
 */
public class DiscoverLocalSpeciesViewDTO {

    private SpeciesDTO species;
    /** Present when {@code species.referencePhotoUrl} is empty and iNaturalist returned a photo. */
    private DiscoverPhotoDTO fallbackPhoto;

    public SpeciesDTO getSpecies() { return species; }
    public void setSpecies(SpeciesDTO species) { this.species = species; }
    public DiscoverPhotoDTO getFallbackPhoto() { return fallbackPhoto; }
    public void setFallbackPhoto(DiscoverPhotoDTO fallbackPhoto) { this.fallbackPhoto = fallbackPhoto; }
}
