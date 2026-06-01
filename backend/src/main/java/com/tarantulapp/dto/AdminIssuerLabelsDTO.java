package com.tarantulapp.dto;

import java.util.UUID;

/** Per-issuer roll-up for the admin "labels issued per user" overview. */
public class AdminIssuerLabelsDTO {
    private UUID userId;
    private String displayName;
    private String email;
    private boolean verifiedOrigin;
    private String originKind;
    private long issued;
    private long unclaimed;
    private long pendingConfirm;
    private long confirmed;
    private long overdue;

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public boolean isVerifiedOrigin() { return verifiedOrigin; }
    public void setVerifiedOrigin(boolean verifiedOrigin) { this.verifiedOrigin = verifiedOrigin; }
    public String getOriginKind() { return originKind; }
    public void setOriginKind(String originKind) { this.originKind = originKind; }
    public long getIssued() { return issued; }
    public void setIssued(long issued) { this.issued = issued; }
    public long getUnclaimed() { return unclaimed; }
    public void setUnclaimed(long unclaimed) { this.unclaimed = unclaimed; }
    public long getPendingConfirm() { return pendingConfirm; }
    public void setPendingConfirm(long pendingConfirm) { this.pendingConfirm = pendingConfirm; }
    public long getConfirmed() { return confirmed; }
    public void setConfirmed(long confirmed) { this.confirmed = confirmed; }
    public long getOverdue() { return overdue; }
    public void setOverdue(long overdue) { this.overdue = overdue; }
}
