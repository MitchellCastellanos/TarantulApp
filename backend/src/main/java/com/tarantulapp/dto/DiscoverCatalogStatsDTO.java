package com.tarantulapp.dto;

/**
 * Public Discover hub: total taxonomy/catalog rows vs rows we surface as keeper-grade profiles.
 */
public class DiscoverCatalogStatsDTO {

    /** All public catalog rows (seed/gbif/wsc-backed index used for browse/search). */
    private long indexedNames;

    /** Subset with curated care signal (seed sheet, care notes, humidity band, etc.). */
    private long keeperProfiles;

    public DiscoverCatalogStatsDTO() {
    }

    public DiscoverCatalogStatsDTO(long indexedNames, long keeperProfiles) {
        this.indexedNames = indexedNames;
        this.keeperProfiles = keeperProfiles;
    }

    public long getIndexedNames() {
        return indexedNames;
    }

    public void setIndexedNames(long indexedNames) {
        this.indexedNames = indexedNames;
    }

    public long getKeeperProfiles() {
        return keeperProfiles;
    }

    public void setKeeperProfiles(long keeperProfiles) {
        this.keeperProfiles = keeperProfiles;
    }
}
