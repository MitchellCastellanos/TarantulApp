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
import java.util.Map;

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
        List<String> addToCartUrls = normalized.stream()
                .map(this::productPageAddToCartUrl)
                .toList();
        String cartUrl = withPartnerUtm(monarchStoreBaseUrl + "/cart/");

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("vendorSlug", vendor.getSlug());
        out.put("vendorName", vendor.getName());
        out.put("cartUrl", cartUrl);
        out.put("addToCartUrls", addToCartUrls);
        out.put("lineCount", normalized.size());
        out.put("utmSource", "tarantulapp");
        if (normalized.size() == 1) {
            out.put("checkoutUrl", addToCartUrls.get(0));
            out.put("handoffMode", "product_page_add");
        } else {
            // Monarch nginx returns 403 on ?add-to-cart= batch URLs — stepped product pages only.
            out.put("checkoutUrl", cartUrl);
            out.put("handoffMode", "product_pages_stepped");
        }
        return out;
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

    public record CartLine(String externalProductId, Integer quantity, String title, String canonicalUrl) {
        public CartLine(String externalProductId, Integer quantity, String title) {
            this(externalProductId, quantity, title, null);
        }
    }
}
