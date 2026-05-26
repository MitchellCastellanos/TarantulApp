package com.tarantulapp.service.vendors.adapters;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.service.vendors.csv.CsvPartnerFeedParser;
import com.tarantulapp.service.vendors.sources.StrategicVendorRawListing;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
@Order(5)
public class CsvFeedStrategicPartnerListingAdapter implements StrategicPartnerListingAdapter {

    private static final Logger log = LoggerFactory.getLogger(CsvFeedStrategicPartnerListingAdapter.class);

    private final CsvPartnerFeedParser parser;
    private final HttpClient httpClient;
    private final boolean enabled;

    public CsvFeedStrategicPartnerListingAdapter(
            CsvPartnerFeedParser parser,
            @Value("${app.partner-sync.adapters.csv.enabled:true}") boolean enabled) {
        this.parser = parser;
        this.enabled = enabled;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    @Override
    public boolean supports(OfficialVendor vendor) {
        if (!enabled || vendor == null) {
            return false;
        }
        String feedType = vendor.getFeedType();
        if (feedType == null || !"csv".equalsIgnoreCase(feedType.trim())) {
            return false;
        }
        return resolveFeedUrl(vendor) != null;
    }

    @Override
    public List<StrategicVendorRawListing> fetch(OfficialVendor vendor) {
        String feedUrl = resolveFeedUrl(vendor);
        if (feedUrl == null) {
            return List.of();
        }
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(feedUrl))
                    .timeout(Duration.ofSeconds(45))
                    .header("Accept", "text/csv,text/plain,*/*")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("CSV feed HTTP {} for vendor {}", response.statusCode(), vendor.getSlug());
                return List.of();
            }
            Map<String, Object> feedConfig = vendor.getFeedConfig() == null ? Map.of() : vendor.getFeedConfig();
            CsvPartnerFeedParser.ParseResult parsed = parser.parse(response.body(), feedConfig);
            List<StrategicVendorRawListing> listings = parser.toRawListings(
                    parsed.rows(),
                    feedConfig,
                    vendor.getCountry(),
                    vendor.getState(),
                    vendor.getCity(),
                    currencyFromConfig(feedConfig));
            log.info("CSV adapter fetched {} listings for {}", listings.size(), vendor.getSlug());
            return listings;
        } catch (Exception ex) {
            log.warn("CSV feed failed for {}: {}", vendor.getSlug(), ex.getMessage());
            return List.of();
        }
    }

    private static String resolveFeedUrl(OfficialVendor vendor) {
        Map<String, Object> config = vendor.getFeedConfig();
        if (config != null) {
            Object feedUrl = config.get("feedUrl");
            if (feedUrl != null && !feedUrl.toString().isBlank()) {
                return feedUrl.toString().trim();
            }
            Object csvUrl = config.get("csvUrl");
            if (csvUrl != null && !csvUrl.toString().isBlank()) {
                return csvUrl.toString().trim();
            }
        }
        String base = vendor.getFeedBaseUrl();
        if (base != null && !base.isBlank()) {
            String trimmed = base.trim();
            if (trimmed.toLowerCase(Locale.ROOT).endsWith(".csv")
                    || trimmed.contains("export")
                    || trimmed.contains("feed")) {
                return trimmed;
            }
        }
        return null;
    }

    private static String currencyFromConfig(Map<String, Object> feedConfig) {
        Object raw = feedConfig.get("currency");
        return raw == null ? "CAD" : raw.toString().trim().toUpperCase(Locale.ROOT);
    }

    @Override
    public String id() {
        return "csv-feed-url";
    }
}
