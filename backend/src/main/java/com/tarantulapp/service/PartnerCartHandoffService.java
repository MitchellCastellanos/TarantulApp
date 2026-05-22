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
        if (!target.productUrls().isEmpty()) {
            out.put("productUrls", target.productUrls());
        }
        return out;
    }

    private HandoffTarget resolveHandoffTarget(List<CartLine> lines) {
        List<String> productUrls = lines.stream()
                .map(CartLine::canonicalUrl)
                .filter(url -> url != null && !url.isBlank())
                .map(this::withPartnerUtm)
                .toList();

        if (lines.size() == 1) {
            CartLine one = lines.get(0);
            if (one.canonicalUrl() != null && !one.canonicalUrl().isBlank()) {
                return new HandoffTarget(withPartnerUtm(one.canonicalUrl()), "product_page", List.of());
            }
            return new HandoffTarget(legacyAddToCartUrl(one), "add_to_cart_query", List.of());
        }

        if (productUrls.size() == lines.size()) {
            return new HandoffTarget(
                    withPartnerUtm(monarchStoreBaseUrl + "/cart/"),
                    "multi_product_pages",
                    productUrls);
        }

        if (!productUrls.isEmpty()) {
            return new HandoffTarget(
                    withPartnerUtm(monarchStoreBaseUrl + "/cart/"),
                    "multi_product_pages_partial",
                    productUrls);
        }

        return new HandoffTarget(
                withPartnerUtm(monarchStoreBaseUrl + "/cart/"),
                "cart_page_only",
                List.of());
    }

    /** Monarch nginx/WAF returns 403 for add-to-cart query strings — use product pages instead. */
    private String legacyAddToCartUrl(CartLine line) {
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

    private record HandoffTarget(String checkoutUrl, String mode, List<String> productUrls) {
    }

    public record CartLine(String externalProductId, Integer quantity, String title, String canonicalUrl) {
        public CartLine(String externalProductId, Integer quantity, String title) {
            this(externalProductId, quantity, title, null);
        }
    }
}
