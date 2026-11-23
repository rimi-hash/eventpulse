package com.eventpulse.common.exception;

import com.eventpulse.common.filter.CorrelationIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

/**
 * Universal Global Exception Handler translating exceptions into RFC 7807 Problem Details.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final String ERROR_DOCS_BASE_URI = "https://eventpulse.io/errors/";

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ProblemDetailResponse> handleApiException(ApiException ex, HttpServletRequest request) {
        log.warn("Business exception occurred: {} - {}", ex.getErrorCode().getCode(), ex.getMessage());
        ErrorCode code = ex.getErrorCode();

        ProblemDetailResponse problem = buildProblemDetail(
                code.getHttpStatus(),
                code.getCode(),
                code.getDefaultMessage(),
                ex.getMessage(),
                request.getRequestURI(),
                ex.getErrorDetails()
        );
        return ResponseEntity.status(code.getHttpStatus()).body(problem);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetailResponse> handleValidationException(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        log.warn("Validation failure on request {}: {}", request.getRequestURI(), ex.getMessage());

        List<ErrorDetail> errorDetails = new ArrayList<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errorDetails.add(new ErrorDetail(
                    fieldError.getField(),
                    fieldError.getRejectedValue(),
                    fieldError.getDefaultMessage()
            ));
        }

        ProblemDetailResponse problem = buildProblemDetail(
                HttpStatus.BAD_REQUEST,
                ErrorCode.VALIDATION_FAILED.getCode(),
                "Validation Error",
                "One or more request parameters failed validation",
                request.getRequestURI(),
                errorDetails
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetailResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        log.warn("Access denied on request {}: {}", request.getRequestURI(), ex.getMessage());
        ProblemDetailResponse problem = buildProblemDetail(
                HttpStatus.FORBIDDEN,
                ErrorCode.FORBIDDEN.getCode(),
                "Forbidden",
                "You do not possess the required permissions to access this resource",
                request.getRequestURI(),
                null
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(problem);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ProblemDetailResponse> handleAuthentication(AuthenticationException ex, HttpServletRequest request) {
        log.warn("Authentication failure on request {}: {}", request.getRequestURI(), ex.getMessage());
        ProblemDetailResponse problem = buildProblemDetail(
                HttpStatus.UNAUTHORIZED,
                ErrorCode.UNAUTHORIZED.getCode(),
                "Unauthorized",
                "Valid credentials or authentication token required",
                request.getRequestURI(),
                null
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(problem);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ProblemDetailResponse> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        ProblemDetailResponse problem = buildProblemDetail(
                HttpStatus.METHOD_NOT_ALLOWED,
                "METHOD_NOT_ALLOWED",
                "Method Not Allowed",
                ex.getMessage(),
                request.getRequestURI(),
                null
        );
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(problem);
    }

    @ExceptionHandler({NoHandlerFoundException.class, org.springframework.web.servlet.resource.NoResourceFoundException.class})
    public ResponseEntity<ProblemDetailResponse> handleNotFound(Exception ex, HttpServletRequest request) {
        ProblemDetailResponse problem = buildProblemDetail(
                HttpStatus.NOT_FOUND,
                ErrorCode.RESOURCE_NOT_FOUND.getCode(),
                "Not Found",
                "Endpoint " + request.getRequestURI() + " does not exist",
                request.getRequestURI(),
                null
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetailResponse> handleGenericException(Exception ex, HttpServletRequest request) {
        log.error("Unhandled internal server error on endpoint: " + request.getRequestURI(), ex);
        ProblemDetailResponse problem = buildProblemDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                ErrorCode.INTERNAL_SERVER_ERROR.getCode(),
                "Internal Server Error",
                "An unexpected internal error occurred. Please reference the correlation ID when reporting.",
                request.getRequestURI(),
                null
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problem);
    }

    private ProblemDetailResponse buildProblemDetail(
            HttpStatus status,
            String errorCode,
            String title,
            String detail,
            String instance,
            List<ErrorDetail> errorDetails) {

        String correlationId = MDC.get(CorrelationIdFilter.CORRELATION_ID_HEADER);
        if (correlationId == null) {
            correlationId = "ep-local-" + System.currentTimeMillis();
        }

        ProblemDetailResponse problem = new ProblemDetailResponse();
        problem.setType(URI.create(ERROR_DOCS_BASE_URI + errorCode));
        problem.setTitle(title);
        problem.setStatus(status.value());
        problem.setDetail(detail);
        problem.setInstance(instance);
        problem.setErrorCode(errorCode);
        problem.setCorrelationId(correlationId);
        problem.setErrors(errorDetails);

        return problem;
    }
}
