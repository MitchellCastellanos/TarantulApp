package com.tarantulapp.service.partnerpay;

import org.springframework.stereotype.Component;

/**
 * PayPal plugin placeholder for the in-app partner checkout. Registered so the
 * UI can surface it as "coming soon"; not wired to PayPal yet.
 */
@Component
public class PaypalPartnerPaymentProvider implements PartnerPaymentProvider {

    @Override
    public String key() {
        return "paypal";
    }

    @Override
    public String displayName() {
        return "PayPal";
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
