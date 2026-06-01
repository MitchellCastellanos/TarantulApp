package com.tarantulapp.service;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.PartnerCartOrder;
import com.tarantulapp.entity.PartnerListing;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.OfficialVendorRepository;
import com.tarantulapp.repository.PartnerCartOrderRepository;
import com.tarantulapp.repository.PartnerListingRepository;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.service.partnerpay.PartnerCheckoutContext;
import com.tarantulapp.service.partnerpay.PartnerCheckoutResult;
import com.tarantulapp.service.partnerpay.PartnerPaymentProvider;
import com.tarantulapp.util.PartnerCheckoutConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashSet;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Orchestrates the in-app TarantulApp partner cart checkout (beta, Canada).
 * Resolves eligibility, prices the cart from authoritative partner listings,
 * records a {@link PartnerCartOrder}, and delegates to a payment plugin.
 */
@Service
public class PartnerCheckoutService {

    private static final Logger log = LoggerFactory.getLogger(PartnerCheckoutService.class);

    private final OfficialVendorRepository officialVendorRepository;
    private final PartnerListingRepository partnerListingRepository;
    private final PartnerCartOrderRepository partnerCartOrderRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final PickupPointService pickupPointService;
    private final List<PartnerPaymentProvider> providers;

    @Value("${app.base-url:http://localhost:5173}")
    private String appBaseUrl;

    public PartnerCheckoutService(OfficialVendorRepository officialVendorRepository,
                                  PartnerListingRepository partnerListingRepository,
                                  PartnerCartOrderRepository partnerCartOrderRepository,
                                  UserRepository userRepository,
                                  EmailService emailService,
                                  PickupPointService pickupPointService,
                                  List<PartnerPaymentProvider> providers) {
        this.officialVendorRepository = officialVendorRepository;
        this.partnerListingRepository = partnerListingRepository;
        this.partnerCartOrderRepository = partnerCartOrderRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.pickupPointService = pickupPointService;
        this.providers = providers;
    }

    public record CartLineRequest(String externalProductId, Integer quantity) {
    }

    /** Tells the cart UI whether to offer "Pay in TarantulApp" and which rails are live. */
    public Map<String, Object> paymentOptions(String vendorSlug) {
        Optional<OfficialVendor> vendorOpt = officialVendorRepository.findBySlug(vendorSlug);
        Map<String, Object> out = new LinkedHashMap<>();
        if (vendorOpt.isEmpty()) {
            out.put("inAppAvailable", false);
            out.put("mode", PartnerCheckoutConfig.MODE_WEBSITE);
            out.put("providers", List.of());
            return out;
        }
        OfficialVendor vendor = vendorOpt.get();
        PartnerCheckoutConfig config = PartnerCheckoutConfig.fromVendor(vendor);
        out.put("inAppAvailable", config.usesInAppCheckout());
        out.put("mode", config.effectiveMode());
        out.put("vendorName", vendor.getName());
        out.put("providers", offeredProviders(config));
        return out;
    }

    /** Provider descriptors the buyer can pick (only those configured for this vendor). */
    private List<Map<String, Object>> offeredProviders(PartnerCheckoutConfig config) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (String key : config.providers()) {
            PartnerPaymentProvider p = findProvider(key);
            if (p == null) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("key", p.key());
            m.put("displayName", p.displayName());
            m.put("live", p.live() && p.configured());
            out.add(m);
        }
        return out;
    }

    @Transactional
    public Map<String, Object> startCheckout(String vendorSlug, String providerKey, List<CartLineRequest> lines,
                                             String buyerEmail, UUID buyerUserId) {
        return startCheckout(vendorSlug, providerKey, lines, buyerEmail, buyerUserId, null, null);
    }

    @Transactional
    public Map<String, Object> startCheckout(String vendorSlug, String providerKey, List<CartLineRequest> lines,
                                             String buyerEmail, UUID buyerUserId, String fulfillmentMethod,
                                             UUID pickupPointId) {
        OfficialVendor vendor = officialVendorRepository.findBySlug(vendorSlug)
                .orElseThrow(() -> new NotFoundException("Partner no encontrado"));
        PartnerCheckoutConfig config = PartnerCheckoutConfig.fromVendor(vendor);
        if (!config.usesInAppCheckout()) {
            // Caller should fall back to the website handoff flow.
            return result("UNAVAILABLE", null, null, null,
                    "In-app checkout is not enabled for this partner.");
        }
        if (lines == null || lines.isEmpty()) {
            throw new IllegalArgumentException("El carrito está vacío");
        }

        List<Map<String, Object>> orderLines = new ArrayList<>();
        List<PartnerListing> pricedListings = new ArrayList<>();
        Set<UUID> pricedListingIds = new HashSet<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        String currency = null;
        int itemCount = 0;
        for (CartLineRequest line : lines) {
            if (line == null || line.externalProductId() == null || line.externalProductId().isBlank()) {
                continue;
            }
            PartnerListing listing = partnerListingRepository
                    .findByOfficialVendorIdAndExternalId(vendor.getId(), line.externalProductId().trim())
                    .orElse(null);
            if (listing == null || listing.getPriceAmount() == null) {
                // Skip items we can't authoritatively price rather than trusting the client.
                continue;
            }
            int qty = line.quantity() == null || line.quantity() < 1 ? 1 : Math.min(line.quantity(), 99);
            BigDecimal unit = listing.getPriceAmount().setScale(2, RoundingMode.HALF_UP);
            subtotal = subtotal.add(unit.multiply(BigDecimal.valueOf(qty)));
            itemCount += qty;
            if (currency == null) {
                currency = listing.getCurrency() == null ? "CAD" : listing.getCurrency().toUpperCase();
            }
            orderLines.add(PartnerCartOrder.line(listing.getExternalId(), listing.getTitle(), qty, unit));
            if (pricedListingIds.add(listing.getId())) {
                pricedListings.add(listing);
            }
        }
        if (orderLines.isEmpty() || subtotal.signum() <= 0) {
            throw new IllegalArgumentException("No hay artículos válidos con precio en el carrito");
        }
        if (currency == null) {
            currency = "CAD";
        }
        PickupPointService.PickupSelection pickup = null;
        boolean wantsPickup = PickupPointService.FULFILLMENT_PICKUP_POINT.equalsIgnoreCase(
                fulfillmentMethod == null ? "" : fulfillmentMethod.trim());
        if (wantsPickup) {
            pickup = pickupPointService.validatePickupSelection(vendor, pricedListings, pickupPointId);
        }

        BigDecimal commissionRate = config.effectiveCommissionRate();
        BigDecimal commissionAmount = subtotal.multiply(commissionRate).setScale(2, RoundingMode.HALF_UP);
        boolean platform = !"connect".equals(config.payoutMode());
        // Platform stores (owner-operated): funds settle to the platform, partner payout via Stripe is 0.
        BigDecimal payout = platform ? BigDecimal.ZERO : subtotal.subtract(commissionAmount);

        PartnerPaymentProvider provider = resolveProvider(providerKey, config);
        if (provider == null) {
            return result("PROVIDER_NOT_LIVE", null, null, null,
                    "No hay un método de pago disponible para este partner todavía.");
        }

        PartnerCartOrder order = new PartnerCartOrder();
        order.setVendorId(vendor.getId());
        order.setVendorSlug(vendor.getSlug());
        order.setBuyerUserId(buyerUserId);
        order.setBuyerEmail(buyerEmail == null || buyerEmail.isBlank() ? null : buyerEmail.trim());
        order.setCurrency(currency);
        order.setSubtotal(subtotal.setScale(2, RoundingMode.HALF_UP));
        order.setCommissionRate(commissionRate);
        order.setCommissionAmount(commissionAmount);
        order.setPartnerPayoutAmount(payout);
        order.setPayoutMode(platform ? "platform" : "connect");
        order.setFulfillmentMethod(wantsPickup ? PickupPointService.FULFILLMENT_PICKUP_POINT : PickupPointService.FULFILLMENT_PARTNER_SITE);
        if (pickup != null) {
            order.setPickupPointId(pickup.point().getId());
            order.setPickupSnapshot(pickup.snapshot());
            order.setPickupHoldUntil(pickup.holdUntil());
        }
        order.setProvider(provider.key());
        order.setStatus("payment_pending");
        order.setLines(orderLines);
        order = partnerCartOrderRepository.save(order);

        long amountCents = subtotal.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
        long feeCents = commissionAmount.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
        String successUrl = appBaseUrl + "/partner/" + vendor.getSlug() + "?inAppCheckout=success&order=" + order.getId();
        String cancelUrl = appBaseUrl + "/partner/" + vendor.getSlug() + "?inAppCheckout=cancel";
        PartnerCheckoutContext ctx = new PartnerCheckoutContext(
                order.getId(), vendor.getName(), currency, amountCents,
                vendor.getName() + " — TarantulApp cart (" + itemCount + ")",
                successUrl, cancelUrl, order.getBuyerEmail(),
                order.getPayoutMode(), config.stripeAccountId(), feeCents);

        PartnerCheckoutResult res = provider.createCheckout(ctx);
        if (res.isReady()) {
            order.setProviderRef("session_pending");
            partnerCartOrderRepository.save(order);
            return result("READY", provider.key(), res.checkoutUrl(), order.getId(), null);
        }
        // Not ready: drop the pending order so it can't be mistaken for a real sale.
        partnerCartOrderRepository.delete(order);
        return result(res.status().name(), provider.key(), null, null, res.message());
    }

    /** Called from the Stripe webhook when a partner cart checkout completes. */
    @Transactional
    public void applyPaidWebhook(UUID orderId, String providerRef, long amountTotalCents, String currency) {
        PartnerCartOrder order = partnerCartOrderRepository.findById(orderId).orElse(null);
        if (order == null || !"payment_pending".equals(order.getStatus())) {
            return;
        }
        order.setStatus("paid");
        if (providerRef != null && !providerRef.isBlank()) {
            order.setProviderRef(providerRef);
        }
        partnerCartOrderRepository.save(order);

        long amountCents = amountTotalCents > 0
                ? amountTotalCents
                : order.getSubtotal().movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
        String cur = currency == null || currency.isBlank() ? order.getCurrency() : currency.toUpperCase();
        int itemCount = order.getLines().stream()
                .mapToInt(l -> {
                    Object q = l.get("quantity");
                    return q instanceof Number n ? n.intValue() : 1;
                }).sum();
        long payoutCents = order.getPartnerPayoutAmount() == null ? 0L
                : order.getPartnerPayoutAmount().movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
        boolean platform = !"connect".equals(order.getPayoutMode());

        OfficialVendor vendor = officialVendorRepository.findById(order.getVendorId()).orElse(null);
        String vendorName = vendor == null ? order.getVendorSlug() : vendor.getName();

        try {
            emailService.sendPartnerCartOrderConfirmation(order.getBuyerEmail(), vendorName, amountCents, cur, itemCount, null,
                    order.getPickupSnapshot(), order.getPickupHoldUntil());
        } catch (RuntimeException e) {
            log.warn("Buyer confirmation email failed for partner order {}: {}", order.getId(), e.getMessage());
        }
        try {
            partnerEmail(order.getVendorSlug()).ifPresent(email ->
                    emailService.sendPartnerCartOrderPaid(email, vendorName, amountCents, cur, itemCount, payoutCents, platform,
                            order.getPickupSnapshot(), order.getPickupHoldUntil()));
        } catch (RuntimeException e) {
            log.warn("Partner paid email failed for partner order {}: {}", order.getId(), e.getMessage());
        }
    }

    /** Recent in-app orders for the partner that owns the caller's public handle. */
    public List<Map<String, Object>> recentOrdersForUser(UUID userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getPublicHandle() == null || user.getPublicHandle().isBlank()) {
            return List.of();
        }
        OfficialVendor vendor = officialVendorRepository.findBySlug(user.getPublicHandle().trim()).orElse(null);
        if (vendor == null) {
            return List.of();
        }
        return partnerCartOrderRepository.findTop50ByVendorIdOrderByCreatedAtDesc(vendor.getId())
                .stream().map(this::mapOrder).toList();
    }

    private Map<String, Object> mapOrder(PartnerCartOrder order) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", order.getId().toString());
        out.put("status", order.getStatus());
        out.put("currency", order.getCurrency());
        out.put("subtotal", order.getSubtotal());
        out.put("commissionAmount", order.getCommissionAmount());
        out.put("partnerPayoutAmount", order.getPartnerPayoutAmount());
        out.put("payoutMode", order.getPayoutMode());
        out.put("fulfillmentMethod", order.getFulfillmentMethod());
        out.put("pickupPoint", order.getPickupSnapshot());
        out.put("pickupHoldUntil", order.getPickupHoldUntil());
        out.put("provider", order.getProvider());
        out.put("itemCount", order.getLines().stream()
                .mapToInt(l -> {
                    Object q = l.get("quantity");
                    return q instanceof Number n ? n.intValue() : 1;
                }).sum());
        out.put("createdAt", order.getCreatedAt());
        return out;
    }

    private Optional<String> partnerEmail(String vendorSlug) {
        if (vendorSlug == null || vendorSlug.isBlank()) {
            return Optional.empty();
        }
        return userRepository.findByPublicHandleIgnoreCase(vendorSlug.trim())
                .map(User::getEmail)
                .filter(e -> e != null && !e.isBlank());
    }

    private PartnerPaymentProvider resolveProvider(String providerKey, PartnerCheckoutConfig config) {
        if (providerKey != null && !providerKey.isBlank()) {
            PartnerPaymentProvider requested = findProvider(providerKey.trim().toLowerCase());
            if (requested != null && config.providers().contains(requested.key())) {
                return requested;
            }
        }
        // Otherwise pick the first live + configured rail this vendor enabled.
        for (String key : config.providers()) {
            PartnerPaymentProvider p = findProvider(key);
            if (p != null && p.live() && p.configured()) {
                return p;
            }
        }
        // Nothing live: fall back to the first enabled rail so the caller gets a clear "coming soon".
        for (String key : config.providers()) {
            PartnerPaymentProvider p = findProvider(key);
            if (p != null) {
                return p;
            }
        }
        return null;
    }

    private PartnerPaymentProvider findProvider(String key) {
        if (key == null) return null;
        return providers.stream().filter(p -> p.key().equalsIgnoreCase(key)).findFirst().orElse(null);
    }

    private Map<String, Object> result(String status, String provider, String checkoutUrl, UUID orderId, String message) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("status", status);
        if (provider != null) out.put("provider", provider);
        if (checkoutUrl != null) out.put("checkoutUrl", checkoutUrl);
        if (orderId != null) out.put("orderId", orderId.toString());
        if (message != null) out.put("message", message);
        return out;
    }
}
