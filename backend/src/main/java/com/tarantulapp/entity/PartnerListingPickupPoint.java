package com.tarantulapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "partner_listing_pickup_points")
public class PartnerListingPickupPoint {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "partner_listing_id", nullable = false, columnDefinition = "uuid")
    private UUID partnerListingId;

    @Column(name = "pickup_point_id", nullable = false, columnDefinition = "uuid")
    private UUID pickupPointId;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getPartnerListingId() { return partnerListingId; }
    public void setPartnerListingId(UUID partnerListingId) { this.partnerListingId = partnerListingId; }
    public UUID getPickupPointId() { return pickupPointId; }
    public void setPickupPointId(UUID pickupPointId) { this.pickupPointId = pickupPointId; }
}
