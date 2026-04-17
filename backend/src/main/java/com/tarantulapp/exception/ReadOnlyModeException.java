package com.tarantulapp.exception;

/**
 * La cuenta está en modo solo lectura (tras fin de prueba sin suscripción Pro).
 */
public class ReadOnlyModeException extends RuntimeException {

    public ReadOnlyModeException(String message) {
        super(message);
    }
}
