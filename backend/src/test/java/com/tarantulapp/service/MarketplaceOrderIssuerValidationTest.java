package com.tarantulapp.service;

import com.tarantulapp.entity.ChatThread;
import com.tarantulapp.entity.MarketplaceOrder;
import com.tarantulapp.entity.ProDayGrantSource;
import com.tarantulapp.entity.User;
import com.tarantulapp.repository.ChatThreadRepository;
import com.tarantulapp.repository.MarketplaceListingRepository;
import com.tarantulapp.repository.MarketplaceOrderEventRepository;
import com.tarantulapp.repository.MarketplaceOrderRepository;
import com.tarantulapp.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarketplaceOrderIssuerValidationTest {

    @Mock private ChatThreadRepository chatThreadRepository;
    @Mock private MarketplaceListingRepository marketplaceListingRepository;
    @Mock private MarketplaceOrderRepository marketplaceOrderRepository;
    @Mock private MarketplaceOrderEventRepository marketplaceOrderEventRepository;
    @Mock private UserRepository userRepository;
    @Mock private MarketplaceService marketplaceService;
    @Mock private MarketplaceOrderAuditService marketplaceOrderAuditService;
    @Mock private ProDayGrantService proDayGrantService;
    @Mock private NotificationService notificationService;

    private MarketplaceOrderService service;

    private final UUID threadId = UUID.randomUUID();
    private final UUID issuerId = UUID.randomUUID();
    private final UUID buyerId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new MarketplaceOrderService(chatThreadRepository, marketplaceListingRepository,
                marketplaceOrderRepository, marketplaceOrderEventRepository, userRepository,
                marketplaceService, marketplaceOrderAuditService, proDayGrantService, notificationService);
    }

    private void stubThreadAndOrder(MarketplaceOrder order) {
        ChatThread thread = new ChatThread();
        thread.setUserLow(issuerId);
        thread.setUserHigh(buyerId);
        when(chatThreadRepository.findById(threadId)).thenReturn(Optional.of(thread));
        when(marketplaceOrderRepository.findByThreadId(threadId)).thenReturn(Optional.of(order));
        lenient().when(marketplaceOrderRepository.save(any(MarketplaceOrder.class))).thenAnswer(i -> i.getArgument(0));
    }

    private MarketplaceOrder pendingIssuerOrder() {
        MarketplaceOrder order = new MarketplaceOrder();
        order.setId(UUID.randomUUID());
        order.setThreadId(threadId);
        order.setSellerUserId(issuerId);
        order.setBuyerUserId(buyerId);
        order.setStatus("payment_pending");
        order.setRequiresIssuerValidation(true);
        order.setIssuerValidationStatus("pending");
        return order;
    }

    @Test
    void issuerAuthorizeGrantsProDaysOnceAndUnblocks() {
        MarketplaceOrder order = pendingIssuerOrder();
        stubThreadAndOrder(order);
        User buyer = new User();
        buyer.setId(buyerId);
        buyer.setEmail("buyer@example.com");
        when(userRepository.findById(buyerId)).thenReturn(Optional.of(buyer));

        Map<String, Object> dto = service.issuerValidate(issuerId, threadId, true, "validated at delivery");

        assertEquals("authorized", dto.get("issuerValidationStatus"));
        assertEquals(false, dto.get("issuerBlocked"));
        assertTrue(order.isProGrantDone());
        verify(proDayGrantService, times(1)).recordGrant(eq(buyer), eq(30),
                eq(ProDayGrantSource.MARKETPLACE_PURCHASE), any(), eq(null));
        verify(notificationService).create(eq(buyerId), eq(issuerId), eq("MARKETPLACE_ISSUER_AUTHORIZATION"),
                any(), any(), any());
    }

    @Test
    void issuerAuthorizeIsIdempotentAndDoesNotDoubleGrant() {
        MarketplaceOrder order = pendingIssuerOrder();
        order.setIssuerValidationStatus("authorized");
        order.setProGrantDone(true);
        stubThreadAndOrder(order);

        Map<String, Object> dto = service.issuerValidate(issuerId, threadId, true, null);

        assertEquals("authorized", dto.get("issuerValidationStatus"));
        verify(proDayGrantService, never()).recordGrant(any(), org.mockito.ArgumentMatchers.anyInt(), any(), any(), any());
    }

    @Test
    void onlyIssuerCanValidate() {
        MarketplaceOrder order = pendingIssuerOrder();
        stubThreadAndOrder(order);
        assertThrows(AccessDeniedException.class, () -> service.issuerValidate(buyerId, threadId, true, null));
    }

    @Test
    void attachReceiptRejectsInStoreWithoutFile() {
        MarketplaceOrder order = pendingIssuerOrder();
        stubThreadAndOrder(order);
        assertThrows(IllegalArgumentException.class,
                () -> service.attachReceipt(buyerId, threadId, null, "in_store_upload"));
    }

    @Test
    void attachReceiptAcceptsOnlineEmail() {
        MarketplaceOrder order = pendingIssuerOrder();
        stubThreadAndOrder(order);
        Map<String, Object> dto = service.attachReceipt(buyerId, threadId, null, "online_email");
        assertEquals("online_email", dto.get("receiptKind"));
        verify(notificationService).create(eq(issuerId), eq(buyerId), eq("MARKETPLACE_ISSUER_AUTHORIZATION"),
                any(), any(), any());
    }
}
