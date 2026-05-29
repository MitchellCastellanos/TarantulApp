package com.tarantulapp.dto;

public class MeCapabilitiesDTO {
    private boolean collection = true;
    private boolean studio;
    private boolean passportCreator;
    private boolean verifiedOrigin;
    private boolean officialPartner;
    private boolean marketplace = true;
    private boolean verifiedBreeder;

    public boolean isCollection() { return collection; }
    public void setCollection(boolean collection) { this.collection = collection; }
    public boolean isStudio() { return studio; }
    public void setStudio(boolean studio) { this.studio = studio; }
    public boolean isPassportCreator() { return passportCreator; }
    public void setPassportCreator(boolean passportCreator) { this.passportCreator = passportCreator; }
    public boolean isVerifiedOrigin() { return verifiedOrigin; }
    public void setVerifiedOrigin(boolean verifiedOrigin) { this.verifiedOrigin = verifiedOrigin; }
    public boolean isOfficialPartner() { return officialPartner; }
    public void setOfficialPartner(boolean officialPartner) { this.officialPartner = officialPartner; }
    public boolean isMarketplace() { return marketplace; }
    public void setMarketplace(boolean marketplace) { this.marketplace = marketplace; }
    public boolean isVerifiedBreeder() { return verifiedBreeder; }
    public void setVerifiedBreeder(boolean verifiedBreeder) { this.verifiedBreeder = verifiedBreeder; }
}
