package com.tarantulapp.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "feeding_logs")
public class FeedingLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "tarantula_id", columnDefinition = "uuid", nullable = false)
    private UUID tarantulaId;

    @Column(name = "fed_at", nullable = false)
    private Instant fedAt;

    @Column(name = "prey_type", length = 50)
    private String preyType;

    @Column(name = "prey_size", length = 20)
    private String preySize;

    @Column(name = "quantity", nullable = false)
    private Integer quantity = 1;

    @Column(name = "accepted")
    private Boolean accepted;

    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() { createdAt = Instant.now(); }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTarantulaId() { return tarantulaId; }
    public void setTarantulaId(UUID tarantulaId) { this.tarantulaId = tarantulaId; }
    public Instant getFedAt() { return fedAt; }
    public void setFedAt(Instant fedAt) { this.fedAt = fedAt; }
    public String getPreyType() { return preyType; }
    public void setPreyType(String preyType) { this.preyType = preyType; }
    public String getPreySize() { return preySize; }
    public void setPreySize(String preySize) { this.preySize = preySize; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public Boolean getAccepted() { return accepted; }
    public void setAccepted(Boolean accepted) { this.accepted = accepted; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Instant getCreatedAt() { return createdAt; }
}
