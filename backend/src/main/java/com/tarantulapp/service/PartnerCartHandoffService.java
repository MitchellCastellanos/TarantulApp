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
        String checkoutUrl = buildMonarchCheckoutUrl(normalized);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("vendorSlug", vendor.getSlug());
        out.put("vendorName", vendor.getName());
        out.put("checkoutUrl", checkoutUrl);
        out.put("lineCount", normalized.size());
        out.put("utmSource", "tarantulapp");
        out.put("handoffMode", normalized.size() == 1 ? "single_add_to_cart" : "multi_add_to_cart");
        return out;
    }

    private List<CartLine> normalizeLines(List<CartLine> lines) {
        List<CartLine> out = new ArrayList<>();
        for (CartLine line : lines) {
            if (line == null || line.externalProductId() == null || line.externalProductId().isBlank()) {
                continue;
            }
            int qty = line.quantity() == null || line.quantity() < 1 ? 1 : Math.min(line.quantity(), 99);
            out.add(new CartLine(line.externalProductId().trim(), qty, line.title()));
        }
        if (out.isEmpty()) {
            throw new IllegalArgumentException("Sin productos validos en el carrito");
        }
        return out;
    }

    private String buildMonarchCheckoutUrl(List<CartLine> lines) {
        if (lines.size() == 1) {
            CartLine one = lines.get(0);
            return UriComponentsBuilder.fromHttpUrl(monarchStoreBaseUrl)
                    .queryParam("add-to-cart", one.externalProductId())
                    .queryParam("quantity", one.quantity())
                    .queryParam("utm_source", "tarantulapp")
                    .queryParam("utm_medium", "partner_cart")
                    .build(true)
                    .toUriString();
        }
        String ids = lines.stream()
                .map(CartLine::externalProductId)
                .reduce((a, b) -> a + "," + b)
                .orElse("");
        return UriComponentsBuilder.fromHttpUrl(monarchStoreBaseUrl)
                .queryParam("add-to-cart", ids)
                .queryParam("utm_source", "tarantulapp")
                .queryParam("utm_medium", "partner_cart")
                .build(true)
                .toUriString();
    }

    private String trimTrailingSlash(String url) {
        if (url == null || url.isBlank()) {
            return "https://monarchreptiles.com";
        }
        String trimmed = url.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }

    public record CartLine(String externalProductId, Integer quantity, String title) {
    }
}
