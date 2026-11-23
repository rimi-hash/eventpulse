package com.eventpulse.assistant.model;

/**
 * Strict state taxonomy for YAS Assistant workflow execution.
 * Ensures the assistant distinguishes intent understanding from actual business execution.
 */
public enum ExecutionStatus {
    UNDERSTANDING,
    NEEDS_CLARIFICATION,
    REQUIRES_AUTHENTICATION,
    REQUIRES_CONFIRMATION,
    RETRIEVING_DATA,
    EXECUTING,
    AWAITING_PAYMENT,
    VERIFYING,
    SUCCESS,
    PARTIAL_SUCCESS,
    NOT_FOUND,
    SOLD_OUT,
    FORBIDDEN,
    VALIDATION_ERROR,
    FAILED
}
