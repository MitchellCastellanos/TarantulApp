package com.tarantulapp.service.partnerpay;

/**
 * Plugin interface for the in-app partner checkout (beta). New rails (PayPal,
 * Klarna, Stripe, …) implement this and register as Spring beans; the
 * {@code PartnerCheckoutService} picks one by {@link #key()}.
 *
 * <p>Only providers reporting {@link #live()} and {@link #configured()} are
 * offered to partners — everything else stays a "coming soon" placeholder.
 */
public interface PartnerPaymentProvider {

    /** Stable lowercase key, e.g. {@code "stripe"}, {@code "paypal"}, {@code "klarna"}. */
    String key();

    /** Human label for UI, e.g. {@code "Stripe"}. */
    String displayName();

    /** True when the integration is implemented end-to-end (not a scaffold). */
    boolean live();

    /** True when this environment has the credentials needed to actually charge. */
    boolean configured();

    PartnerCheckoutResult createCheckout(PartnerCheckoutContext ctx);
}
