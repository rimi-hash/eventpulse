package com.eventpulse.assistant.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.*;

/**
 * Production-minded Gemini Developer API client.
 * Uses HTTP client with timeouts, safe error recovery, and strict secret protection.
 */
@Component
public class GeminiAiProviderClient implements AiProviderClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiAiProviderClient.class);

    @Value("${eventpulse.assistant.gemini.api-key:}")
    private String apiKey;

    @Value("${eventpulse.assistant.gemini.model:gemini-2.5-flash-lite}")
    private String modelName;

    @Value("${eventpulse.assistant.gemini.base-url:https://generativelanguage.googleapis.com/v1beta}")
    private String baseUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public GeminiAiProviderClient(
            RestTemplateBuilder restTemplateBuilder,
            ObjectMapper objectMapper,
            @Value("${eventpulse.assistant.gemini.timeout-ms:10000}") int timeoutMs
    ) {
        this.restTemplate = restTemplateBuilder
                .connectTimeout(Duration.ofMillis(timeoutMs))
                .readTimeout(Duration.ofMillis(timeoutMs))
                .build();
        this.objectMapper = objectMapper;
    }

    @Override
    public String getProviderName() {
        return "Google Gemini (" + modelName + ")";
    }

    @Override
    public String generateContent(String systemInstruction, String userPrompt) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("Gemini API key is not configured. Assistant cannot query external AI.");
            return null;
        }

        try {
            String sanitizedModel = modelName.startsWith("models/") ? modelName : "models/" + modelName;
            String endpointUrl = baseUrl + "/" + sanitizedModel + ":generateContent?key=" + apiKey.trim();

            // Construct payload matching Gemini Developer API structure
            Map<String, Object> requestPayload = new LinkedHashMap<>();

            // System instructions
            if (systemInstruction != null && !systemInstruction.trim().isEmpty()) {
                Map<String, Object> systemPart = Map.of("text", systemInstruction.trim());
                requestPayload.put("systemInstruction", Map.of("parts", List.of(systemPart)));
            }

            // User prompt contents
            Map<String, Object> userPart = Map.of("text", userPrompt != null ? userPrompt.trim() : "");
            Map<String, Object> contentItem = Map.of(
                    "role", "user",
                    "parts", List.of(userPart)
            );
            requestPayload.put("contents", List.of(contentItem));

            // Generation config for deterministic structured JSON
            requestPayload.put("generationConfig", Map.of(
                    "temperature", 0.1,
                    "maxOutputTokens", 800,
                    "responseMimeType", "application/json"
            ));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestPayload, headers);

            log.debug("Sending AI request to model: {}", sanitizedModel);
            ResponseEntity<String> response = restTemplate.exchange(endpointUrl, HttpMethod.POST, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return extractTextFromResponse(response.getBody());
            } else {
                log.warn("Gemini returned non-2xx status: {}", response.getStatusCode());
                return null;
            }

        } catch (HttpClientErrorException.TooManyRequests e) {
            log.error("Gemini API quota exceeded or rate limited (HTTP 429). Returning safe fallback.");
            return null;
        } catch (HttpClientErrorException | HttpServerErrorException e) {
            log.error("Gemini API HTTP error (status: {}): {}", e.getStatusCode(), e.getStatusText());
            return null;
        } catch (ResourceAccessException e) {
            log.error("Gemini API request timed out or network connection failed: {}", e.getMessage());
            return null;
        } catch (Exception e) {
            log.error("Unexpected error invoking Gemini AI provider: {}", e.getMessage());
            return null;
        }
    }

    private String extractTextFromResponse(String rawJson) {
        try {
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    String text = parts.get(0).path("text").asText("");
                    return cleanCodeFences(text);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to extract content text from Gemini response: {}", e.getMessage());
        }
        return null;
    }

    private String cleanCodeFences(String text) {
        if (text == null) return null;
        String trimmed = text.trim();
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed.trim();
    }
}
