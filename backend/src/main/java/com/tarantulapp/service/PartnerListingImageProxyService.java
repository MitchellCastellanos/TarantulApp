package com.tarantulapp.service;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.repository.OfficialVendorRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.Locale;

@Service
public class PartnerListingImageProxyService {

    private final RestTemplate restTemplate;
    private final OfficialVendorRepository officialVendorRepository;

    public PartnerListingImageProxyService(
            OfficialVendorRepository officialVendorRepository) {
        this.restTemplate = new RestTemplate();
        this.officialVendorRepository = officialVendorRepository;
    }

    public ResponseEntity<byte[]> fetchImage(String rawUrl) {
        URI uri = validateUrl(rawUrl);
        ResponseEntity<byte[]> upstream = restTemplate.getForEntity(uri, byte[].class);
        HttpHeaders headers = new HttpHeaders();
        MediaType type = upstream.getHeaders().getContentType();
        if (type != null) {
            headers.setContentType(type);
        } else {
            headers.setContentType(MediaType.IMAGE_JPEG);
        }
        headers.setCacheControl("public, max-age=86400");
        byte[] body = upstream.getBody() == null ? new byte[0] : upstream.getBody();
        return new ResponseEntity<>(body, headers, HttpStatus.OK);
    }

    private URI validateUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            throw new IllegalArgumentException("Missing image url");
        }
        URI uri;
        try {
            uri = URI.create(rawUrl.trim());
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid image url");
        }
        String scheme = uri.getScheme();
        if (scheme == null || !(scheme.equalsIgnoreCase("https") || scheme.equalsIgnoreCase("http"))) {
            throw new IllegalArgumentException("Image url must be http(s)");
        }
        String host = uri.getHost();
        if (host == null || !isAllowedHost(host)) {
            throw new IllegalArgumentException("Image host not allowed");
        }
        return uri;
    }

    private boolean isAllowedHost(String host) {
        String lower = host.toLowerCase(Locale.ROOT);
        for (OfficialVendor vendor : officialVendorRepository.findAll()) {
            if (matchesConfiguredHost(lower, vendor.getFeedBaseUrl())
                    || matchesConfiguredHost(lower, vendor.getWebsiteUrl())) {
                return true;
            }
        }
        return false;
    }

    private boolean matchesConfiguredHost(String requestHost, String configuredUrl) {
        String configuredHost = hostFromUrl(configuredUrl);
        if (configuredHost == null) {
            return false;
        }
        return requestHost.equals(configuredHost) || requestHost.endsWith("." + configuredHost);
    }

    private String hostFromUrl(String rawUrl) {
        String trimmed = trimTrailingSlash(rawUrl);
        if (trimmed == null) {
            return null;
        }
        try {
            URI uri = URI.create(trimmed);
            return uri.getHost() == null ? null : uri.getHost().toLowerCase(Locale.ROOT);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String trimTrailingSlash(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String trimmed = url.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }
}
