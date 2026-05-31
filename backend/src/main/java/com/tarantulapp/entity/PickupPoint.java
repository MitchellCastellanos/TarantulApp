package com.tarantulapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "pickup_points")
public class PickupPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false, length = 140)
    private String name;

    @Column(nullable = false, length = 80)
    private String country = "Canada";

    @Column(length = 80)
    private String state;

    @Column(length = 80)
    private String city;

    @Column(name = "address_line1", length = 220)
    private String addressLine1;

    @Column(name = "postal_code", length = 30)
    private String postalCode;

    @Column(name = "timezone", length = 80)
    private String timezone = "America/Toronto";

    @Column(name = "public_instructions", length = 1000)
    private String publicInstructions;

    @Column(name = "contact_phone", length = 80)
    private String contactPhone;

    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    @Column(name = "hold_days", nullable = false)
    private Integer holdDays = 3;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(name = "admin_notes", length = 1000)
    private String adminNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (active == null) active = true;
        if (holdDays == null || holdDays < 1) holdDays = 3;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
        if (active == null) active = true;
        if (holdDays == null || holdDays < 1) holdDays = 3;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getAddressLine1() { return addressLine1; }
    public void setAddressLine1(String addressLine1) { this.addressLine1 = addressLine1; }
    public String getPostalCode() { return postalCode; }
    public void setPostalCode(String postalCode) { this.postalCode = postalCode; }
    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
    public String getPublicInstructions() { return publicInstructions; }
    public void setPublicInstructions(String publicInstructions) { this.publicInstructions = publicInstructions; }
    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }
    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }
    public Integer getHoldDays() { return holdDays; }
    public void setHoldDays(Integer holdDays) { this.holdDays = holdDays; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public String getAdminNotes() { return adminNotes; }
    public void setAdminNotes(String adminNotes) { this.adminNotes = adminNotes; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
