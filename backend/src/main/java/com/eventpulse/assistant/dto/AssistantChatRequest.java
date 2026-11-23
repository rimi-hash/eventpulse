package com.eventpulse.assistant.dto;

import jakarta.validation.constraints.Size;
import java.util.Map;

public record AssistantChatRequest(
        @Size(max = 500, message = "Transcript exceeds maximum allowed length of 500 characters")
        String transcript,

        @Size(max = 200, message = "Current path exceeds maximum allowed length")
        String currentPath,

        Boolean confirmed,

        String actionToken,

        ApplicationContextDto context,

        Map<String, Object> parameters
) {
    public AssistantChatRequest(String transcript, String currentPath, Boolean confirmed, String actionToken) {
        this(transcript, currentPath, confirmed, actionToken, null, null);
    }
}
