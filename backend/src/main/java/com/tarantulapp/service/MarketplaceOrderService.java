package com.tarantulapp.service;

import com.tarantulapp.entity.ChatThread;
import com.tarantulapp.entity.MarketplaceListing;
import com.tarantulapp.entity.MarketplaceOrder;
import com.tarantulapp.entity.ProDayGrantSource;
import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.entity.MarketplaceOrderEvent;
import com.tarantulapp.repository.ChatThreadRepository;
import com.tarantulapp.repository.MarketplaceListingRepository;
import com.tarantulapp.repository.MarketplaceOrderEventRepository;
import com.tarantulapp.repository.MarketplaceOrderRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class MarketplaceOrderService {
    /**
     * In-flight statuses (one marketplace order row per chat thread): do not replace the row once the deal progressed.
     * {@code closed} is terminal; disputed/released/etc. stay immutable until dispute resolution elsewhere.
     */
    private static final Set<String> OPEN_PIPELINE_STATUSES = Set.of(
            "payment_pending", "payment_reported", "paid_in_hold", "in_transit", "delivered", "released", "disputed"
    );
    private static final Set<String> SUPPORTED_CURRENCIES = Set.of("MXN", "USD", "CAD");
    private static final int HOLD_DAYS_DEFAULT = 3;
    /** Pro days granted to the buyer when a Verified Origin issuer authorizes their purchase. */
    private static final int MARKETPLACE_PURCHASE_PRO_DAYS = 30;
    private static final Set<String> RECEIPT_KINDS = Set.of("in_store_upload", "online_email");

    private final ChatThreadRepository chatThreadRepository;
    private final MarketplaceListingRepository marketplaceListingRepository;
    private final MarketplaceOrderRepository marketplaceOrderRepository;
    private final MarketplaceOrderEventRepository marketplaceOrderEventRepository;
    private final UserRepository userRepository;
    private final MarketplaceService marketplaceService;
    private final MarketplaceOrderAuditService marketplaceOrderAuditService;
    private final ProDayGrantService proDayGrantService;
    private final NotificationService notificationService;

    public MarketplaceOrderService(ChatThreadRepository chatThreadRepository,
                                   MarketplaceListingRepository marketplaceListingRepository,
                                   MarketplaceOrderRepository marketplaceOrderRepository,
                                   MarketplaceOrderEventRepository marketplaceOrderEventRepository,
                                   UserRepository userRepository,
                                   MarketplaceService marketplaceService,
                                   MarketplaceOrderAuditService marketplaceOrderAuditService,
                                   ProDayGrantService proDayGrantService,
                                   NotificationService notificationService) {
        this.chatThreadRepository = chatThreadRepository;
        this.marketplaceListingRepository = marketplaceListingRepository;
        this.marketplaceOrderRepository = marketplaceOrderRepository;
        this.marketplaceOrderEventRepository = marketplaceOrderEventRepository;
        this.userRepository = userRepository;
        this.marketplaceService = marketplaceService;
        this.marketplaceOrderAuditService = marketplaceOrderAuditService;
        this.proDayGrantService = proDayGrantService;
        this.notificationService = notificationService;
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
        if (existing != null) {
            if ("closed".equals(existing.getStatus())) {
                return toDto(existing);
            }
            if (OPEN_PIPELINE_STATUSES.contains(existing.getStatus())) {
                return toDto(existing);
            }
        }
        if (!legalAccepted) {
            throw new IllegalArgumentException("ORDER_POLICY_ACCEPTANCE_REQUIRED");
        }
        String prevStatusSnapshot = existing == null ? null : existing.getStatus();
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
        // Verified Origin issuer authorization overlay: if the seller is a Verified Origin issuer,
        // the order is blocked until they authorize it (which grants the buyer Pro days + custody).
        User seller = userRepository.findById(sellerId).orElse(null);
        boolean issuerVerified = VerifiedOriginService.isVerified(seller);
        order.setRequiresIssuerValidation(issuerVerified);
        order.setIssuerValidationStatus(issuerVerified ? "pending" : null);
        order = marketplaceOrderRepository.save(order);
        String eventLabel = prevStatusSnapshot == null ? "order_created" : "order_refreshed";
        marketplaceOrderAuditService.append(order.getId(), buyerId, eventLabel, prevStatusSnapshot, order.getStatus(), null);
        if (issuerVerified && prevStatusSnapshot == null) {
            notifyIssuerAuthorizationNeeded(order);
        }
        return toDto(order);
    }

    /**
     * Buyer attaches proof of purchase to an issuer-validated order: an uploaded receipt for in-store
     * buys, or {@code online_email} to record that the platform emailed the receipt for online buys.
     * The order stays blocked until the issuer authorizes it at delivery.
     */
    @Transactional
    public Map<String, Object> attachReceipt(UUID actorUserId, UUID threadId, String receiptUrl, String kind) {
        MarketplaceOrder order = requireOrderForParticipant(actorUserId, threadId);
        if (!actorUserId.equals(order.getBuyerUserId())) {
            throw new AccessDeniedException("Solo el comprador puede adjuntar el recibo");
        }
        if (!order.isRequiresIssuerValidation()) {
            throw new IllegalArgumentException("Esta orden no requiere validación del emisor");
        }
        String normalizedKind = kind == null ? "" : kind.trim().toLowerCase();
        if (!RECEIPT_KINDS.contains(normalizedKind)) {
            throw new IllegalArgumentException("RECEIPT_KIND_INVALID");
        }
        if ("in_store_upload".equals(normalizedKind) && (receiptUrl == null || receiptUrl.isBlank())) {
            throw new IllegalArgumentException("RECEIPT_FILE_REQUIRED");
        }
        order.setReceiptUrl(trimTo(receiptUrl, 1000));
        order.setReceiptKind(normalizedKind);
        order = marketplaceOrderRepository.save(order);
        marketplaceOrderAuditService.append(order.getId(), actorUserId, "receipt_attached", order.getStatus(),
                order.getStatus(), "kind=" + normalizedKind);
        notifyIssuerReceiptAttached(order);
        return toDto(order);
    }

    /**
     * Verified Origin issuer authorizes (or rejects) the purchase at delivery. Authorizing unblocks the
     * order and grants the buyer Pro days exactly once; rejecting leaves the order blocked and informs
     * the buyer. Only the seller (issuer) may call this.
     */
    @Transactional
    public Map<String, Object> issuerValidate(UUID actorUserId, UUID threadId, boolean authorize, String note) {
        MarketplaceOrder order = requireOrderForParticipant(actorUserId, threadId);
        if (!actorUserId.equals(order.getSellerUserId())) {
            throw new AccessDeniedException("Solo el emisor (vendedor) puede validar la orden");
        }
        if (!order.isRequiresIssuerValidation()) {
            throw new IllegalArgumentException("Esta orden no requiere validación del emisor");
        }
        if ("authorized".equals(order.getIssuerValidationStatus())) {
            return toDto(order);
        }
        String noteTrim = trimTo(note, 420);
        if (authorize) {
            order.setIssuerValidationStatus("authorized");
            order.setIssuerValidatedAt(Instant.now());
            if (!order.isProGrantDone()) {
                User buyer = userRepository.findById(order.getBuyerUserId()).orElse(null);
                if (buyer != null) {
                    proDayGrantService.recordGrant(buyer, MARKETPLACE_PURCHASE_PRO_DAYS,
                            ProDayGrantSource.MARKETPLACE_PURCHASE, "marketplace_order:" + order.getId(), null);
                }
                order.setProGrantDone(true);
            }
            order = marketplaceOrderRepository.save(order);
            marketplaceOrderAuditService.append(order.getId(), actorUserId, "issuer_authorized",
                    order.getStatus(), order.getStatus(), noteTrim);
            notifyBuyerAuthorized(order);
        } else {
            order.setIssuerValidationStatus("rejected");
            order = marketplaceOrderRepository.save(order);
            marketplaceOrderAuditService.append(order.getId(), actorUserId, "issuer_rejected",
                    order.getStatus(), order.getStatus(), noteTrim);
            notifyBuyerRejected(order);
        }
        return toDto(order);
    }

    private void notifyIssuerAuthorizationNeeded(MarketplaceOrder order) {
        notificationService.create(order.getSellerUserId(), order.getBuyerUserId(),
                "MARKETPLACE_ISSUER_AUTHORIZATION",
                "Verified Origin: authorize a sale",
                "A buyer purchased one of your listings. Validate the receipt at delivery to authorize "
                        + "their Pro days and confirm custody.",
                threadRoute(order));
    }

    private void notifyIssuerReceiptAttached(MarketplaceOrder order) {
        notificationService.create(order.getSellerUserId(), order.getBuyerUserId(),
                "MARKETPLACE_ISSUER_AUTHORIZATION",
                "Verified Origin: receipt attached",
                "The buyer attached proof of purchase. Review and authorize the order at delivery.",
                threadRoute(order));
    }

    private void notifyBuyerAuthorized(MarketplaceOrder order) {
        notificationService.create(order.getBuyerUserId(), order.getSellerUserId(),
                "MARKETPLACE_ISSUER_AUTHORIZATION",
                "Purchase authorized",
                "The Verified Origin issuer authorized your purchase. Your Pro days have been added.",
                threadRoute(order));
    }

    private void notifyBuyerRejected(MarketplaceOrder order) {
        notificationService.create(order.getBuyerUserId(), order.getSellerUserId(),
                "MARKETPLACE_ISSUER_AUTHORIZATION",
                "Purchase needs attention",
                "The issuer could not authorize your purchase yet. Open the order for next steps.",
                threadRoute(order));
    }

    private Map<String, Object> threadRoute(MarketplaceOrder order) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("route", "/marketplace/messages?thread=" + order.getThreadId());
        data.put("threadId", order.getThreadId());
        data.put("orderId", order.getId());
        return data;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listOrderEventsForThread(UUID actorUserId, UUID threadId) {
        MarketplaceOrder order = requireOrderForParticipant(actorUserId, threadId);
        List<MarketplaceOrderEvent> rows = marketplaceOrderEventRepository.findTop200ByOrderIdOrderByCreatedAtAsc(order.getId());
        List<Map<String, Object>> out = new ArrayList<>();
        for (MarketplaceOrderEvent e : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", e.getId());
            m.put("orderId", e.getOrderId());
            m.put("actorUserId", e.getActorUserId());
            m.put("eventType", e.getEventType());
            m.put("fromStatus", e.getFromStatus());
            m.put("toStatus", e.getToStatus());
            m.put("payload", e.getPayload());
            m.put("createdAt", e.getCreatedAt());
            out.add(m);
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listMyOrders(UUID actorUserId, String role, int limitRaw) {
        int limit = Math.max(1, Math.min(limitRaw, 100));
        String normalized = role == null ? "all" : role.trim().toLowerCase();
        List<MarketplaceOrder> merged = new ArrayList<>();
        if ("seller".equals(normalized) || "selling".equals(normalized)) {
            merged.addAll(marketplaceOrderRepository.findTop100BySellerUserIdOrderByCreatedAtDesc(actorUserId));
        } else if ("buyer".equals(normalized) || "buying".equals(normalized)) {
            merged.addAll(marketplaceOrderRepository.findTop100ByBuyerUserIdOrderByCreatedAtDesc(actorUserId));
        } else {
            merged.addAll(marketplaceOrderRepository.findTop100ByBuyerUserIdOrderByCreatedAtDesc(actorUserId));
            merged.addAll(marketplaceOrderRepository.findTop100BySellerUserIdOrderByCreatedAtDesc(actorUserId));
        }
        Map<UUID, MarketplaceOrder> byId = new LinkedHashMap<>();
        for (MarketplaceOrder o : merged) {
            byId.merge(o.getId(), o, (a, b) -> {
                Instant ua = Objects.requireNonNullElse(a.getUpdatedAt(), Instant.EPOCH);
                Instant ub = Objects.requireNonNullElse(b.getUpdatedAt(), Instant.EPOCH);
                return ua.isBefore(ub) ? b : a;
            });
        }
        List<MarketplaceOrder> sorted = new ArrayList<>(byId.values());
        sorted.sort(Comparator.comparing((MarketplaceOrder o) -> Objects.requireNonNullElse(o.getUpdatedAt(), Instant.EPOCH)).reversed());
        return sorted.stream().limit(limit).map(this::toDto).toList();
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
        String from = order.getStatus();
        order.setStatus("paid_in_hold");
        order.setHoldReleaseAt(Instant.now().plus(HOLD_DAYS_DEFAULT, ChronoUnit.DAYS));
        order = marketplaceOrderRepository.save(order);
        marketplaceOrderAuditService.append(order.getId(), actorUserId, "simulate_payment_capture", from, order.getStatus(), null);
        return toDto(order);
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
        String from = order.getStatus();
        order.setStatus("released");
        order = marketplaceOrderRepository.save(order);
        marketplaceOrderAuditService.append(order.getId(), actorUserId, "simulate_release", from, order.getStatus(), null);
        return toDto(order);
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
        String from = order.getStatus();
        order.setStatus("payment_reported");
        order.setPaymentReportedAt(Instant.now());
        order.setPaymentReference(trimTo(paymentReference, 160));
        order = marketplaceOrderRepository.save(order);
        marketplaceOrderAuditService.append(order.getId(), actorUserId, "payment_reported", from, order.getStatus(),
                order.getPaymentReference() == null ? null : ("paymentReference=" + order.getPaymentReference()));
        return toDto(order);
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
        String from = order.getStatus();
        order.setStatus("in_transit");
        order.setShippedAt(Instant.now());
        order = marketplaceOrderRepository.save(order);
        marketplaceOrderAuditService.append(order.getId(), actorUserId, "marked_in_transit", from, order.getStatus(), null);
        return toDto(order);
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
        String from = order.getStatus();
        order.setStatus("delivered");
        order.setDeliveredAt(Instant.now());
        order = marketplaceOrderRepository.save(order);
        marketplaceOrderAuditService.append(order.getId(), actorUserId, "delivered_confirmed", from, order.getStatus(), null);
        return toDto(order);
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
        String from = order.getStatus();
        order.setStatus("closed");
        order.setClosedAt(Instant.now());
        order = marketplaceOrderRepository.save(order);
        marketplaceOrderAuditService.append(order.getId(), actorUserId, "closed", from, order.getStatus(), null);
        return toDto(order);
    }

    /** Report a deal issue to TarantulApp (trust & safety). Does not escrow or adjudicate payment. */
    @Transactional
    public Map<String, Object> reportIssue(UUID actorUserId, UUID threadId) {
        MarketplaceOrder order = requireOrderForParticipant(actorUserId, threadId);
        if ("disputed".equals(order.getStatus()) || "closed".equals(order.getStatus())) {
            throw new IllegalArgumentException("La orden ya está cerrada o reportada");
        }
        if (!"payment_pending".equals(order.getStatus())
                && !"payment_reported".equals(order.getStatus())
                && !"paid_in_hold".equals(order.getStatus())
                && !"released".equals(order.getStatus())
                && !"in_transit".equals(order.getStatus())
                && !"delivered".equals(order.getStatus())) {
            throw new IllegalArgumentException("No hay una orden activa para reportar");
        }
        String from = order.getStatus();
        order.setStatus("disputed");
        order = marketplaceOrderRepository.save(order);
        marketplaceOrderAuditService.append(order.getId(), actorUserId, "issue_reported", from, order.getStatus(), null);
        return toDto(order);
    }

    /** @deprecated Use {@link #reportIssue}; kept for older clients. */
    @Transactional
    public Map<String, Object> markDisputed(UUID actorUserId, UUID threadId) {
        return reportIssue(actorUserId, threadId);
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
        out.put("requiresIssuerValidation", order.isRequiresIssuerValidation());
        out.put("issuerValidationStatus", order.getIssuerValidationStatus());
        out.put("issuerValidatedAt", order.getIssuerValidatedAt());
        out.put("receiptUrl", order.getReceiptUrl());
        out.put("receiptKind", order.getReceiptKind());
        // Blocked until a Verified Origin issuer authorizes the sale.
        out.put("issuerBlocked", order.isRequiresIssuerValidation()
                && !"authorized".equals(order.getIssuerValidationStatus()));
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
