package com.congdinh.vivuchat.exceptions;

import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.context.request.async.AsyncRequestTimeoutException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.nio.file.AccessDeniedException;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @Data
    public static class ErrorResponse {
        private int status;
        private Date timestamp;
        private String message;
        private String path;
        
        public ErrorResponse(int status, Date timestamp, String message, String path) {
            this.status = status;
            this.timestamp = timestamp;
            this.message = message;
            this.path = path;
        }
    }
    
    @ExceptionHandler(TokenRefreshException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ErrorResponse handleTokenRefreshException(TokenRefreshException ex, HttpServletRequest request) {
        log.error("Token refresh exception: {}", ex.getMessage());
        return new ErrorResponse(
                HttpStatus.FORBIDDEN.value(),
                new Date(),
                ex.getMessage(),
                request.getRequestURI());
    }
    
    @ExceptionHandler(BadCredentialsException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ErrorResponse handleBadCredentialsException(BadCredentialsException ex, HttpServletRequest request) {
        log.error("Bad credentials: {}", ex.getMessage());
        return new ErrorResponse(
                HttpStatus.UNAUTHORIZED.value(),
                new Date(),
                "Invalid username or password",
                request.getRequestURI());
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> validationErrors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            validationErrors.put(fieldName, errorMessage);
        });
        
        Map<String, Object> response = new HashMap<>();
        response.put("status", HttpStatus.BAD_REQUEST.value());
        response.put("timestamp", new Date());
        response.put("message", "Validation failed");
        response.put("path", request.getRequestURI());
        response.put("errors", validationErrors);
        
        log.error("Validation errors: {}", validationErrors);
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }
    
    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponse handleDataIntegrityViolationException(DataIntegrityViolationException ex, HttpServletRequest request) {
        log.error("Data integrity violation: {}", ex.getMessage());
        
        String message = "Database constraint violation";
        if (ex.getMessage() != null && ex.getMessage().contains("uk7tdcd6ab5wsgoudnvj7xf1b7l")) {
            message = "User already has an active refresh token";
        }
        
        return new ErrorResponse(
                HttpStatus.CONFLICT.value(),
                new Date(),
                message,
                request.getRequestURI());
    }
    
    // Combined generic Exception handler that works with both HttpServletRequest and WebRequest
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleAllExceptions(Exception ex, WebRequest request, HttpServletRequest httpRequest) {
        log.error("Unhandled exception: ", ex);
        
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        body.put("message", "An unexpected error occurred");
        body.put("path", httpRequest != null ? httpRequest.getRequestURI() : "unknown");
        
        if (ex != null && ex.getMessage() != null) {
            body.put("details", ex.getMessage());
        } else {
            body.put("details", "Unknown error");
        }
        
        return new ResponseEntity<>(body, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    
    @ExceptionHandler(ChatException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleChatException(ChatException ex, HttpServletRequest request) {
        log.error("Chat exception: {}", ex.getMessage());
        return new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                new Date(),
                ex.getMessage(),
                request.getRequestURI());
    }
    
    @ExceptionHandler(UsernameNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleUsernameNotFoundException(UsernameNotFoundException ex, HttpServletRequest request) {
        log.error("User not found: {}", ex.getMessage());
        return new ErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                new Date(),
                ex.getMessage(),
                request.getRequestURI());
    }
    
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleIllegalArgumentException(IllegalArgumentException ex, HttpServletRequest request) {
        log.error("Invalid argument: {}", ex.getMessage());
        return new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                new Date(),
                ex.getMessage(),
                request.getRequestURI());
    }
    
    @ExceptionHandler(WebClientResponseException.class)
    public ResponseEntity<Object> handleWebClientResponseException(WebClientResponseException ex, WebRequest request, HttpServletRequest httpRequest) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", ex.getStatusCode().value());
        body.put("message", "External service error");
        body.put("path", httpRequest != null ? httpRequest.getRequestURI() : "unknown");
        
        if (ex.getMessage() != null) {
            body.put("details", ex.getMessage());
        } else {
            body.put("details", "Error from external service");
        }
        
        log.error("WebClient error: {} - {}", ex.getStatusCode(), ex.toString());
        return new ResponseEntity<>(body, ex.getStatusCode());
    }
    
    @ExceptionHandler(AsyncRequestTimeoutException.class)
    public ResponseEntity<Object> handleAsyncRequestTimeoutException(AsyncRequestTimeoutException ex, WebRequest request) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("message", "Request processing timed out");
        
        log.warn("Async request timed out");
        return new ResponseEntity<>(body, HttpStatus.REQUEST_TIMEOUT);
    }
    
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Object> handleAccessDeniedException(AccessDeniedException ex, WebRequest request) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("message", "Access denied");
        
        if (ex.getMessage() != null) {
            body.put("details", ex.getMessage());
        }
        
        return new ResponseEntity<>(body, HttpStatus.FORBIDDEN);
    }
    
    @ExceptionHandler(NullPointerException.class)
    public ResponseEntity<Object> handleNullPointerException(NullPointerException ex, WebRequest request) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("message", "The server encountered an internal error");
        
        log.error("NullPointerException: ", ex);
        return new ResponseEntity<>(body, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
