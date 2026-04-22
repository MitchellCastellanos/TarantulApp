package com.tarantulapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class SexIdExplanationService {

    private static final Logger log = LoggerFactory.getLogger(SexIdExplanationService.class);
    private static final String FALLBACK_MODEL = "gpt-4o-mini";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.sex-id.llm.enabled:false}")
    private boolean enabled;

    @Value("${app.sex-id.llm.api-url:https://api.openai.com/v1/chat/completions}")
    private String apiUrl;

    @Value("${app.sex-id.llm.model:" + FALLBACK_MODEL + "}")
    private String model;

    @Value("${app.sex-id.llm.api-key:}")
    private String apiKey;

    public SexIdExplanationService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public Optional<String> generateExplanation(double probability, double confidence, String stage, String imageType, String species) {
        if (!enabled || apiKey == null || apiKey.isBlank()) {
            return Optional.empty();
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey.trim());

            String safeStage = stage == null || stage.isBlank() ? "unknown" : stage;
            String safeImageType = imageType == null || imageType.isBlank() ? "unknown" : imageType;
            String safeSpecies = species == null || species.isBlank() ? "unknown" : species;

            String systemPrompt = """
                    You write short, careful pet-keeper explanations for sex estimation.
                    Rules:
                    - Never assert certainty.
                    - Avoid diagnosis language.
                    - Use plain Spanish.
                    - Keep output to 1-2 sentences.
                    - Mention uncertainty factors if confidence is low.
                    - Use "probablemente" or similar soft language.
                    """;

            String userPrompt = """
                    Datos:
                    - male_probability: %.3f
                    - confidence: %.3f
                    - stage: %s
                    - image_type: %s
                    - species: %s

                    Devuelve solo la explicacion final en espanol.
                    """.formatted(probability, confidence, safeStage, safeImageType, safeSpecies);

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("model", model == null || model.isBlank() ? FALLBACK_MODEL : model);
            payload.put("temperature", 0.3);
            payload.put("max_tokens", 120);
            payload.put("messages", List.of(
                    Map.of("role", "system", "content", systemPrompt),
                    Map.of("role", "user", "content", userPrompt)
            ));

            HttpEntity<Map<String, Object>> req = new HttpEntity<>(payload, headers);
            ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.POST, req, String.class);
            String body = response.getBody();
            if (body == null || body.isBlank()) {
                return Optional.empty();
            }

            JsonNode root = objectMapper.readTree(body);
            JsonNode choices = root.path("choices");
            if (!choices.isArray() || choices.isEmpty()) {
                return Optional.empty();
            }
            String text = choices.get(0).path("message").path("content").asText("").trim();
            if (text.isEmpty()) {
                return Optional.empty();
            }
            return Optional.of(text);
        } catch (Exception ex) {
            log.debug("Sex ID LLM explanation failed: {}", ex.getMessage());
            return Optional.empty();
        }
    }
}
