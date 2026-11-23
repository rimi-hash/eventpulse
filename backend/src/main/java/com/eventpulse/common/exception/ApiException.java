package com.eventpulse.common.exception;

import java.util.Collections;
import java.util.List;

/**
 * Base unchecked exception for all EventPulse domain and business exceptions.
 */
public class ApiException extends RuntimeException {

    private final ErrorCode errorCode;
    private final List<ErrorDetail> errorDetails;

    public ApiException(ErrorCode errorCode) {
        super(errorCode.getDefaultMessage());
        this.errorCode = errorCode;
        this.errorDetails = Collections.emptyList();
    }

    public ApiException(ErrorCode errorCode, String customMessage) {
        super(customMessage);
        this.errorCode = errorCode;
        this.errorDetails = Collections.emptyList();
    }

    public ApiException(ErrorCode errorCode, String customMessage, List<ErrorDetail> errorDetails) {
        super(customMessage);
        this.errorCode = errorCode;
        this.errorDetails = errorDetails != null ? errorDetails : Collections.emptyList();
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }

    public List<ErrorDetail> getErrorDetails() {
        return errorDetails;
    }
}
