package com.tarantulapp.service;

import com.tarantulapp.entity.ChatThread;
import com.tarantulapp.entity.MarketplaceListing;
import com.tarantulapp.entity.MarketplaceOrder;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.ChatThreadRepository;
import com.tarantulapp.repository.MarketplaceListingRepository;
import com.tarantulapp.repository.MarketplaceOrderRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class MarketplaceOrderService {
    private static final Set<String> ACTIVE_ORDER_STATUSES = Set.of("payment_pending", "paid_in_hold", "released", "disputed");
    private static final Set<String> SUPPORTED_CURRENCIES = Set.of("MXN", "USD", "CAD");
    private static final int HOLD_DAYS_DEFAULT = 3;

    private final ChatThreadRepository chatThreadRepository;
    private final MarketplaceListingRepository marketplaceListingRepository;
    private final MarketplaceOrderRepository marketplaceOrderRepository;
    private final UserRepository userRepository;
    private final MarketplaceService marketplaceService;

    public MarketplaceOrderService(ChatThreadRepository chatThreadRepository,
                                   MarketplaceListingRepository marketplaceListingRepository,
                                   MarketplaceOrderRepository marketplaceOrderRepository,
                                   UserRepository userRepository,
                                   MarketplaceService marketplaceService) {
        this.chatThreadRepository = chatThreadRepository;
        this.marketplaceListingRepository = marketplaceListingRepository;
        this.marketplaceOrderRepository = marketplaceOrderRepository;
        this.userRepository = userRepository;
        this.marketplaceService = marketplaceService;
    }

    @Transactional
    public Map<String, Object> createOrGetOrderIntent(UUID actorUserId, UUID threadId, BigDecimal subtotalOverride, boolean legalAccepted) {
        ChatThread thread = chatThreadRepository.findById(threadId).orElseThrow(() -> new NotFoundException("Hilo no encontrado"));
        assertParticipant(thread, actorUserId);
        if (thread.getListingId() == null) {
            throw new IllegalArgumentException("La orden aplica solo a hilos con listing");
        }
        MarketplaceListing listing = marketplaceListingRepository.findById(thread.getListingId())
                .orElseThrow(() -> new NotFoundException("Listing no encontrado"));
        UUID sellerId = listing.getSellerUserId();
        UUID buyerId = resolveBuyerId(thread, sellerId);
        if (!actorUserId.equals(buyerId)) {
            throw new AccessDeniedException("Solo el comprador puede iniciar la orden");
        }
        MarketplaceOrder existing = marketplaceOrderRepository.findByThreadId(threadId).orElse(null);
        if (existing != null && ACTIVE_ORDER_STATUSES.contains(existing.getStatus())) {
            return toDto(existing);
        }
        if (!legalAccepted) {
            throw new IllegalArgumentException("ORDER_POLICY_ACCEPTANCE_REQUIRED");
        }
        Map<String, Object> quote = marketplaceService.dealQuote(listing.getId(), subtotalOverride);
        MarketplaceOrder order = existing == null ? new MarketplaceOrder() : existing;
        order.setThreadId(threadId);
        order.setListingId(listing.getId());
        order.setBuyerUserId(buyerId);
        order.setSellerUserId(sellerId);
        order.setSubtotal(asMoney(quote.get("subtotal")));
        order.setCommissionRate(asMoney(quote.get("commissionRate")).setScale(4, RoundingMode.HALF_UP));
        order.setCommissionAmount(asMoney(quote.get("commissionAmount")));
        order.setSellerPayoutAmount(asMoney(quote.get("sellerPayoutAmount")));
        String listingCurrency = quote.get("currency") == null ? listing.getCurrency() : String.valueOf(quote.get("currency"));
        order.setCurrency(resolveCurrencySafe(listingCurrency, listing, buyerId, sellerId));
        order.setStatus("payment_pending");
        order.setProvider("simulated_escrow");
        order.setProviderRef("sim-" + threadId);
        order.setBuyerPolicyAcceptedAt(Instant.now());
        order.setTermsSummary(buildTermsSummarySnapshot(listing));
        order.setHoldReleaseAt(null);
        order.setPaymentReference(null);
        order.setPaymentReportedAt(null);
        order.setShippedAt(null);
        order.setDeliveredAt(null);
        order.setClosedAt(null);
        order = marketplaceOrderRepository.save(order);
        return toDto(order);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getOrderByThread(UUID actorUserId, UUID threadId) {
        ChatThread thread = chatThreadRepository.findById(threadId).orElseThrow(() -> new NotFoundException("Hilo no encontrado"));
        assertParticipant(thread, actorUserId);
        MarketplaceOrder order = marketplaceOrderRepository.findByThreadId(threadId)
                .orElseThrow(() -> new NotFoundException("Orden no encontrada"));
        return toDto(order);
    }

    @Transactional
    public Map<String, Object> simulatePaymentCapture(UUID actorUserId, UUID threadId) {
        MarketplaceOrder order = requireOrderForParticipant(actorUserId, threadId);
        if (!actorUserId.equals(order.getBuyerUserId())) {
            throw new AccessDeniedException("Solo el comprador puede confirmar pago");
        }
        if (!"payment_pending".equals(order.getStatus())) {
            throw new IllegalArgumentException("La orden no esta lista para capturar pago");
        }
        order.setStatus("paid_in_hold");
        order.setHoldReleaseAt(Instant.now().plus(HOLD_DAYS_DEFAULT, ChronoUnit.DAYS));
        return toDto(marketplaceOrderRepository.save(order));
    }

    @Transactional
    public Map<String, Object> simulateRelease(UUID actorUserId, UUID threadId) {
        MarketplaceOrder order = requireOrderForParticipant(actorUserId, threadId);
        if (!actorUserId.equals(order.getBuyerUserId())) {
            throw new AccessDeniedException("Solo el comprador puede liberar el pago");
        }
        if (!"paid_in_hold".equals(order.getStatus())) {
            throw new IllegalArgumentException("La orden no esta en retencion");
        }
        order.setStatus("released");
        return toDto(marketplaceOrderRepository.save(order));
    }

    @Transactional
    public Map<String, Object> reportPayment(UUID actorUserId, UUID threadId, String paymentReference) {
        MarketplaceOrder order = requireOrderForParticipant(actorUserId, threadId);
        if (!actorUserId.equals(order.getBuyerUserId())) {
            throw new AccessDeniedException("Solo el comprador puede reportar pago");
        }
        if (!"payment_pending".equals(order.getStatus())) {
            throw new IllegalArgumentException("La orden no esta lista para reportar pago");
        }
        order.setStatus("payment_reported");
        order.setPaymentReportedAt(Instant.now());
        order.setPaymentReference(trimTo(paymentReference, 160));
        return toDto(marketplaceOrderRepository.save(order));
    }

    @Transactional
    public Map<String, Object> markInTransit(UUID actorUserId, UUID threadId) {
        MarketplaceOrder order = requireOrderForParticipant(actorUserId, threadId);
        if (!actorUserId.equals(order.getSellerUserId())) {
            throw new AccessDeniedException("Solo el vendedor puede marcar envio");
        }
        if (!"payment_reported".equals(order.getStatus()) && !"paid_in_hold".equals(order.getStatus())) {
            throw new IllegalArgumentException("La orden no esta lista para marcar envio");
        }
        order.setStatus("in_transit");
        order.setShippedAt(Instant.now());
        return toDto(marketplaceOrderRepository.save(order));
    }

    @Transactional
    public Map<String, Object> markDelivered(UUID actorUserId, UUID threadId) {
        MarketplaceOrder order = requireOrderForParticipant(actorUserId, threadId);
        if (!actorUserId.equals(order.getBuyerUserId())) {
            throw new AccessDeniedException("Solo el comprador puede confirmar entrega");
        }
        if (!"in_transit".equals(order.getStatus())) {
            throw new IllegalArgumentException("La orden no esta en transito");
        }
        order.setStatus("delivered");
        order.setDeliveredAt(Instant.now());
        return toDto(marketplaceOrderRepository.save(order));
    }

    @Transactional
    public Map<String, Object> closeOrder(UUID actorUserId, UUID threadId) {
        MarketplaceOrder order = requireOrderForParticipant(actorUserId, threadId);
        boolean participant = actorUserId.equals(order.getBuyerUserId()) || actorUserId.equals(order.getSellerUserId());
        if (!participant) {
            throw new AccessDeniedException("No participas en esta orden");
        }
        if (!"delivered".equals(order.getStatus()) && !"released".equals(order.getStatus())) {
            throw new IllegalArgumentException("Solo puedes cerrar ordenes entregadas/liberadas");
        }
        order.setStatus("closed");
        order.setClosedAt(Instant.now());
        return toDto(marketplaceOrderRepository.save(order));
    }

    @Transactional
    public Map<String, Object> markDisputed(UUID actorUserId, UUID threadId) {
        MarketplaceOrder order = requireOrderForParticipant(actorUserId, threadId);
        if (!"paid_in_hold".equals(order.getStatus())
                && !"released".equals(order.getStatus())
                && !"payment_reported".equals(order.getStatus())
                && !"in_transit".equals(order.getStatus())
                && !"delivered".equals(order.getStatus())) {
            throw new IllegalArgumentException("Solo puedes disputar ordenes pagadas");
        }
        order.setStatus("disputed");
        return toDto(marketplaceOrderRepository.save(order));
    }

    @Transactional(readOnly = true)
    public MarketplaceOrder requireOrderForBuyerCheckout(UUID actorUserId, UUID threadId) {
        MarketplaceOrder order = requireOrderForParticipant(actorUserId, threadId);
        if (!actorUserId.equals(order.getBuyerUserId())) {
            throw new AccessDeniedException("Solo el comprador puede iniciar checkout");
        }
        if (!"payment_pending".equals(order.getStatus())) {
            throw new IllegalArgumentException("La orden no esta lista para checkout");
        }
        return order;
    }

    private MarketplaceOrder requireOrderForParticipant(UUID actorUserId, UUID threadId) {
        ChatThread thread = chatThreadRepository.findById(threadId).orElseThrow(() -> new NotFoundException("Hilo no encontrado"));
        assertParticipant(thread, actorUserId);
        return marketplaceOrderRepository.findByThreadId(threadId)
                .orElseThrow(() -> new NotFoundException("Orden no encontrada"));
    }

    private void assertParticipant(ChatThread thread, UUID userId) {
        if (!userId.equals(thread.getUserLow()) && !userId.equals(thread.getUserHigh())) {
            throw new AccessDeniedException("No participas en este hilo");
        }
    }

    private UUID resolveBuyerId(ChatThread thread, UUID sellerId) {
        if (sellerId.equals(thread.getUserLow())) return thread.getUserHigh();
        if (sellerId.equals(thread.getUserHigh())) return thread.getUserLow();
        throw new IllegalArgumentException("El listing no corresponde a los participantes del hilo");
    }

    private BigDecimal asMoney(Object value) {
        if (value == null) return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        if (value instanceof BigDecimal bd) return bd.setScale(2, RoundingMode.HALF_UP);
        return new BigDecimal(String.valueOf(value)).setScale(2, RoundingMode.HALF_UP);
    }

    private String resolveCurrencySafe(String requested, MarketplaceListing listing, UUID buyerUserId, UUID sellerUserId) {
        String normalized = requested == null ? "" : requested.trim().toUpperCase();
        if (SUPPORTED_CURRENCIES.contains(normalized)) return normalized;
        String byListingCountry = currencyByCountry(listing.getCountry());
        if (byListingCountry != null) return byListingCountry;
        User buyer = userRepository.findById(buyerUserId).orElse(null);
        String byBuyer = buyer == null ? null : currencyByCountry(buyer.getProfileCountry());
        if (byBuyer != null) return byBuyer;
        User seller = userRepository.findById(sellerUserId).orElse(null);
        String bySeller = seller == null ? null : currencyByCountry(seller.getProfileCountry());
        return bySeller != null ? bySeller : "USD";
    }

    private String currencyByCountry(String countryRaw) {
        if (countryRaw == null || countryRaw.isBlank()) return null;
        String v = countryRaw.trim().toLowerCase();
        if (v.equals("mexico") || v.equals("mx")) return "MXN";
        if (v.equals("united states") || v.equals("usa") || v.equals("us")) return "USD";
        if (v.equals("canada") || v.equals("ca")) return "CAD";
        return null;
    }

    private Map<String, Object> toDto(MarketplaceOrder order) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", order.getId());
        out.put("threadId", order.getThreadId());
        out.put("listingId", order.getListingId());
        out.put("buyerUserId", order.getBuyerUserId());
        out.put("sellerUserId", order.getSellerUserId());
        out.put("currency", order.getCurrency());
        out.put("subtotal", order.getSubtotal());
        out.put("commissionRate", order.getCommissionRate());
        out.put("commissionAmount", order.getCommissionAmount());
        out.put("sellerPayoutAmount", order.getSellerPayoutAmount());
        out.put("status", order.getStatus());
        out.put("holdReleaseAt", order.getHoldReleaseAt());
        out.put("provider", order.getProvider());
        out.put("providerRef", order.getProviderRef());
        out.put("buyerPolicyAcceptedAt", order.getBuyerPolicyAcceptedAt());
        out.put("termsSummary", order.getTermsSummary());
        out.put("paymentReference", order.getPaymentReference());
        out.put("paymentReportedAt", order.getPaymentReportedAt());
        out.put("shippedAt", order.getShippedAt());
        out.put("deliveredAt", order.getDeliveredAt());
        out.put("closedAt", order.getClosedAt());
        out.put("simulated", true);
        return out;
    }

    private String buildTermsSummarySnapshot(MarketplaceListing listing) {
        if (listing == null) return null;
        StringBuilder sb = new StringBuilder();
        appendSummary(sb, "listing", listing.getTitle());
        appendSummary(sb, "species", listing.getSpeciesName());
        appendSummary(sb, "price", listing.getPriceAmount() != null ? listing.getPriceAmount() + " " + (listing.getCurrency() == null ? "" : listing.getCurrency()) : null);
        appendSummary(sb, "location", joinParts(listing.getCity(), listing.getState(), listing.getCountry()));
        appendSummary(sb, "pedigreeRef", listing.getPedigreeRef());
        appendSummary(sb, "wildCaught", listing.isWildCaught() ? "yes" : "no");
        appendSummary(sb, "captureOriginIso", listing.getCaptureOriginCountryIso());
        appendSummary(sb, "permitRefs", listing.getRegulatoryPermitRefs());
        return sb.toString();
    }

    private static void appendSummary(StringBuilder sb, String key, String value) {
        String v = trimTo(value, 420);
        if (v == null || v.isBlank()) return;
        if (!sb.isEmpty()) sb.append(" | ");
        sb.append(key).append(": ").append(v);
    }

    private static String joinParts(String a, String b, String c) {
        StringBuilder sb = new StringBuilder();
        if (a != null && !a.isBlank()) sb.append(a.trim());
        if (b != null && !b.isBlank()) {
            if (!sb.isEmpty()) sb.append(", ");
            sb.append(b.trim());
        }
        if (c != null && !c.isBlank()) {
            if (!sb.isEmpty()) sb.append(", ");
            sb.append(c.trim());
        }
        return sb.toString();
    }

    private static String trimTo(String value, int max) {
        if (value == null) return null;
        String out = value.trim();
        if (out.isEmpty()) return null;
        return out.length() <= max ? out : out.substring(0, max);
    }
}
