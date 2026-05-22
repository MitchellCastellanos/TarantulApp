package com.tarantulapp.service;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.OfficialVendorRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PartnerCartHandoffService {

    private final OfficialVendorRepository officialVendorRepository;
    private final String monarchStoreBaseUrl;

    public PartnerCartHandoffService(
            OfficialVendorRepository officialVendorRepository,
            @Value("${app.partner-sync.adapters.woocommerce.monarch-base-url:https://monarchreptiles.com}") String monarchStoreBaseUrl) {
        this.officialVendorRepository = officialVendorRepository;
        this.monarchStoreBaseUrl = trimTrailingSlash(monarchStoreBaseUrl);
    }

    public Map<String, Object> buildHandoff(String vendorSlug, List<CartLine> lines) {
        OfficialVendor vendor = officialVendorRepository.findBySlug(vendorSlug)
                .orElseThrow(() -> new NotFoundException("Partner no encontrado"));
        if (lines == null || lines.isEmpty()) {
            throw new IllegalArgumentException("El carrito esta vacio");
        }
        List<CartLine> normalized = normalizeLines(lines);
        HandoffTarget target = resolveHandoffTarget(normalized);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("vendorSlug", vendor.getSlug());
        out.put("vendorName", vendor.getName());
        out.put("checkoutUrl", target.checkoutUrl());
        out.put("lineCount", normalized.size());
        out.put("utmSource", "tarantulapp");
        out.put("handoffMode", target.mode());
        if (target.fallbackBatchUrl() != null) {
            out.put("fallbackBatchUrl", target.fallbackBatchUrl());
        }
        if (!target.addToCartUrls().isEmpty()) {
            out.put("addToCartUrls", target.addToCartUrls());
        }
        out.put("cartUrl", withPartnerUtm(monarchStoreBaseUrl + "/cart/"));
        return out;
    }

    private HandoffTarget resolveHandoffTarget(List<CartLine> lines) {
        List<String> addToCartUrls = lines.stream()
                .map(this::productPageAddToCartUrl)
                .toList();
        String cartUrl = withPartnerUtm(monarchStoreBaseUrl + "/cart/");

        if (lines.size() == 1) {
            return new HandoffTarget(addToCartUrls.get(0), "product_page_add", null, addToCartUrls);
        }

        return new HandoffTarget(
                buildCommaBatchUrl(lines),
                "batch_fill",
                buildColonBatchUrl(lines),
                addToCartUrls);
    }

    /** WooCommerce comma batch on store root (works when Monarch enables multi-add plugin). */
    private String buildCommaBatchUrl(List<CartLine> lines) {
        String ids = lines.stream().map(CartLine::externalProductId).collect(Collectors.joining(","));
        String qtys = lines.stream().map(l -> String.valueOf(l.quantity())).collect(Collectors.joining(","));
        return UriComponentsBuilder.fromHttpUrl(monarchStoreBaseUrl + "/")
                .queryParam("add-to-cart", ids)
                .queryParam("quantity", qtys)
                .queryParam("utm_source", "tarantulapp")
                .queryParam("utm_medium", "partner_cart")
                .build(true)
                .toUriString();
    }

    /** Plugin-style id:qty pairs (fallback if comma batch is blocked). */
    private String buildColonBatchUrl(List<CartLine> lines) {
        String packed = lines.stream()
                .map(l -> l.externalProductId() + ":" + l.quantity())
                .collect(Collectors.joining(","));
        return UriComponentsBuilder.fromHttpUrl(monarchStoreBaseUrl + "/cart/")
                .queryParam("add-to-cart", packed)
                .queryParam("utm_source", "tarantulapp")
                .queryParam("utm_medium", "partner_cart")
                .build(true)
                .toUriString();
    }

    private String productPageAddToCartUrl(CartLine line) {
        if (line.canonicalUrl() != null && !line.canonicalUrl().isBlank()) {
            return UriComponentsBuilder.fromHttpUrl(line.canonicalUrl().trim())
                    .queryParam("add-to-cart", line.externalProductId())
                    .queryParam("quantity", line.quantity())
                    .queryParam("utm_source", "tarantulapp")
                    .queryParam("utm_medium", "partner_cart")
                    .build(true)
                    .toUriString();
        }
        return UriComponentsBuilder.fromHttpUrl(monarchStoreBaseUrl + "/")
                .queryParam("add-to-cart", line.externalProductId())
                .queryParam("quantity", line.quantity())
                .queryParam("utm_source", "tarantulapp")
                .queryParam("utm_medium", "partner_cart")
                .build(true)
                .toUriString();
    }

    private String withPartnerUtm(String url) {
        if (url == null || url.isBlank()) {
            return monarchStoreBaseUrl + "/cart/";
        }
        return UriComponentsBuilder.fromHttpUrl(url.trim())
                .queryParam("utm_source", "tarantulapp")
                .queryParam("utm_medium", "partner_cart")
                .build(true)
                .toUriString();
    }

    private List<CartLine> normalizeLines(List<CartLine> lines) {
        List<CartLine> out = new ArrayList<>();
        for (CartLine line : lines) {
            if (line == null || line.externalProductId() == null || line.externalProductId().isBlank()) {
                continue;
            }
            int qty = line.quantity() == null || line.quantity() < 1 ? 1 : Math.min(line.quantity(), 99);
            String canonical = line.canonicalUrl() == null ? null : line.canonicalUrl().trim();
            if (canonical != null && canonical.isEmpty()) {
                canonical = null;
            }
            out.add(new CartLine(line.externalProductId().trim(), qty, line.title(), canonical));
        }
        if (out.isEmpty()) {
            throw new IllegalArgumentException("Sin productos validos en el carrito");
        }
        return out;
    }

    private String trimTrailingSlash(String url) {
        if (url == null || url.isBlank()) {
            return "https://monarchreptiles.com";
        }
        String trimmed = url.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }

    private record HandoffTarget(String checkoutUrl, String mode, String fallbackBatchUrl, List<String> addToCartUrls) {
    }

    public record CartLine(String externalProductId, Integer quantity, String title, String canonicalUrl) {
        public CartLine(String externalProductId, Integer quantity, String title) {
            this(externalProductId, quantity, title, null);
        }
    }
}
