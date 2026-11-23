package com.eventpulse.assistant.dto;

import com.eventpulse.assistant.model.AssistantIntent;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ParsedIntentDto(
        AssistantIntent intent,
        Map<String, Object> parameters,
        boolean confirmationRequired,
        String explanation
) {}
