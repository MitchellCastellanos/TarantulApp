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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * An in-app TarantulApp cart paid directly to a partner (beta, Canada only).
 * Distinct from {@link MarketplaceOrder}, which is a peer-to-peer listing sale
 * tied to a chat thread.
 */
@Entity
@Table(name = "partner_cart_orders")
public class PartnerCartOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "vendor_id", nullable = false, columnDefinition = "uuid")
    private UUID vendorId;

    @Column(name = "vendor_slug", nullable = false, length = 120)
    private String vendorSlug;

    @Column(name = "buyer_user_id", columnDefinition = "uuid")
    private UUID buyerUserId;

    @Column(name = "buyer_email", length = 255)
    private String buyerEmail;

    @Column(nullable = false, length = 8)
    private String currency;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "commission_rate", nullable = false, precision = 6, scale = 4)
    private BigDecimal commissionRate = BigDecimal.ZERO;

    @Column(name = "commission_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal commissionAmount = BigDecimal.ZERO;

    @Column(name = "partner_payout_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal partnerPayoutAmount = BigDecimal.ZERO;

    /** {@code platform} (funds to TarantulApp/owner) or {@code connect} (partner Stripe, scaffold). */
    @Column(name = "payout_mode", nullable = false, length = 16)
    private String payoutMode = "platform";

    @Column(name = "fulfillment_method", nullable = false, length = 32)
    private String fulfillmentMethod = "partner_site";

    @Column(name = "pickup_point_id", columnDefinition = "uuid")
    private UUID pickupPointId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "pickup_snapshot", columnDefinition = "jsonb")
    private Map<String, Object> pickupSnapshot;

    @Column(name = "pickup_hold_until")
    private Instant pickupHoldUntil;

    @Column(nullable = false, length = 32)
    private String provider;

    @Column(name = "provider_ref", length = 160)
    private String providerRef;

    @Column(nullable = false, length = 32)
    private String status = "payment_pending";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<Map<String, Object>> lines = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (lines == null) {
            lines = new ArrayList<>();
        }
        if (fulfillmentMethod == null || fulfillmentMethod.isBlank()) {
            fulfillmentMethod = "partner_site";
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
        if (lines == null) {
            lines = new ArrayList<>();
        }
        if (fulfillmentMethod == null || fulfillmentMethod.isBlank()) {
            fulfillmentMethod = "partner_site";
        }
    }

    public static Map<String, Object> line(String externalProductId, String title, int quantity,
                                           BigDecimal unitPrice) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("externalProductId", externalProductId);
        m.put("title", title);
        m.put("quantity", quantity);
        m.put("unitPrice", unitPrice);
        return m;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getVendorId() { return vendorId; }
    public void setVendorId(UUID vendorId) { this.vendorId = vendorId; }
    public String getVendorSlug() { return vendorSlug; }
    public void setVendorSlug(String vendorSlug) { this.vendorSlug = vendorSlug; }
    public UUID getBuyerUserId() { return buyerUserId; }
    public void setBuyerUserId(UUID buyerUserId) { this.buyerUserId = buyerUserId; }
    public String getBuyerEmail() { return buyerEmail; }
    public void setBuyerEmail(String buyerEmail) { this.buyerEmail = buyerEmail; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public BigDecimal getCommissionRate() { return commissionRate; }
    public void setCommissionRate(BigDecimal commissionRate) { this.commissionRate = commissionRate; }
    public BigDecimal getCommissionAmount() { return commissionAmount; }
    public void setCommissionAmount(BigDecimal commissionAmount) { this.commissionAmount = commissionAmount; }
    public BigDecimal getPartnerPayoutAmount() { return partnerPayoutAmount; }
    public void setPartnerPayoutAmount(BigDecimal partnerPayoutAmount) { this.partnerPayoutAmount = partnerPayoutAmount; }
    public String getPayoutMode() { return payoutMode; }
    public void setPayoutMode(String payoutMode) { this.payoutMode = payoutMode; }
    public String getFulfillmentMethod() { return fulfillmentMethod; }
    public void setFulfillmentMethod(String fulfillmentMethod) { this.fulfillmentMethod = fulfillmentMethod; }
    public UUID getPickupPointId() { return pickupPointId; }
    public void setPickupPointId(UUID pickupPointId) { this.pickupPointId = pickupPointId; }
    public Map<String, Object> getPickupSnapshot() { return pickupSnapshot; }
    public void setPickupSnapshot(Map<String, Object> pickupSnapshot) { this.pickupSnapshot = pickupSnapshot; }
    public Instant getPickupHoldUntil() { return pickupHoldUntil; }
    public void setPickupHoldUntil(Instant pickupHoldUntil) { this.pickupHoldUntil = pickupHoldUntil; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getProviderRef() { return providerRef; }
    public void setProviderRef(String providerRef) { this.providerRef = providerRef; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public List<Map<String, Object>> getLines() { return lines; }
    public void setLines(List<Map<String, Object>> lines) { this.lines = lines; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
