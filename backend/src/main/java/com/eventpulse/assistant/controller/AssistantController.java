package com.eventpulse.assistant.controller;

import com.eventpulse.assistant.dto.AssistantChatRequest;
import com.eventpulse.assistant.dto.AssistantChatResponse;
import com.eventpulse.assistant.model.AssistantIntent;
import com.eventpulse.assistant.service.AssistantOrchestratorService;
import com.eventpulse.assistant.service.ToolRegistryService;
import com.eventpulse.auth.security.UserPrincipal;
import com.eventpulse.common.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/assistant")
@Tag(name = "YAS AI Assistant", description = "Endpoints for natural language voice commands, intent parsing, and verified action execution")
public class AssistantController {

    private final AssistantOrchestratorService orchestratorService;
    private final ToolRegistryService toolRegistryService;

    public AssistantController(
            AssistantOrchestratorService orchestratorService,
            ToolRegistryService toolRegistryService
    ) {
        this.orchestratorService = orchestratorService;
        this.toolRegistryService = toolRegistryService;
    }

    @PostMapping("/chat")
    @Operation(summary = "Process natural-language voice/text command",
               description = "Interprets transcript via Gemini AI into strict approved schema, executes action with server-side authorization, and generates speech synthesis response")
    public ResponseEntity<ApiResponse<AssistantChatResponse>> processVoiceCommand(
            @Valid @RequestBody AssistantChatRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        AssistantChatResponse response = orchestratorService.processUserCommand(request, principal);
        return ResponseEntity.ok(ApiResponse.ok("Assistant response generated", response));
    }

    @GetMapping("/intents")
    @Operation(summary = "List supported assistant intent schema allowlist")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSupportedIntents() {
        List<Map<String, Object>> intents = Arrays.stream(AssistantIntent.values())
                .map(i -> Map.<String, Object>of(
                        "name", i.name(),
                        "isTransactional", i.isTransactional(),
                        "requiresAuth", i.requiresAuthentication()
                ))
                .toList();
        return ResponseEntity.ok(ApiResponse.ok("Supported intents allowlist", intents));
    }

    @GetMapping("/tools")
    @Operation(summary = "List verified YAS capability registry tools with schemas and permission levels")
    public ResponseEntity<ApiResponse<List<ToolRegistryService.ToolDefinition>>> getCapabilityRegistry() {
        return ResponseEntity.ok(ApiResponse.ok("YAS Capability Registry", toolRegistryService.getAllTools()));
    }
}
