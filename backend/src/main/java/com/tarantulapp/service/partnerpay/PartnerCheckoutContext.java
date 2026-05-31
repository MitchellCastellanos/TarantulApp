package com.tarantulapp.service.partnerpay;

import java.util.UUID;

/**
 * Everything a {@link PartnerPaymentProvider} needs to start a hosted checkout
 * for an in-app partner cart order.
 *
 * @param payoutMode        {@code platform} (funds settle to TarantulApp/owner) or
 *                          {@code connect} (route to the partner's connected account)
 * @param connectAccountId  partner Stripe Connect account id, when payoutMode = connect
 * @param applicationFeeCents our commission, charged as a Stripe application fee on connect charges
 */
public record PartnerCheckoutContext(
        UUID orderId,
        String vendorName,
        String currency,
        long amountCents,
        String description,
        String successUrl,
        String cancelUrl,
        String buyerEmail,
        String payoutMode,
        String connectAccountId,
        long applicationFeeCents) {
}
