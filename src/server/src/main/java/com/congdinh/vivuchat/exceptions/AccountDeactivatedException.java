package com.congdinh.vivuchat.exceptions;

import org.springframework.security.core.AuthenticationException;

/**
 * Exception thrown when a user tries to authenticate with a deactivated account.
 * Extends AuthenticationException to fit into Spring Security's authentication flow.
 */
public class AccountDeactivatedException extends AuthenticationException {
    
    public AccountDeactivatedException(String message) {
        super(message);
    }
    
    public AccountDeactivatedException(String message, Throwable cause) {
        super(message, cause);
    }
}
