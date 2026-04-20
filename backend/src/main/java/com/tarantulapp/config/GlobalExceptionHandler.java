package com.tarantulapp.config;

import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.exception.RateLimitExceededException;
import com.tarantulapp.exception.ReadOnlyModeException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", e.getMessage()));
    }

    /** p. ej. JWT secret mal configurado (vacío o menos de 32 caracteres). */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleIllegalState(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(NotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "Acceso denegado"));
    }

    @ExceptionHandler(ReadOnlyModeException.class)
    public ResponseEntity<Map<String, String>> handleReadOnly(ReadOnlyModeException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "read_only", "message", e.getMessage()));
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<Map<String, String>> handleRateLimit(RateLimitExceededException e) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException e) {
        Map<String, String> fieldErrors = e.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "Valor inválido",
                        (a, b) -> a
                ));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "Validation failed", "fields", fieldErrors));
    }
}
