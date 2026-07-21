package com.careconnect360.common.exception;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidationErrors(
            MethodArgumentNotValidException exception,
            WebRequest request) {

        String message = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .findFirst()
                .map(FieldError::getDefaultMessage)
                .orElse("Request validation failed");

        return buildResponse(
                HttpStatus.BAD_REQUEST,
                message,
                request,
                "Bad Request");
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiErrorResponse> handleBadRequest(
            BadRequestException exception,
            WebRequest request) {

        return buildResponse(
                HttpStatus.BAD_REQUEST,
                exception.getMessage(),
                request,
                "Bad Request");
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleBadCredentials(
            BadCredentialsException exception,
            WebRequest request) {

        return buildResponse(
                HttpStatus.UNAUTHORIZED,
                "Invalid email or password",
                request,
                "Unauthorized");
    }

    @ExceptionHandler({DisabledException.class, LockedException.class})
    public ResponseEntity<ApiErrorResponse> handleUnavailableAccount(
            Exception exception,
            WebRequest request) {

        return buildResponse(
                HttpStatus.FORBIDDEN,
                "This account is inactive or locked",
                request,
                "Forbidden");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(
            AccessDeniedException exception,
            WebRequest request) {

        return buildResponse(
                HttpStatus.FORBIDDEN,
                "Access is denied",
                request,
                "Forbidden");
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(
            ResourceNotFoundException exception,
            WebRequest request) {

        return buildResponse(
                HttpStatus.NOT_FOUND,
                exception.getMessage(),
                request,
                "Not Found");
    }

        @ExceptionHandler(NoResourceFoundException.class)
        public ResponseEntity<ApiErrorResponse> handleNoResourceFound(
                        NoResourceFoundException exception,
                        WebRequest request) {

                return buildResponse(
                                HttpStatus.NOT_FOUND,
                                "Resource not found",
                                request,
                                "Not Found");
        }

    @ExceptionHandler(ForbiddenOperationException.class)
    public ResponseEntity<ApiErrorResponse> handleForbiddenOperation(
            ForbiddenOperationException exception,
            WebRequest request) {

        return buildResponse(
                HttpStatus.FORBIDDEN,
                exception.getMessage(),
                request,
                "Forbidden");
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ApiErrorResponse> handleDuplicate(
            DuplicateResourceException exception,
            WebRequest request) {

        return buildResponse(
                HttpStatus.CONFLICT,
                exception.getMessage(),
                request,
                "Conflict");
    }

    @ExceptionHandler(InvalidStatusTransitionException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidStatusTransition(
            InvalidStatusTransitionException exception,
            WebRequest request) {

        return buildResponse(
                HttpStatus.CONFLICT,
                exception.getMessage(),
                request,
                "Conflict");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(
            Exception exception,
            WebRequest request) {

        return buildResponse(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Internal server error",
                request,
                "Internal Server Error");
    }

    private ResponseEntity<ApiErrorResponse> buildResponse(
            HttpStatus status,
            String message,
            WebRequest request,
            String error) {

        ApiErrorResponse response = new ApiErrorResponse(
                Instant.now(),
                status.value(),
                error,
                message,
                request.getDescription(false).replace("uri=", ""));

        return ResponseEntity.status(status).body(response);
    }
}
