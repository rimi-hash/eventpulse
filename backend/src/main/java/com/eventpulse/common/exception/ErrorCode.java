package com.eventpulse.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Standard domain error codes for EventPulse.
 */
public enum ErrorCode {
    INTERNAL_SERVER_ERROR("INTERNAL_ERROR", HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected server error occurred"),
    RESOURCE_NOT_FOUND("RESOURCE_NOT_FOUND", HttpStatus.NOT_FOUND, "Requested resource was not found"),
    BAD_REQUEST("BAD_REQUEST", HttpStatus.BAD_REQUEST, "The request payload or parameter is invalid"),
    VALIDATION_FAILED("VALIDATION_FAILED", HttpStatus.BAD_REQUEST, "Field validation failed"),
    UNAUTHORIZED("UNAUTHORIZED", HttpStatus.UNAUTHORIZED, "Authentication is required to access this resource"),
    FORBIDDEN("FORBIDDEN", HttpStatus.FORBIDDEN, "You do not have permission to perform this action"),
    CONFLICT("CONFLICT", HttpStatus.CONFLICT, "A state conflict occurred"),
    INVENTORY_ALREADY_HELD("INVENTORY_ALREADY_HELD", HttpStatus.CONFLICT, "One or more requested seats are currently held"),
    INVENTORY_SOLD_OUT("INVENTORY_SOLD_OUT", HttpStatus.CONFLICT, "Requested ticket category or seats are sold out"),
    HOLD_EXPIRED("HOLD_EXPIRED", HttpStatus.GONE, "The ephemeral seat hold lease has expired"),
    IDEMPOTENCY_KEY_IN_PROGRESS("IDEMPOTENCY_CONFLICT", HttpStatus.CONFLICT, "A request with this idempotency key is already processing"),
    RATE_LIMIT_EXCEEDED("RATE_LIMIT_EXCEEDED", HttpStatus.TOO_MANY_REQUESTS, "Request rate limit exceeded. Please wait.");

    private final String code;
    private final HttpStatus httpStatus;
    private final String defaultMessage;

    ErrorCode(String code, HttpStatus httpStatus, String defaultMessage) {
        this.code = code;
        this.httpStatus = httpStatus;
        this.defaultMessage = defaultMessage;
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }

    public String getDefaultMessage() {
        return defaultMessage;
    }
}
