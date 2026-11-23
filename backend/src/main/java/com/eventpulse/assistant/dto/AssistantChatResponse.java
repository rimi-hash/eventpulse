package com.eventpulse.assistant.dto;

import com.eventpulse.assistant.model.AssistantIntent;
import com.eventpulse.assistant.model.ExecutionStatus;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Strict, structured response contract for YAS AI Assistant.
 * Every response contains verified sources, explicit execution status, and structured data.
 */
public record AssistantChatResponse(
        String requestId,
        String originalTranscript,
        AssistantIntent intent,
        String status, // ExecutionStatus name
        String spokenText,
        String displayText,
        String actionRoute,
        Object data,
        boolean requiresConfirmation,
        Map<String, Object> pendingAction,
        BookingQuoteDto bookingQuote,
        List<ResponseSourceDto> sources,
        List<String> missingInformation,
        List<String> suggestedFollowUps,
        ActionResultDto action
) {
    // 14-argument backwards compatibility constructor
    public AssistantChatResponse(
            String requestId,
            String originalTranscript,
            AssistantIntent intent,
            String status,
            String spokenText,
            String displayText,
            String actionRoute,
            Object data,
            boolean requiresConfirmation,
            Map<String, Object> pendingAction,
            List<ResponseSourceDto> sources,
            List<String> missingInformation,
            List<String> suggestedFollowUps,
            ActionResultDto action
    ) {
        this(
                requestId,
                originalTranscript,
                intent,
                status,
                spokenText,
                displayText,
                actionRoute,
                data,
                requiresConfirmation,
                pendingAction,
                null,
                sources,
                missingInformation,
                suggestedFollowUps,
                action
        );
    }

    public ExecutionStatus executionStatus() {
        try {
            return status != null ? ExecutionStatus.valueOf(status) : null;
        } catch (Exception e) {
            return null;
        }
    }

    public static AssistantChatResponse success(
            String transcript,
            AssistantIntent intent,
            String spokenText,
            String displayText,
            String actionRoute,
            Object data
    ) {
        String reqId = "yas-" + UUID.randomUUID();
        ActionResultDto action = actionRoute != null ? ActionResultDto.navigated(actionRoute) : ActionResultDto.none();
        return new AssistantChatResponse(
                reqId,
                transcript,
                intent,
                ExecutionStatus.SUCCESS.name(),
                spokenText,
                displayText,
                actionRoute,
                data,
                false,
                null,
                null,
                List.of(ResponseSourceDto.service("EventPulse Domain Services"), ResponseSourceDto.database("PostgreSQL Production Catalog")),
                Collections.emptyList(),
                List.of("View event details", "Filter by city", "Show my tickets"),
                action
        );
    }

    public static AssistantChatResponse selectionUpdated(
            String transcript,
            AssistantIntent intent,
            String spokenText,
            String displayText,
            Object data,
            List<String> followUps
    ) {
        String reqId = "yas-" + UUID.randomUUID();
        return new AssistantChatResponse(
                reqId,
                transcript,
                intent,
                ExecutionStatus.SUCCESS.name(),
                spokenText,
                displayText,
                null,
                data,
                false,
                null,
                null,
                List.of(ResponseSourceDto.service("EventPulse Seating Geometry Engine")),
                Collections.emptyList(),
                followUps != null ? followUps : List.of("Book selected seats", "Choose another seat", "View pricing breakdown"),
                ActionResultDto.none()
        );
    }

    public static AssistantChatResponse requiresAuth(
            String transcript,
            AssistantIntent intent,
            String spokenText,
            Map<String, Object> preservedContext
    ) {
        String reqId = "yas-" + UUID.randomUUID();
        return new AssistantChatResponse(
                reqId,
                transcript,
                intent,
                ExecutionStatus.REQUIRES_AUTHENTICATION.name(),
                spokenText,
                "Authentication Required: Please sign in to complete your booking and access account records.",
                "/login",
                preservedContext,
                false,
                null,
                null,
                List.of(ResponseSourceDto.security("Spring Security Context (Unauthenticated)")),
                List.of("User authentication session"),
                List.of("Sign in to EventPulse", "Explore public events"),
                ActionResultDto.navigated("/login")
        );
    }

    public static AssistantChatResponse requiresAuth(String transcript, AssistantIntent intent, String spokenText) {
        return requiresAuth(transcript, intent, spokenText, null);
    }

    public static AssistantChatResponse forbidden(String transcript, AssistantIntent intent, String spokenText) {
        String reqId = "yas-" + UUID.randomUUID();
        return new AssistantChatResponse(
                reqId,
                transcript,
                intent,
                ExecutionStatus.FORBIDDEN.name(),
                spokenText,
                "Access Denied: You do not have permission to view organizer or platform administrative records.",
                null,
                null,
                false,
                null,
                null,
                List.of(ResponseSourceDto.security("Role-Based Authorization Policy")),
                List.of("Organizer or Admin Authority"),
                List.of("Browse public events", "View my tickets"),
                ActionResultDto.none()
        );
    }

    public static AssistantChatResponse confirmation(
            String transcript,
            AssistantIntent intent,
            String spokenText,
            String displayText,
            String actionRoute,
            Map<String, Object> pendingAction,
            BookingQuoteDto quote
    ) {
        String reqId = "yas-" + UUID.randomUUID();
        String actionName = pendingAction != null ? (String) pendingAction.getOrDefault("actionName", intent.name()) : intent.name();
        return new AssistantChatResponse(
                reqId,
                transcript,
                intent,
                ExecutionStatus.REQUIRES_CONFIRMATION.name(),
                spokenText,
                displayText,
                actionRoute,
                quote,
                true,
                pendingAction,
                quote,
                List.of(ResponseSourceDto.service("EventPulse Transaction Safeguard & Pricing Engine")),
                Collections.emptyList(),
                List.of("Confirm & Proceed", "Cancel action", "Change ticket category"),
                ActionResultDto.pendingConfirmation(actionName)
        );
    }

    public static AssistantChatResponse confirmation(
            String transcript,
            AssistantIntent intent,
            String spokenText,
            String displayText,
            String actionRoute,
            Map<String, Object> pendingAction
    ) {
        return confirmation(transcript, intent, spokenText, displayText, actionRoute, pendingAction, null);
    }

    public static AssistantChatResponse needsClarification(
            String transcript,
            AssistantIntent intent,
            String spokenText,
            String displayText,
            List<String> missingInfo,
            List<String> options
    ) {
        String reqId = "yas-" + UUID.randomUUID();
        return new AssistantChatResponse(
                reqId,
                transcript,
                intent,
                ExecutionStatus.NEEDS_CLARIFICATION.name(),
                spokenText,
                displayText,
                null,
                null,
                false,
                null,
                null,
                List.of(ResponseSourceDto.service("YAS Conversational Disambiguation")),
                missingInfo != null ? missingInfo : Collections.emptyList(),
                options != null ? options : List.of(),
                ActionResultDto.none()
        );
    }

    public static AssistantChatResponse awaitingPayment(
            String transcript,
            AssistantIntent intent,
            String spokenText,
            String displayText,
            String actionRoute,
            Object orderData
    ) {
        String reqId = "yas-" + UUID.randomUUID();
        return new AssistantChatResponse(
                reqId,
                transcript,
                intent,
                ExecutionStatus.AWAITING_PAYMENT.name(),
                spokenText,
                displayText,
                actionRoute,
                orderData,
                false,
                null,
                null,
                List.of(ResponseSourceDto.service("EventPulse Inventory & Order Engine")),
                Collections.emptyList(),
                List.of("Proceed to Payment", "Apply coupon code", "View order breakdown"),
                ActionResultDto.navigated(actionRoute)
        );
    }

    public static AssistantChatResponse noResults(
            String transcript,
            AssistantIntent intent,
            String spokenText,
            String displayText,
            String actionRoute
    ) {
        String reqId = "yas-" + UUID.randomUUID();
        return new AssistantChatResponse(
                reqId,
                transcript,
                intent,
                ExecutionStatus.NOT_FOUND.name(),
                spokenText,
                displayText,
                actionRoute,
                null,
                false,
                null,
                null,
                List.of(ResponseSourceDto.database("PostgreSQL Authoritative Query")),
                Collections.emptyList(),
                List.of("Explore all concerts", "Browse comedy shows in Chennai", "Check resale marketplace"),
                actionRoute != null ? ActionResultDto.navigated(actionRoute) : ActionResultDto.none()
        );
    }

    public static AssistantChatResponse soldOut(
            String transcript,
            AssistantIntent intent,
            String spokenText,
            String displayText,
            List<String> alternatives
    ) {
        String reqId = "yas-" + UUID.randomUUID();
        return new AssistantChatResponse(
                reqId,
                transcript,
                intent,
                ExecutionStatus.SOLD_OUT.name(),
                spokenText,
                displayText,
                null,
                null,
                false,
                null,
                null,
                List.of(ResponseSourceDto.database("PostgreSQL Inventory State")),
                Collections.emptyList(),
                alternatives != null ? alternatives : List.of("View other dates", "Check resale marketplace"),
                ActionResultDto.none()
        );
    }

    public static AssistantChatResponse fallback(String transcript, String spokenText, String displayText) {
        String reqId = "yas-" + UUID.randomUUID();
        return new AssistantChatResponse(
                reqId,
                transcript,
                AssistantIntent.UNKNOWN_OR_UNSUPPORTED,
                ExecutionStatus.FAILED.name(),
                spokenText,
                displayText,
                null,
                null,
                false,
                null,
                null,
                List.of(ResponseSourceDto.service("YAS Heuristic & AI Pipeline")),
                Collections.emptyList(),
                List.of("Find concerts in Chennai", "Show my tickets", "Open resale marketplace"),
                ActionResultDto.none()
        );
    }

    public static AssistantChatResponse error(String transcript, String spokenText, String displayText) {
        String reqId = "yas-" + UUID.randomUUID();
        return new AssistantChatResponse(
                reqId,
                transcript,
                AssistantIntent.UNKNOWN_OR_UNSUPPORTED,
                ExecutionStatus.FAILED.name(),
                spokenText,
                displayText,
                null,
                null,
                false,
                null,
                null,
                List.of(ResponseSourceDto.service("EventPulse Service Error")),
                Collections.emptyList(),
                List.of("Retry command", "Browse published events"),
                ActionResultDto.none()
        );
    }
}
