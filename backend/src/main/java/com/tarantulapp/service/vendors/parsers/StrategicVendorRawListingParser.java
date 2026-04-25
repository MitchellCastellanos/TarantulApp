package com.tarantulapp.service.vendors.parsers;

import com.fasterxml.jackson.databind.JsonNode;
import com.tarantulapp.service.vendors.sources.StrategicVendorRawListing;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class StrategicVendorRawListingParser {

    public StrategicVendorRawListing parse(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        return new StrategicVendorRawListing(
                text(node, "externalId"),
                text(node, "title"),
                text(node, "description"),
                text(node, "speciesNameRaw"),
                parsePrice(node.get("priceAmount")),
                text(node, "currency"),
                parseInt(node.get("stockQuantity")),
                text(node, "imageUrl"),
                text(node, "productCanonicalUrl"),
                text(node, "country"),
                text(node, "state"),
                text(node, "city")
        );
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) return null;
        String out = value.asText().trim();
        return out.isEmpty() ? null : out;
    }

    private Integer parseInt(JsonNode value) {
        if (value == null || value.isNull()) return null;
        if (value.isInt() || value.isLong()) return value.asInt();
        try {
            return Integer.parseInt(value.asText().trim());
        } catch (Exception ignored) {
            return null;
        }
    }

    private BigDecimal parsePrice(JsonNode value) {
        if (value == null || value.isNull()) return null;
        if (value.isNumber()) return value.decimalValue();
        String raw = value.asText().trim();
        if (raw.isEmpty()) return null;
        try {
            return new BigDecimal(raw.replace(",", "."));
        } catch (Exception ignored) {
            return null;
        }
    }
}
