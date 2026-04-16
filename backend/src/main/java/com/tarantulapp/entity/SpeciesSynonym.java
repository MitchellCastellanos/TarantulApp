package com.tarantulapp.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "species_synonyms")
public class SpeciesSynonym {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "species_id", nullable = false)
    private Integer speciesId;

    @Column(name = "synonym", unique = true, nullable = false, length = 150)
    private String synonym;

    @Column(name = "source", length = 20)
    private String source = "gbif";

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getSpeciesId() { return speciesId; }
    public void setSpeciesId(Integer speciesId) { this.speciesId = speciesId; }
    public String getSynonym() { return synonym; }
    public void setSynonym(String synonym) { this.synonym = synonym; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
}
