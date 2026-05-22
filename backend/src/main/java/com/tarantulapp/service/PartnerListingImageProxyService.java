package com.tarantulapp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.Locale;
import java.util.Set;

@Service
public class PartnerListingImageProxyService {

    private static final Set<String> ALLOWED_HOST_SUFFIXES = Set.of("monarchreptiles.com", "www.monarchreptiles.com");

    private final RestTemplate restTemplate;
    private final String monarchStoreBaseUrl;

    public PartnerListingImageProxyService(
            @Value("${app.partner-sync.adapters.woocommerce.monarch-base-url:https://monarchreptiles.com}") String monarchStoreBaseUrl) {
        this.restTemplate = new RestTemplate();
        this.monarchStoreBaseUrl = trimTrailingSlash(monarchStoreBaseUrl);
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
        for (String allowed : ALLOWED_HOST_SUFFIXES) {
            if (lower.equals(allowed) || lower.endsWith("." + allowed)) {
                return true;
            }
        }
        try {
            URI store = URI.create(monarchStoreBaseUrl);
            if (store.getHost() != null && lower.equals(store.getHost().toLowerCase(Locale.ROOT))) {
                return true;
            }
        } catch (Exception ignored) {
            // fall through
        }
        return false;
    }

    private String trimTrailingSlash(String url) {
        if (url == null || url.isBlank()) {
            return "https://monarchreptiles.com";
        }
        String trimmed = url.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }
}
