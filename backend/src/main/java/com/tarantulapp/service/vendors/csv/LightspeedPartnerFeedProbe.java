package com.tarantulapp.service.vendors.csv;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class LightspeedPartnerFeedProbe {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public LightspeedPartnerFeedProbe(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(8))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public Map<String, Object> probe(String apiKey, String apiSecret, String lang) {
        if (apiKey == null || apiKey.isBlank() || apiSecret == null || apiSecret.isBlank()) {
            return Map.of("ok", false, "detail", "lightspeedApiKey y lightspeedApiSecret requeridos");
        }
        String language = lang == null || lang.isBlank() ? "en" : lang.trim();
        String url = "https://api.shoplightspeed.com/" + language + "/catalog/count.json";
        try {
            String auth = Base64.getEncoder().encodeToString(
                    (apiKey.trim() + ":" + apiSecret.trim()).getBytes(StandardCharsets.UTF_8));
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Basic " + auth)
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return Map.of("ok", false, "httpStatus", response.statusCode(),
                        "detail", "HTTP " + response.statusCode());
            }
            JsonNode root = objectMapper.readTree(response.body());
            int count = root.isNumber() ? root.asInt() : root.path("count").asInt(0);
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("ok", count >= 0);
            out.put("rowCount", count);
            out.put("detail", "OK — " + count + " ítems en catálogo Lightspeed");
            return out;
        } catch (Exception ex) {
            return Map.of("ok", false, "detail", ex.getMessage() == null ? "Error Lightspeed" : ex.getMessage());
        }
    }
}
