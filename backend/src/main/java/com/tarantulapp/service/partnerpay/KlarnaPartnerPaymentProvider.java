package com.tarantulapp.service.partnerpay;

import org.springframework.stereotype.Component;

/**
 * Klarna plugin placeholder for the in-app partner checkout. Registered so the
 * UI can surface it as "coming soon"; not wired to Klarna yet.
 */
@Component
public class KlarnaPartnerPaymentProvider implements PartnerPaymentProvider {

    @Override
    public String key() {
        return "klarna";
    }

    @Override
    public String displayName() {
        return "Klarna";
    }

    @Override
    public boolean live() {
        return false;
    }

    @Override
    public boolean configured() {
        return false;
    }

    @Override
    public PartnerCheckoutResult createCheckout(PartnerCheckoutContext ctx) {
        return PartnerCheckoutResult.notLive(displayName());
    }
}
