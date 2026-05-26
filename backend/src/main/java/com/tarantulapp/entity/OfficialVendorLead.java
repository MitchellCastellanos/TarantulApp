package com.tarantulapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "official_vendor_leads")
public class OfficialVendorLead {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "business_name", nullable = false, length = 140)
    private String businessName;

    @Column(name = "contact_name", length = 120)
    private String contactName;

    @Column(name = "contact_email", nullable = false, length = 255)
    private String contactEmail;

    @Column(name = "website_url", length = 350)
    private String websiteUrl;

    @Column(length = 80)
    private String country;

    @Column(length = 80)
    private String state;

    @Column(length = 80)
    private String city;

    @Column(name = "shipping_scope", length = 80)
    private String shippingScope;

    @Column(length = 1200)
    private String note;

    @Column(nullable = false, length = 30)
    private String status = "open";

    @Column(name = "outreach_locale", nullable = false, length = 8)
    private String outreachLocale = "en";

    @Column(name = "internal_notes", columnDefinition = "text")
    private String internalNotes;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> qualification = new LinkedHashMap<>();

    @Column(name = "woo_probe_status", length = 40)
    private String wooProbeStatus;

    @Column(name = "woo_probe_detail", length = 500)
    private String wooProbeDetail;

    @Column(name = "last_outreach_at")
    private Instant lastOutreachAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (qualification == null) {
            qualification = new LinkedHashMap<>();
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
        if (qualification == null) {
            qualification = new LinkedHashMap<>();
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }
    public String getContactName() { return contactName; }
    public void setContactName(String contactName) { this.contactName = contactName; }
    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }
    public String getWebsiteUrl() { return websiteUrl; }
    public void setWebsiteUrl(String websiteUrl) { this.websiteUrl = websiteUrl; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getShippingScope() { return shippingScope; }
    public void setShippingScope(String shippingScope) { this.shippingScope = shippingScope; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getOutreachLocale() { return outreachLocale; }
    public void setOutreachLocale(String outreachLocale) { this.outreachLocale = outreachLocale; }
    public String getInternalNotes() { return internalNotes; }
    public void setInternalNotes(String internalNotes) { this.internalNotes = internalNotes; }
    public Map<String, Object> getQualification() { return qualification; }
    public void setQualification(Map<String, Object> qualification) { this.qualification = qualification; }
    public String getWooProbeStatus() { return wooProbeStatus; }
    public void setWooProbeStatus(String wooProbeStatus) { this.wooProbeStatus = wooProbeStatus; }
    public String getWooProbeDetail() { return wooProbeDetail; }
    public void setWooProbeDetail(String wooProbeDetail) { this.wooProbeDetail = wooProbeDetail; }
    public Instant getLastOutreachAt() { return lastOutreachAt; }
    public void setLastOutreachAt(Instant lastOutreachAt) { this.lastOutreachAt = lastOutreachAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
