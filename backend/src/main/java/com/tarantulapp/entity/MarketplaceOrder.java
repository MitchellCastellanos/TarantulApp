package com.tarantulapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "marketplace_orders")
public class MarketplaceOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "thread_id", nullable = false, unique = true, columnDefinition = "uuid")
    private UUID threadId;

    @Column(name = "listing_id", nullable = false, columnDefinition = "uuid")
    private UUID listingId;

    @Column(name = "buyer_user_id", nullable = false, columnDefinition = "uuid")
    private UUID buyerUserId;

    @Column(name = "seller_user_id", nullable = false, columnDefinition = "uuid")
    private UUID sellerUserId;

    @Column(nullable = false, length = 8)
    private String currency;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "commission_rate", nullable = false, precision = 6, scale = 4)
    private BigDecimal commissionRate;

    @Column(name = "commission_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal commissionAmount;

    @Column(name = "seller_payout_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal sellerPayoutAmount;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "hold_release_at")
    private Instant holdReleaseAt;

    @Column(length = 32)
    private String provider;

    @Column(name = "provider_ref", length = 120)
    private String providerRef;

    @Column(name = "buyer_policy_accepted_at")
    private Instant buyerPolicyAcceptedAt;

    @Column(name = "terms_summary", columnDefinition = "text")
    private String termsSummary;

    @Column(name = "payment_reference", length = 160)
    private String paymentReference;

    @Column(name = "payment_reported_at")
    private Instant paymentReportedAt;

    @Column(name = "shipped_at")
    private Instant shippedAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getThreadId() { return threadId; }
    public void setThreadId(UUID threadId) { this.threadId = threadId; }
    public UUID getListingId() { return listingId; }
    public void setListingId(UUID listingId) { this.listingId = listingId; }
    public UUID getBuyerUserId() { return buyerUserId; }
    public void setBuyerUserId(UUID buyerUserId) { this.buyerUserId = buyerUserId; }
    public UUID getSellerUserId() { return sellerUserId; }
    public void setSellerUserId(UUID sellerUserId) { this.sellerUserId = sellerUserId; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public BigDecimal getCommissionRate() { return commissionRate; }
    public void setCommissionRate(BigDecimal commissionRate) { this.commissionRate = commissionRate; }
    public BigDecimal getCommissionAmount() { return commissionAmount; }
    public void setCommissionAmount(BigDecimal commissionAmount) { this.commissionAmount = commissionAmount; }
    public BigDecimal getSellerPayoutAmount() { return sellerPayoutAmount; }
    public void setSellerPayoutAmount(BigDecimal sellerPayoutAmount) { this.sellerPayoutAmount = sellerPayoutAmount; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getHoldReleaseAt() { return holdReleaseAt; }
    public void setHoldReleaseAt(Instant holdReleaseAt) { this.holdReleaseAt = holdReleaseAt; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getProviderRef() { return providerRef; }
    public void setProviderRef(String providerRef) { this.providerRef = providerRef; }
    public Instant getBuyerPolicyAcceptedAt() { return buyerPolicyAcceptedAt; }
    public void setBuyerPolicyAcceptedAt(Instant buyerPolicyAcceptedAt) { this.buyerPolicyAcceptedAt = buyerPolicyAcceptedAt; }
    public String getTermsSummary() { return termsSummary; }
    public void setTermsSummary(String termsSummary) { this.termsSummary = termsSummary; }
    public String getPaymentReference() { return paymentReference; }
    public void setPaymentReference(String paymentReference) { this.paymentReference = paymentReference; }
    public Instant getPaymentReportedAt() { return paymentReportedAt; }
    public void setPaymentReportedAt(Instant paymentReportedAt) { this.paymentReportedAt = paymentReportedAt; }
    public Instant getShippedAt() { return shippedAt; }
    public void setShippedAt(Instant shippedAt) { this.shippedAt = shippedAt; }
    public Instant getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(Instant deliveredAt) { this.deliveredAt = deliveredAt; }
    public Instant getClosedAt() { return closedAt; }
    public void setClosedAt(Instant closedAt) { this.closedAt = closedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
