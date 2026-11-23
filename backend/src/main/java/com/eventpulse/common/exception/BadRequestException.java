package com.eventpulse.common.exception;

import java.util.List;

public class BadRequestException extends ApiException {

    public BadRequestException(String message) {
        super(ErrorCode.BAD_REQUEST, message);
    }

    public BadRequestException(String message, List<ErrorDetail> details) {
        super(ErrorCode.VALIDATION_FAILED, message, details);
    }
}
