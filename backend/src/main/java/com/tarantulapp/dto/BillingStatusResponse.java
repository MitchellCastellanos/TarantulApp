package com.tarantulapp.dto;

import java.time.LocalDateTime;

public class BillingStatusResponse {
    private String plan;
    private String status;
    private String provider;
    private LocalDateTime currentPeriodEnd;
    private Boolean cancelAtPeriodEnd;
    private boolean checkoutEnabled;

    public String getPlan() { return plan; }
    public void setPlan(String plan) { this.plan = plan; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public LocalDateTime getCurrentPeriodEnd() { return currentPeriodEnd; }
    public void setCurrentPeriodEnd(LocalDateTime currentPeriodEnd) { this.currentPeriodEnd = currentPeriodEnd; }
    public Boolean getCancelAtPeriodEnd() { return cancelAtPeriodEnd; }
    public void setCancelAtPeriodEnd(Boolean cancelAtPeriodEnd) { this.cancelAtPeriodEnd = cancelAtPeriodEnd; }
    public boolean isCheckoutEnabled() { return checkoutEnabled; }
    public void setCheckoutEnabled(boolean checkoutEnabled) { this.checkoutEnabled = checkoutEnabled; }
}

