package com.eventpulse.assistant.dto;

public record ActionResultDto(
        boolean performed,
        boolean requiresConfirmation,
        boolean verified,
        String actionType
) {
    public static ActionResultDto none() {
        return new ActionResultDto(false, false, false, "NONE");
    }

    public static ActionResultDto navigated(String route) {
        return new ActionResultDto(true, false, true, "NAVIGATE:" + route);
    }

    public static ActionResultDto pendingConfirmation(String actionType) {
        return new ActionResultDto(false, true, false, actionType);
    }

    public static ActionResultDto completed(String actionType) {
        return new ActionResultDto(true, false, true, actionType);
    }
}
