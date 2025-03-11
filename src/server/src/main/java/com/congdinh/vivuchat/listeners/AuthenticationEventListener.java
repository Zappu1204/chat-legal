package com.congdinh.vivuchat.listeners;

import com.congdinh.vivuchat.events.AuthenticationEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class AuthenticationEventListener {

    @EventListener
    public void handleAuthenticationEvent(AuthenticationEvent event) {
        // Log authentication events
        switch (event.getEventType()) {
            case LOGIN_SUCCESS:
                log.info("Login success - User: {}, IP: {}", event.getUsername(), event.getIpAddress());
                break;
            case LOGIN_FAILED:
                log.warn("Login failed - User: {}, IP: {}, Reason: {}", 
                         event.getUsername(), event.getIpAddress(), event.getMessage());
                break;
            case LOGOUT:
                log.info("Logout - User: {}, IP: {}", event.getUsername(), event.getIpAddress());
                break;
            case REGISTER_SUCCESS:
                log.info("Registration - User: {}, IP: {}", event.getUsername(), event.getIpAddress());
                break;
            case REFRESH_TOKEN:
                log.debug("Token refresh - User: {}, IP: {}", event.getUsername(), event.getIpAddress());
                break;
            case INVALID_TOKEN:
                log.warn("Invalid token - User: {}, IP: {}, Reason: {}", 
                         event.getUsername(), event.getIpAddress(), event.getMessage());
                break;
            case ACCOUNT_LOCKED:
                log.warn("Account locked - User: {}, IP: {}, Reason: {}", 
                         event.getUsername(), event.getIpAddress(), event.getMessage());
                break;
        }
        
        // Here you could also:
        // 1. Save event to security audit database
        // 2. Send notifications for suspicious activity
        // 3. Trigger account lockout after multiple failed attempts
    }
}
