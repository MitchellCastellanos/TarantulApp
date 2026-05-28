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
            String cityHint,
            String copyMode
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
        List<Map<String, String>> copyModes = List.of(
                Map.of("key", "listing", "label", "Listing details"),
                Map.of("key", "storefront", "label", "Storefront / shop")
        );
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("channels", channels);
        out.put("tones", tones);
        out.put("templates", templates);
        out.put("copyModes", copyModes);
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
        Map<String, Object> payload = marketplaceService.publicListingDetail(listingId);
        Map<String, Object> exact = toStudioListingRow(unwrapListing(payload));
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
        String copyMode = normalizeCopyMode(req.copyMode());
        List<Map<String, Object>> ads = new ArrayList<>();
        for (UUID listingId : req.listingIds()) {
            if (listingId == null) continue;
            Map<String, Object> payload = marketplaceService.publicListingDetail(listingId);
            Map<String, Object> listing = unwrapListing(payload);
            Map<String, Object> copy = buildAdCopy(payload, channel, tone, template, cityHint, copyMode);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("listingId", listingId);
            row.put("source", asText(listing.get("source")));
            row.put("title", asText(listing.get("title")));
            row.put("speciesName", asText(listing.get("speciesName")));
            row.put("sellerName", asText(listing.get("sellerName")));
            row.put("channel", channel);
            row.put("tone", tone);
            row.put("templateKey", template);
            row.put("copyMode", copyMode);
            row.put("listingUrl", copy.get("listingUrl"));
            row.put("storeUrl", copy.get("storeUrl"));
            row.put("imageUrl", copy.get("imageUrl"));
            row.put("adTitle", copy.get("adTitle"));
            row.put("adDescription", copy.get("adDescription"));
            row.put("text", copy.get("text"));
            ads.add(row);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("count", ads.size());
        out.put("ads", ads);
        return ResponseEntity.ok(out);
    }

    private Map<String, Object> toStudioListingRow(Map<String, Object> listing) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", listing.get("id"));
        out.put("title", asText(listing.get("title")));
        out.put("speciesName", asText(listing.get("speciesName")));
        out.put("descriptionPreview", previewText(stripHtml(asText(listing.get("description"))), 140));
        out.put("source", asText(listing.get("source")));
        out.put("sellerName", asText(listing.get("sellerName")));
        out.put("sellerHandle", asText(listing.get("sellerHandle")));
        out.put("city", asText(listing.get("city")));
        out.put("country", asText(listing.get("country")));
        out.put("sex", asText(listing.get("sex")));
        out.put("stage", asText(listing.get("stage")));
        out.put("priceAmount", listing.get("priceAmount"));
        out.put("currency", asText(listing.get("currency")));
        out.put("imageUrl", primaryImageUrl(listing));
        out.put("listingUrl", listingUrl(listing));
        out.put("storeUrl", storeUrl(listing));
        return out;
    }

    private Map<String, Object> buildAdCopy(Map<String, Object> payload, String channel, String tone,
                                            String template, String cityHint, String copyMode) {
        Map<String, Object> listing = unwrapListing(payload);
        Map<String, Object> sellerPreview = unwrapSellerPreview(payload);
        boolean storefront = "storefront".equals(copyMode);

        String listingUrl = listingUrl(listing);
        String store = storeUrl(listing);
        String imageUrl = primaryImageUrl(listing);

        String channelLine = switch (channel) {
            case "kijiji" -> "See full specimen details, molt context, and more photos on TarantulApp:";
            case "facebook_marketplace" -> "Browse the full listing and verified seller context on TarantulApp:";
            case "facebook_groups" -> "Full details and live inventory link:";
            case "reddit" -> "Listing details and current availability:";
            case "discord" -> "Live listing details:";
            default -> "Full details:";
        };

        String adTitle;
        String adDescription;
        if (storefront) {
            adTitle = buildStorefrontTitle(listing, sellerPreview, template);
            adDescription = buildStorefrontDescription(listing, sellerPreview, tone, channelLine, store, listingUrl);
        } else {
            adTitle = buildListingTitle(listing, template);
            adDescription = buildListingDescription(listing, sellerPreview, tone, cityHint, channelLine, listingUrl);
        }

        String text = adTitle + "\n\n" + adDescription;
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("adTitle", adTitle);
        out.put("adDescription", adDescription);
        out.put("text", text);
        out.put("listingUrl", listingUrl);
        out.put("storeUrl", store);
        out.put("imageUrl", imageUrl);
        return out;
    }

    private String buildListingTitle(Map<String, Object> listing, String template) {
        String title = fallback(asText(listing.get("title")), fallback(asText(listing.get("speciesName")), "Tarantula listing"));
        String opening = switch (template) {
            case "new_arrival" -> "New arrival";
            case "female_available" -> "Female available";
            case "beginner_friendly" -> "Beginner-friendly";
            default -> "Available now";
        };
        String species = asText(listing.get("speciesName"));
        String sex = asText(listing.get("sex"));
        StringBuilder sb = new StringBuilder(opening).append(": ").append(title);
        if (!species.isBlank() && !species.equalsIgnoreCase(title)) {
            sb.append(" (").append(species).append(")");
        }
        if (!sex.isBlank()) {
            sb.append(" — ").append(sex);
        }
        return truncate(sb.toString(), 72);
    }

    private String buildListingDescription(Map<String, Object> listing, Map<String, Object> sellerPreview,
                                           String tone, String cityHint, String channelLine, String listingUrl) {
        String description = stripHtml(asText(listing.get("description")));
        String species = asText(listing.get("speciesName"));
        String sex = asText(listing.get("sex"));
        String stage = asText(listing.get("stage"));
        String pedigree = asText(listing.get("pedigreeRef"));
        String city = fallback(asText(listing.get("city")), cityHint);
        String state = asText(listing.get("state"));
        String country = asText(listing.get("country"));
        String price = formatPrice(listing.get("priceAmount"), asText(listing.get("currency")));
        String seller = resolveSellerLabel(listing, sellerPreview);
        String source = asText(listing.get("source"));
        String badge = asText(listing.get("badgeLabel"));

        List<String> lines = new ArrayList<>();
        if (!description.isBlank()) {
            lines.add(description);
            lines.add("");
        }
        List<String> facts = new ArrayList<>();
        if (!species.isBlank()) facts.add("Species: " + species);
        if (!sex.isBlank()) facts.add("Sex: " + sex);
        if (!stage.isBlank()) facts.add("Stage: " + stage);
        if (!pedigree.isBlank()) facts.add("Lineage / ref: " + pedigree);
        facts.add("Price: " + price);
        String location = formatLocation(city, state, country);
        if (!location.isBlank()) facts.add("Location: " + location);
        lines.add(String.join("\n", facts));
        lines.add("");
        lines.add("Seller: " + seller + (badge.isBlank() ? "" : " (" + badge + ")"));
        lines.add("partner".equalsIgnoreCase(source)
                ? "Official partner storefront mirrored on TarantulApp."
                : "Direct TarantulApp listing from a verified keeper storefront.");
        lines.add(toneLine(tone));
        lines.add("");
        lines.add(channelLine);
        lines.add(listingUrl);
        return String.join("\n", lines);
    }

    private String buildStorefrontTitle(Map<String, Object> listing, Map<String, Object> sellerPreview, String template) {
        String storeName = resolveStoreName(listing, sellerPreview);
        String opening = switch (template) {
            case "new_arrival" -> "New stock";
            case "female_available" -> "Females in stock";
            case "beginner_friendly" -> "Beginner-friendly picks";
            default -> "Live inventory";
        };
        return truncate(opening + " — " + storeName + " on TarantulApp", 72);
    }

    private String buildStorefrontDescription(Map<String, Object> listing, Map<String, Object> sellerPreview,
                                              String tone, String channelLine, String storeUrl, String listingUrl) {
        String storeName = resolveStoreName(listing, sellerPreview);
        String source = asText(listing.get("source"));
        String badge = asText(listing.get("badgeLabel"));
        String city = asText(listing.get("city"));
        String country = asText(listing.get("country"));
        String website = officialVendorField(listing, "websiteUrl");

        List<String> lines = new ArrayList<>();
        lines.add("Browse " + storeName + "'s live tarantula inventory on TarantulApp — curated listings with photos, pricing, and species details in one place.");
        lines.add("");
        if (!website.isBlank()) {
            lines.add("Official website: " + website);
        }
        String location = formatLocation(city, "", country);
        if (!location.isBlank()) {
            lines.add("Based in: " + location);
        }
        if (!badge.isBlank()) {
            lines.add("Badge: " + badge);
        }
        lines.add("partner".equalsIgnoreCase(source)
                ? "Strategic partner storefront synced to TarantulApp."
                : "Keeper storefront on TarantulApp.");
        lines.add(toneLine(tone));
        lines.add("");
        lines.add("Example listing: " + fallback(asText(listing.get("title")), asText(listing.get("speciesName"))));
        lines.add(listingUrl);
        lines.add("");
        lines.add("Full shop / catalog:");
        lines.add(storeUrl.isBlank() ? listingUrl : storeUrl);
        lines.add("");
        lines.add(channelLine);
        return String.join("\n", lines);
    }

    private static String toneLine(String tone) {
        return switch (tone) {
            case "premium" -> "Premium presentation with clear specimen details and trusted source.";
            default -> "Collector-ready details and updated stock.";
        };
    }

    private static String resolveSellerLabel(Map<String, Object> listing, Map<String, Object> sellerPreview) {
        if (sellerPreview != null && !asText(sellerPreview.get("displayName")).isBlank()) {
            return asText(sellerPreview.get("displayName"));
        }
        return fallback(asText(listing.get("sellerName")), "trusted seller");
    }

    private static String resolveStoreName(Map<String, Object> listing, Map<String, Object> sellerPreview) {
        String vendorName = officialVendorField(listing, "name");
        if (!vendorName.isBlank()) return vendorName;
        if (sellerPreview != null && !asText(sellerPreview.get("displayName")).isBlank()) {
            return asText(sellerPreview.get("displayName"));
        }
        return fallback(asText(listing.get("sellerName")), "TarantulApp seller");
    }

    private static String officialVendorField(Map<String, Object> listing, String key) {
        Object officialVendor = listing.get("officialVendor");
        if (officialVendor instanceof Map<?, ?> ov) {
            Object val = ov.get(key);
            return val == null ? "" : val.toString().trim();
        }
        return "";
    }

    private static String formatLocation(String city, String state, String country) {
        List<String> parts = new ArrayList<>();
        if (!city.isBlank()) parts.add(city);
        if (!state.isBlank()) parts.add(state);
        if (!country.isBlank()) parts.add(country);
        return String.join(", ", parts);
    }

    private static String primaryImageUrl(Map<String, Object> listing) {
        Object urls = listing.get("imageUrls");
        if (urls instanceof List<?> list && !list.isEmpty()) {
            Object first = list.get(0);
            if (first != null) return first.toString().trim();
        }
        return asText(listing.get("imageUrl"));
    }

    private String storeUrl(Map<String, Object> listing) {
        String source = asText(listing.get("source"));
        if ("partner".equalsIgnoreCase(source)) {
            String slug = officialVendorField(listing, "slug");
            if (!slug.isBlank()) {
                return "https://tarantulapp.com/partner/" + slug;
            }
        }
        String handle = asText(listing.get("sellerHandle"));
        if (!handle.isBlank()) {
            return "https://tarantulapp.com/shop/" + handle;
        }
        return listingUrl(listing);
    }

    private String listingUrl(Map<String, Object> listing) {
        String source = asText(listing.get("source"));
        if ("partner".equalsIgnoreCase(source)) {
            String canonical = asText(listing.get("canonicalUrl"));
            if (!canonical.isBlank()) return canonical;
            Object id = listing.get("id");
            if (id != null) {
                return "https://tarantulapp.com/marketplace/listing/" + id;
            }
        }
        Object id = listing.get("id");
        if (id != null) {
            return "https://tarantulapp.com/marketplace/listing/" + id;
        }
        return "https://tarantulapp.com/marketplace";
    }

    private static String formatPrice(Object rawAmount, String currency) {
        if (!(rawAmount instanceof BigDecimal amount)) {
            return "See listing for price";
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

    @SuppressWarnings("unchecked")
    private static Map<String, Object> unwrapListing(Map<String, Object> payload) {
        if (payload == null) return Map.of();
        Object listingObj = payload.get("listing");
        if (listingObj instanceof Map<?, ?> m) {
            return (Map<String, Object>) m;
        }
        if (payload.containsKey("title") || payload.containsKey("speciesName") || payload.containsKey("id")) {
            return payload;
        }
        return payload;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> unwrapSellerPreview(Map<String, Object> payload) {
        if (payload == null) return Map.of();
        Object preview = payload.get("sellerPreview");
        if (preview instanceof Map<?, ?> m) {
            return (Map<String, Object>) m;
        }
        return Map.of();
    }

    private static String stripHtml(String raw) {
        if (raw == null || raw.isBlank()) return "";
        return raw.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
    }

    private static String previewText(String text, int max) {
        if (text == null || text.isBlank()) return "";
        if (text.length() <= max) return text;
        return text.substring(0, Math.max(0, max - 1)).trim() + "…";
    }

    private static String truncate(String value, int max) {
        if (value == null || value.length() <= max) return value == null ? "" : value;
        return value.substring(0, Math.max(0, max - 1)).trim() + "…";
    }

    private static String normalizeSource(String source) {
        String out = normalize(source);
        if (out == null || "all".equals(out)) return null;
        if ("peer".equals(out) || "partner".equals(out)) return out;
        return null;
    }

    private static String normalizeCopyMode(String copyMode) {
        String out = normalize(copyMode);
        if ("storefront".equals(out)) return "storefront";
        return "listing";
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
