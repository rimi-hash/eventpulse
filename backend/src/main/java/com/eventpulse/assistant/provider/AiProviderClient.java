package com.eventpulse.assistant.provider;

/**
 * Replaceable AI provider abstraction.
 * Allows switching or augmenting Gemini with other inference providers (e.g. Hugging Face).
 */
public interface AiProviderClient {

    /**
     * Provider identification name for telemetry and diagnostics.
     */
    String getProviderName();

    /**
     * Interprets a user prompt using a system instruction and returns the raw response string.
     *
     * @param systemInstruction Constraining prompt establishing output format and schemas.
     * @param userPrompt The sanitized user voice transcript or text query.
     * @return Generated model response (typically JSON).
     */
    String generateContent(String systemInstruction, String userPrompt);
}
