package com.tarantulapp.service.partnerpay;

/** Outcome of a {@link PartnerPaymentProvider#createCheckout} attempt. */
public record PartnerCheckoutResult(Status status, String provider, String checkoutUrl, String message) {

    public enum Status {
        /** A hosted checkout URL is ready — redirect the buyer. */
        READY,
        /** Provider exists as a plugin but isn't live yet (PayPal/Klarna scaffold). */
        PROVIDER_NOT_LIVE,
        /** Provider has no API credentials configured on this environment. */
        PROVIDER_NOT_CONFIGURED,
        /** Live provider, but we can't pay this partner yet (e.g. Connect not onboarded). */
        PAYOUT_NOT_READY,
        /** Unexpected failure talking to the provider. */
        FAILED
    }

    public static PartnerCheckoutResult ready(String provider, String checkoutUrl) {
        return new PartnerCheckoutResult(Status.READY, provider, checkoutUrl, null);
    }

    public static PartnerCheckoutResult notLive(String provider) {
        return new PartnerCheckoutResult(Status.PROVIDER_NOT_LIVE, provider, null,
                provider + " checkout is coming soon for partners.");
    }

    public boolean isReady() {
        return status == Status.READY && checkoutUrl != null && !checkoutUrl.isBlank();
    }
}
