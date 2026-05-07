package com.tarantulapp.controller;

import com.tarantulapp.service.ChatService;
import com.tarantulapp.service.ChatThreadPushDeliveryService;
import com.tarantulapp.service.BillingService;
import com.tarantulapp.service.MarketplaceOrderService;
import com.tarantulapp.util.SecurityHelper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;
    private final MarketplaceOrderService marketplaceOrderService;
    private final BillingService billingService;
    private final ChatThreadPushDeliveryService chatThreadPushDeliveryService;
    private final SecurityHelper securityHelper;

    public ChatController(ChatService chatService,
                          MarketplaceOrderService marketplaceOrderService,
                          BillingService billingService,
                          ChatThreadPushDeliveryService chatThreadPushDeliveryService,
                          SecurityHelper securityHelper) {
        this.chatService = chatService;
        this.marketplaceOrderService = marketplaceOrderService;
        this.billingService = billingService;
        this.chatThreadPushDeliveryService = chatThreadPushDeliveryService;
        this.securityHelper = securityHelper;
    }

    record OpenThreadRequest(UUID otherUserId, UUID listingId) {}

    record SendMessageRequest(@NotBlank @Size(max = 4000) String body) {}
    record UpdateTransactionStatusRequest(@NotBlank String status) {}
    record AddThreadEventRequest(@NotBlank String eventType, String note, String evidenceUrl, List<String> evidenceUrls) {}
    record CreateOrderIntentRequest(String subtotalOverride, Boolean legalAccepted) {}

    @GetMapping("/threads")
    public ResponseEntity<Map<String, Object>> threads(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(chatService.listThreads(uid, page, size));
    }

    @PostMapping("/threads/open")
    public ResponseEntity<Map<String, Object>> open(@Valid @RequestBody OpenThreadRequest req) {
        UUID uid = securityHelper.getCurrentUserId();
        if (req.otherUserId() == null) {
            throw new IllegalArgumentException("otherUserId requerido");
        }
        return ResponseEntity.ok(chatService.openOrGetThread(uid, req.otherUserId(), req.listingId()));
    }

    @GetMapping("/threads/{threadId}/messages")
    public ResponseEntity<Map<String, Object>> messages(
            @PathVariable UUID threadId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(chatService.listMessages(uid, threadId, page, size));
    }

    @PostMapping("/threads/{threadId}/messages")
    public ResponseEntity<Map<String, Object>> send(
            @PathVariable UUID threadId,
            @Valid @RequestBody SendMessageRequest req) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(chatService.sendMessage(uid, threadId, req.body()));
    }

    @PostMapping("/threads/{threadId}/transaction-status")
    public ResponseEntity<Map<String, Object>> updateTransactionStatus(
            @PathVariable UUID threadId,
            @Valid @RequestBody UpdateTransactionStatusRequest req) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(chatService.updateTransactionStatus(uid, threadId, req.status()));
    }

    @GetMapping("/threads/{threadId}/events")
    public ResponseEntity<Object> listEvents(@PathVariable UUID threadId) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(chatService.listThreadEvents(uid, threadId));
    }

    /** Push notification audit rows for marketplace deal threads (participants only). */
    @GetMapping("/threads/{threadId}/push-deliveries")
    public ResponseEntity<List<Map<String, Object>>> pushDeliveries(@PathVariable UUID threadId) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(chatThreadPushDeliveryService.listForThreadParticipant(uid, threadId));
    }

    @PostMapping("/threads/{threadId}/events")
    public ResponseEntity<Map<String, Object>> addEvent(
            @PathVariable UUID threadId,
            @Valid @RequestBody AddThreadEventRequest req) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(chatService.addThreadEvent(uid, threadId, req.eventType(), req.note(), req.evidenceUrl(), req.evidenceUrls()));
    }

    @PostMapping(value = "/threads/{threadId}/events/evidence", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadEventEvidence(
            @PathVariable UUID threadId,
            @RequestPart("file") MultipartFile file) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(chatService.uploadThreadEventEvidence(uid, threadId, file));
    }

    @PostMapping("/threads/{threadId}/order-intent")
    public ResponseEntity<Map<String, Object>> createOrderIntent(@PathVariable UUID threadId,
                                                                 @RequestBody(required = false) CreateOrderIntentRequest req) {
        UUID uid = securityHelper.getCurrentUserId();
        java.math.BigDecimal subtotal = null;
        if (req != null && req.subtotalOverride() != null && !req.subtotalOverride().isBlank()) {
            subtotal = new java.math.BigDecimal(req.subtotalOverride());
        }
        boolean legalAccepted = req != null && Boolean.TRUE.equals(req.legalAccepted());
        return ResponseEntity.ok(marketplaceOrderService.createOrGetOrderIntent(uid, threadId, subtotal, legalAccepted));
    }

    @GetMapping("/threads/{threadId}/order")
    public ResponseEntity<Map<String, Object>> threadOrder(@PathVariable UUID threadId) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(marketplaceOrderService.getOrderByThread(uid, threadId));
    }

    @PostMapping("/threads/{threadId}/order/simulate-payment")
    public ResponseEntity<Map<String, Object>> simulateOrderPayment(@PathVariable UUID threadId) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(marketplaceOrderService.simulatePaymentCapture(uid, threadId));
    }

    @PostMapping("/threads/{threadId}/order/simulate-release")
    public ResponseEntity<Map<String, Object>> simulateOrderRelease(@PathVariable UUID threadId) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(marketplaceOrderService.simulateRelease(uid, threadId));
    }

    @PostMapping("/threads/{threadId}/order/dispute")
    public ResponseEntity<Map<String, Object>> disputeOrder(@PathVariable UUID threadId) {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(marketplaceOrderService.markDisputed(uid, threadId));
    }

    @PostMapping("/threads/{threadId}/order/checkout")
    public ResponseEntity<Map<String, Object>> orderCheckout(@PathVariable UUID threadId) {
        UUID uid = securityHelper.getCurrentUserId();
        var order = marketplaceOrderService.requireOrderForBuyerCheckout(uid, threadId);
        String email = securityHelper.getCurrentUserEmail();
        String url = billingService.createMarketplaceOrderCheckoutSession(uid, order, email);
        return ResponseEntity.ok(Map.of("url", url, "checkoutEnabled", true));
    }
}
