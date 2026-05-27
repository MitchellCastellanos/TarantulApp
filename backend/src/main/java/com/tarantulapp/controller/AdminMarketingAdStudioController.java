package com.tarantulapp.controller;

import com.tarantulapp.service.AdminAccessService;
import com.tarantulapp.service.MarketplaceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/marketing/ad-studio")
public class AdminMarketingAdStudioController {

    private final AdminAccessService adminAccessService;
    private final MarketplaceService marketplaceService;

    public AdminMarketingAdStudioController(AdminAccessService adminAccessService,
                                            MarketplaceService marketplaceService) {
        this.adminAccessService = adminAccessService;
        this.marketplaceService = marketplaceService;
    }

    record GenerateAdsRequest(
            String channel,
            String tone,
            String templateKey,
            List<UUID> listingIds,
            String cityHint
    ) {}

    @GetMapping("/templates")
    public ResponseEntity<Map<String, Object>> templates() {
        adminAccessService.assertCurrentUserCanUseMarketingTools();
        List<Map<String, String>> channels = List.of(
                Map.of("key", "kijiji", "label", "Kijiji"),
                Map.of("key", "facebook_marketplace", "label", "Facebook Marketplace"),
                Map.of("key", "facebook_groups", "label", "Facebook Groups"),
                Map.of("key", "reddit", "label", "Reddit"),
                Map.of("key", "discord", "label", "Discord")
        );
        List<Map<String, String>> tones = List.of(
                Map.of("key", "collector", "label", "Collector"),
                Map.of("key", "premium", "label", "Premium")
        );
        List<Map<String, String>> templates = List.of(
                Map.of("key", "inventory_push", "label", "Inventory push"),
                Map.of("key", "new_arrival", "label", "New arrival"),
                Map.of("key", "female_available", "label", "Female available"),
                Map.of("key", "beginner_friendly", "label", "Beginner friendly")
        );
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("channels", channels);
        out.put("tones", tones);
        out.put("templates", templates);
        return ResponseEntity.ok(out);
    }

    @GetMapping("/listings")
    public ResponseEntity<List<Map<String, Object>>> listings(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String storefront,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) UUID listingId,
            @RequestParam(required = false) Integer limit) {
        adminAccessService.assertCurrentUserCanUseMarketingTools();
        int cap = Math.min(Math.max(limit == null ? 50 : limit, 1), 150);
        String sourceNorm = normalizeSource(source);
        String storefrontNorm = normalize(storefront);
        List<Map<String, Object>> rows = marketplaceService.publicListings(
                q, "active", country, null, city, null, null, null, null, null,
                null, null, null, null, true, null, null, null
        );
        List<Map<String, Object>> filtered = rows.stream()
                .filter(row -> sourceNorm == null || sourceNorm.equalsIgnoreCase(asText(row.get("source"))))
                .filter(row -> storefrontNorm == null || matchesStorefront(row, storefrontNorm))
                .limit(cap)
                .map(this::toStudioListingRow)
                .toList();
        if (listingId == null) {
            return ResponseEntity.ok(filtered);
        }
        Map<String, Object> exact = toStudioListingRow(marketplaceService.publicListingDetail(listingId));
        boolean present = filtered.stream().anyMatch(row -> String.valueOf(row.get("id")).equals(String.valueOf(listingId)));
        if (present) {
            return ResponseEntity.ok(filtered);
        }
        List<Map<String, Object>> out = new ArrayList<>();
        out.add(exact);
        out.addAll(filtered.stream().limit(Math.max(0, cap - 1)).toList());
        return ResponseEntity.ok(out);
    }

    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generate(@RequestBody GenerateAdsRequest req) {
        adminAccessService.assertCurrentUserCanUseMarketingTools();
        if (req == null || req.listingIds() == null || req.listingIds().isEmpty()) {
            throw new IllegalArgumentException("LISTING_IDS_REQUIRED");
        }
        String channel = normalizeChannel(req.channel());
        String tone = normalizeTone(req.tone());
        String template = normalizeTemplate(req.templateKey());
        String cityHint = normalize(req.cityHint());
        List<Map<String, Object>> ads = new ArrayList<>();
        for (UUID listingId : req.listingIds()) {
            if (listingId == null) continue;
            Map<String, Object> listing = marketplaceService.publicListingDetail(listingId);
            String text = buildCopy(listing, channel, tone, template, cityHint);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("listingId", listingId);
            row.put("source", asText(listing.get("source")));
            row.put("title", asText(listing.get("title")));
            row.put("speciesName", asText(listing.get("speciesName")));
            row.put("sellerName", asText(listing.get("sellerName")));
            row.put("channel", channel);
            row.put("tone", tone);
            row.put("templateKey", template);
            row.put("listingUrl", listingUrl(listing));
            row.put("text", text);
            ads.add(row);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("count", ads.size());
        out.put("ads", ads);
        return ResponseEntity.ok(out);
    }

    private Map<String, Object> toStudioListingRow(Map<String, Object> row) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", row.get("id"));
        out.put("title", asText(row.get("title")));
        out.put("speciesName", asText(row.get("speciesName")));
        out.put("source", asText(row.get("source")));
        out.put("sellerName", asText(row.get("sellerName")));
        out.put("sellerHandle", asText(row.get("sellerHandle")));
        out.put("city", asText(row.get("city")));
        out.put("country", asText(row.get("country")));
        out.put("priceAmount", row.get("priceAmount"));
        out.put("currency", asText(row.get("currency")));
        out.put("listingUrl", listingUrl(row));
        return out;
    }

    private String buildCopy(Map<String, Object> listing, String channel, String tone, String template, String cityHint) {
        String title = fallback(asText(listing.get("title")), fallback(asText(listing.get("speciesName")), "Tarantula listing"));
        String species = asText(listing.get("speciesName"));
        String seller = fallback(asText(listing.get("sellerName")), "trusted seller");
        String sex = asText(listing.get("sex"));
        String city = fallback(asText(listing.get("city")), cityHint);
        String price = formatPrice(listing.get("priceAmount"), asText(listing.get("currency")));
        String source = asText(listing.get("source"));
        String url = listingUrl(listing);

        String opening = switch (template) {
            case "new_arrival" -> "New arrival now available";
            case "female_available" -> "Female specimen available now";
            case "beginner_friendly" -> "Beginner-friendly species now listed";
            default -> "Fresh inventory available now";
        };

        String toneLine = switch (tone) {
            case "premium" -> "Premium listing card with clear details and trusted source.";
            case "breeder" -> "Breeder-style listing with direct specimen information.";
            case "educational" -> "Research details first, then decide with confidence.";
            default -> "Collector-ready details and updated stock.";
        };

        String channelLine = switch (channel) {
            case "kijiji" -> "See full specimen details, molt context, and more photos on TarantulApp:";
            case "facebook_marketplace" -> "Browse the full listing and verified seller context on TarantulApp:";
            case "facebook_groups" -> "Full details and live inventory link:";
            case "reddit" -> "Listing details and current availability:";
            case "discord" -> "Live listing details:";
            default -> "Full details:";
        };

        String locationText = city == null ? "" : ("Near " + city + ".");
        String sourceText = "partner".equalsIgnoreCase(source)
                ? "Imported partner listing."
                : "Direct TarantulApp listing.";

        List<String> lines = new ArrayList<>();
        lines.add(opening + ": " + title + (species.isBlank() ? "" : " (" + species + ")"));
        if (!sex.isBlank()) lines.add("Sex: " + sex);
        lines.add("Price: " + price);
        if (!locationText.isBlank()) lines.add(locationText);
        lines.add("Storefront: " + seller + ".");
        lines.add(sourceText);
        lines.add(toneLine);
        lines.add(channelLine);
        lines.add(url);
        return String.join("\n", lines);
    }

    private String formatPrice(Object rawAmount, String currency) {
        if (!(rawAmount instanceof BigDecimal amount)) {
            return "Check listing";
        }
        String cur = (currency == null || currency.isBlank()) ? "CAD" : currency.toUpperCase(Locale.ROOT);
        return cur + " " + amount.stripTrailingZeros().toPlainString();
    }

    private boolean matchesStorefront(Map<String, Object> row, String storefrontNorm) {
        String sellerName = normalize(asText(row.get("sellerName")));
        String sellerHandle = normalize(asText(row.get("sellerHandle")));
        String source = asText(row.get("source"));
        String partnerSlug = "";
        Object officialVendor = row.get("officialVendor");
        if (officialVendor instanceof Map<?, ?> ov) {
            Object slugObj = ov.get("slug");
            partnerSlug = slugObj == null ? "" : slugObj.toString().toLowerCase(Locale.ROOT);
        }
        return (sellerName != null && sellerName.contains(storefrontNorm))
                || (sellerHandle != null && sellerHandle.contains(storefrontNorm))
                || (!partnerSlug.isBlank() && partnerSlug.contains(storefrontNorm))
                || ("partner".equalsIgnoreCase(source) && storefrontNorm.contains("monarch"));
    }

    private String listingUrl(Map<String, Object> listing) {
        String source = asText(listing.get("source"));
        if ("partner".equalsIgnoreCase(source)) {
            String canonical = asText(listing.get("canonicalUrl"));
            if (canonical != null) return canonical;
            Object officialVendor = listing.get("officialVendor");
            if (officialVendor instanceof Map<?, ?> ov) {
                Object slug = ov.get("slug");
                if (slug != null && !slug.toString().isBlank()) {
                    return "https://tarantulapp.com/partner/" + slug;
                }
            }
        }
        Object id = listing.get("id");
        if (id != null) {
            return "https://tarantulapp.com/marketplace/listing/" + id;
        }
        return "https://tarantulapp.com/marketplace";
    }

    private static String normalizeSource(String source) {
        String out = normalize(source);
        if (out == null || "all".equals(out)) return null;
        if ("peer".equals(out) || "partner".equals(out)) return out;
        return null;
    }

    private static String normalizeChannel(String channel) {
        String out = normalize(channel);
        if (out == null) return "kijiji";
        return switch (out) {
            case "kijiji", "facebook_marketplace", "facebook_groups", "reddit", "discord" -> out;
            default -> "kijiji";
        };
    }

    private static String normalizeTone(String tone) {
        String out = normalize(tone);
        if (out == null) return "collector";
        return switch (out) {
            case "collector", "premium" -> out;
            default -> "collector";
        };
    }

    private static String normalizeTemplate(String templateKey) {
        String out = normalize(templateKey);
        if (out == null) return "inventory_push";
        return switch (out) {
            case "inventory_push", "new_arrival", "female_available", "beginner_friendly" -> out;
            default -> "inventory_push";
        };
    }

    private static String fallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static String asText(Object value) {
        if (value == null) return "";
        String s = value.toString().trim();
        return s.isEmpty() ? "" : s;
    }

    private static String normalize(String value) {
        if (value == null) return null;
        String out = value.trim().toLowerCase(Locale.ROOT);
        return out.isEmpty() ? null : out;
    }
}
