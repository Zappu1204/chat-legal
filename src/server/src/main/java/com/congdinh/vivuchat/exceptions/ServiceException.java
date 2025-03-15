package com.congdinh.vivuchat.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * General service exception to indicate business logic errors.
 * By default, this maps to a 400 Bad Request HTTP status.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class ServiceException extends RuntimeException {

    public ServiceException(String message) {
        super(message);
    }

    public ServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
