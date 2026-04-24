package com.tarantulapp.service.vendors.adapters;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.service.vendors.parsers.StrategicVendorRawListingParser;
import com.tarantulapp.service.vendors.sources.StrategicVendorRawListing;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Component
public class StaticFileStrategicPartnerListingAdapter implements StrategicPartnerListingAdapter {
    private static final Logger log = LoggerFactory.getLogger(StaticFileStrategicPartnerListingAdapter.class);

    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;
    private final StrategicVendorRawListingParser parser;
    private final boolean enabled;

    public StaticFileStrategicPartnerListingAdapter(ResourceLoader resourceLoader,
                                                    ObjectMapper objectMapper,
                                                    StrategicVendorRawListingParser parser,
                                                    @Value("${app.partner-sync.adapters.static.enabled:true}") boolean enabled) {
        this.resourceLoader = resourceLoader;
        this.objectMapper = objectMapper;
        this.parser = parser;
        this.enabled = enabled;
    }

    @Override
    public boolean supports(OfficialVendor vendor) {
        if (!enabled || vendor == null || vendor.getSlug() == null) return false;
        String location = "classpath:vendors/sources/" + vendor.getSlug() + ".json";
        Resource resource = resourceLoader.getResource(location);
        return resource.exists();
    }

    @Override
    public List<StrategicVendorRawListing> fetch(OfficialVendor vendor) {
        if (vendor == null || vendor.getSlug() == null) return List.of();
        String location = "classpath:vendors/sources/" + vendor.getSlug() + ".json";
        Resource resource = resourceLoader.getResource(location);
        if (!resource.exists()) return List.of();

        try (InputStream in = resource.getInputStream()) {
            JsonNode root = objectMapper.readTree(in);
            if (!root.isArray()) return List.of();
            List<StrategicVendorRawListing> out = new ArrayList<>();
            for (JsonNode node : root) {
                StrategicVendorRawListing item = parser.parse(node);
                if (item != null) out.add(item);
            }
            return out;
        } catch (Exception ex) {
            log.warn("Static adapter failed for vendor {}: {}", vendor.getSlug(), ex.getMessage());
            return List.of();
        }
    }

    @Override
    public String id() {
        return "static-file";
    }
}
