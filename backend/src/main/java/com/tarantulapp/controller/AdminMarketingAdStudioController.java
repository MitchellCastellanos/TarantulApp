package com.tarantulapp.controller;

import com.tarantulapp.service.AdminAccessService;
import com.tarantulapp.service.MarketplaceService;
import com.tarantulapp.util.BetaMailBodies;
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
            String copyMode,
            String locale
    ) {}

    private record AdCopyStrings(
            String titlePrefix,
            String availableThrough,
            String discoverParagraph,
            String bullet1,
            String bullet2,
            String bullet3,
            String bullet4,
            String morePhotosCta,
            String priceOnRequest,
            String storefrontHeadline,
            String exampleListingLabel,
            String fullShopLabel
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
        List<Map<String, String>> locales = List.of(
                Map.of("key", "en", "label", "English"),
                Map.of("key", "es", "label", "Español"),
                Map.of("key", "fr", "label", "Français")
        );
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("channels", channels);
        out.put("tones", tones);
        out.put("templates", templates);
        out.put("copyModes", copyModes);
        out.put("locales", locales);
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
        String locale = normalizeLocale(req.locale());
        AdCopyStrings strings = copyStrings(locale);
        List<Map<String, Object>> ads = new ArrayList<>();
        for (UUID listingId : req.listingIds()) {
            if (listingId == null) continue;
            Map<String, Object> payload = marketplaceService.publicListingDetail(listingId);
            Map<String, Object> listing = unwrapListing(payload);
            Map<String, Object> copy = buildAdCopy(payload, template, cityHint, copyMode, strings, locale, channel);
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
            row.put("locale", locale);
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

    private Map<String, Object> buildAdCopy(Map<String, Object> payload, String template,
                                            String cityHint, String copyMode, AdCopyStrings strings,
                                            String locale, String channel) {
        Map<String, Object> listing = unwrapListing(payload);
        Map<String, Object> sellerPreview = unwrapSellerPreview(payload);
        boolean storefront = "storefront".equals(copyMode);

        String listingUrl = listingUrl(listing, channel);
        String store = storeUrl(listing);
        String imageUrl = primaryImageUrl(listing);

        String adTitle;
        String adDescription;
        if (storefront) {
            adTitle = buildStorefrontTitle(listing, sellerPreview, strings);
            adDescription = buildStorefrontDescription(listing, sellerPreview, cityHint, store, listingUrl, strings);
        } else {
            adTitle = buildListingTitle(listing, strings);
            adDescription = buildListingDescription(listing, sellerPreview, cityHint, listingUrl, strings, locale);
        }

        String text = adDescription;
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("adTitle", adTitle);
        out.put("adDescription", adDescription);
        out.put("text", text);
        out.put("listingUrl", listingUrl);
        out.put("storeUrl", store);
        out.put("imageUrl", imageUrl);
        return out;
    }

    private String buildListingTitle(Map<String, Object> listing, AdCopyStrings strings) {
        return truncate(strings.titlePrefix() + " — " + speciesLabel(listing), 72);
    }

    private String buildListingDescription(Map<String, Object> listing, Map<String, Object> sellerPreview,
                                           String cityHint, String listingUrl, AdCopyStrings strings, String locale) {
        String city = fallback(asText(listing.get("city")), cityHint == null ? "" : cityHint);
        String state = asText(listing.get("state"));
        String country = asText(listing.get("country"));
        String seller = resolveStoreName(listing, sellerPreview);
        String location = formatLocation(city, state, country);

        List<String> lines = new ArrayList<>();
        lines.add(speciesHeadline(listing));
        lines.add(formatPriceLine(listing.get("priceAmount"), asText(listing.get("currency")), strings, locale));
        if (!location.isBlank()) {
            lines.add("📍 " + location);
        }
        lines.add("");
        lines.add(strings.availableThrough().replace("{seller}", seller));
        lines.add("");
        lines.add(strings.discoverParagraph());
        lines.add("");
        lines.add(strings.bullet1());
        lines.add(strings.bullet2());
        lines.add(strings.bullet3());
        lines.add(strings.bullet4());
        lines.add("");
        lines.add(strings.morePhotosCta());
        lines.add(listingUrl);
        return String.join("\n", lines);
    }

    private String buildStorefrontTitle(Map<String, Object> listing, Map<String, Object> sellerPreview,
                                        AdCopyStrings strings) {
        return truncate(strings.titlePrefix() + " — " + resolveStoreName(listing, sellerPreview), 72);
    }

    private String buildStorefrontDescription(Map<String, Object> listing, Map<String, Object> sellerPreview,
                                              String cityHint, String storeUrl, String listingUrl,
                                              AdCopyStrings strings) {
        String storeName = resolveStoreName(listing, sellerPreview);
        String city = fallback(asText(listing.get("city")), cityHint == null ? "" : cityHint);
        String country = asText(listing.get("country"));
        String location = formatLocation(city, "", country);

        List<String> lines = new ArrayList<>();
        lines.add("🕷️ " + storeName);
        if (!location.isBlank()) {
            lines.add("📍 " + location);
        }
        lines.add("");
        lines.add(strings.storefrontHeadline().replace("{store}", storeName));
        lines.add("");
        lines.add(strings.discoverParagraph());
        lines.add("");
        lines.add(strings.bullet1());
        lines.add(strings.bullet2());
        lines.add(strings.bullet3());
        lines.add(strings.bullet4());
        lines.add("");
        lines.add(strings.exampleListingLabel() + ":");
        lines.add(speciesHeadline(listing));
        lines.add(listingUrl);
        lines.add("");
        lines.add(strings.fullShopLabel() + ":");
        lines.add(storeUrl.isBlank() ? listingUrl : storeUrl);
        return String.join("\n", lines);
    }

    private static String speciesLabel(Map<String, Object> listing) {
        String species = asText(listing.get("speciesName"));
        if (!species.isBlank()) return species;
        String title = asText(listing.get("title"));
        if (!title.isBlank()) return title;
        return "Tarantula";
    }

    private static String speciesHeadline(Map<String, Object> listing) {
        return "🕷️ " + speciesLabel(listing);
    }

    private static String formatPriceLine(Object rawAmount, String currency, AdCopyStrings strings, String locale) {
        if (!(rawAmount instanceof BigDecimal amount)) {
            return "💲 " + strings.priceOnRequest();
        }
        String cur = (currency == null || currency.isBlank()) ? "CAD" : currency.toUpperCase(Locale.ROOT);
        String plain = amount.stripTrailingZeros().toPlainString();
        if (plain.contains(".")) {
            String[] parts = plain.split("\\.");
            if (parts.length == 2 && "00".equals(parts[1])) {
                plain = parts[0];
            } else if ("fr".equals(locale)) {
                plain = parts[0] + "," + parts[1];
            }
        }
        if ("fr".equals(locale)) {
            return "💲 " + plain + " " + cur;
        }
        return "💲 " + cur + " $" + plain;
    }

    private static AdCopyStrings copyStrings(String locale) {
        return switch (locale) {
            case "es" -> new AdCopyStrings(
                    "Tarántula",
                    "Disponible a través de {seller} en TarantulApp.",
                    "Descubre tarántulas de calidad, terrarios, setups bioactivos y supplies confiables para arácnidos — todo en un solo lugar.",
                    "✔️ Vendedores seleccionados",
                    "✔️ Especies captive bred",
                    "✔️ Opciones para principiantes y coleccionistas",
                    "✔️ Pickup local y envíos nacionales disponibles en publicaciones seleccionadas",
                    "Más fotos y detalles:",
                    "Ver anuncio para precio",
                    "Inventario en vivo de {store} en TarantulApp.",
                    "Ejemplo de publicación",
                    "Tienda completa"
            );
            case "fr" -> new AdCopyStrings(
                    "Tarentule",
                    "Disponible via {seller} sur TarantulApp.",
                    "Découvrez des tarentules de qualité, des terrariums, des installations bioactives et des accessoires fiables pour arachnides — le tout au même endroit.",
                    "✔️ Vendeurs sélectionnés",
                    "✔️ Espèces élevées en captivité",
                    "✔️ Espèces pour débutants et collectionneurs",
                    "✔️ Ramassage local et livraison partout au Canada offerte sur certaines annonces",
                    "Plus de photos et détails :",
                    "Voir l'annonce pour le prix",
                    "Inventaire en direct de {store} sur TarantulApp.",
                    "Exemple d'annonce",
                    "Boutique complète"
            );
            default -> new AdCopyStrings(
                    "Tarantula",
                    "Available through {seller} on TarantulApp.",
                    "Discover premium tarantulas, enclosures, bioactive setups, and trusted arachnid supplies — all in one place.",
                    "✔️ Carefully selected vendors",
                    "✔️ Captive-bred species",
                    "✔️ Beginner to collector species",
                    "✔️ Local pickup & Canada-wide shipping available on select listings",
                    "More photos, care details, and availability:",
                    "See listing for price",
                    "Browse live inventory from {store} on TarantulApp.",
                    "Example listing",
                    "Full shop"
            );
        };
    }

    private static String normalizeLocale(String locale) {
        return BetaMailBodies.normalizeLocale(locale);
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
        if (!asText(city).isBlank()) parts.add(asText(city));
        if (!asText(state).isBlank()) parts.add(asText(state));
        if (!asText(country).isBlank()) parts.add(asText(country));
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
        return listingUrl(listing, null);
    }

    private String listingUrl(Map<String, Object> listing, String channel) {
        Object id = listing.get("id");
        if (id != null) {
            return withAdStudioUtm("https://tarantulapp.com/marketplace/listing/" + id, channel);
        }
        return "https://tarantulapp.com/marketplace";
    }

    private static String withAdStudioUtm(String base, String channel) {
        String ch = normalizeChannel(channel);
        String sep = base.contains("?") ? "&" : "?";
        return base + sep + "utm_source=" + urlEncodeParam(ch) + "&utm_medium=ad_studio";
    }

    private static String urlEncodeParam(String value) {
        try {
            return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            return value;
        }
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
