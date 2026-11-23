package com.eventpulse.assistant.dto;

public record ResponseSourceDto(
        String type,
        boolean verified,
        String sourceDetails
) {
    public static ResponseSourceDto database(String details) {
        return new ResponseSourceDto("EVENTPULSE_DATABASE", true, details);
    }

    public static ResponseSourceDto service(String serviceName) {
        return new ResponseSourceDto("EVENTPULSE_SERVICE", true, serviceName);
    }

    public static ResponseSourceDto security(String policy) {
        return new ResponseSourceDto("SPRING_SECURITY", true, policy);
    }
}
