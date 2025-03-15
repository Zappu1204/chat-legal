package com.congdinh.vivuchat.controllers;

import com.congdinh.vivuchat.dtos.requests.LoginRequest;
import com.congdinh.vivuchat.dtos.requests.LogoutRequest;
import com.congdinh.vivuchat.dtos.requests.RefreshTokenRequest;
import com.congdinh.vivuchat.dtos.requests.RegisterRequest;
import com.congdinh.vivuchat.dtos.requests.RevokeTokenRequest;
import com.congdinh.vivuchat.dtos.responses.JwtResponse;
import com.congdinh.vivuchat.dtos.responses.MessageResponse;
import com.congdinh.vivuchat.events.AuthenticationEvent;
import com.congdinh.vivuchat.exceptions.AccountDeactivatedException;
import com.congdinh.vivuchat.exceptions.TokenRefreshException;
import com.congdinh.vivuchat.services.interfaces.IAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Authentication API endpoints")
public class AuthController {

    private final IAuthService authService;
    private final ApplicationEventPublisher eventPublisher;

    @PostMapping("/login")
    @Operation(
        summary = "Authenticate user",
        description = "Authenticate user with username and password, returns JWT token",
        responses = {
            @ApiResponse(
                responseCode = "200",
                description = "Successfully authenticated",
                content = @Content(schema = @Schema(implementation = JwtResponse.class))
            ),
            @ApiResponse(
                responseCode = "401", 
                description = "Invalid username or password"
            )
        }
    )
    public ResponseEntity<JwtResponse> login(
            @Valid @RequestBody LoginRequest loginRequest,
            HttpServletRequest request) {
        try {
            JwtResponse jwtResponse = authService.authenticateUser(loginRequest);
            // Publish successful login event
            eventPublisher.publishEvent(new AuthenticationEvent(
                    this, 
                    loginRequest.getUsername(), 
                    AuthenticationEvent.AuthEventType.LOGIN_SUCCESS,
                    "Login successful",
                    getClientIp(request)
            ));
            return ResponseEntity.ok(jwtResponse);
        } catch (AccountDeactivatedException e) {
            // Publish failed login event with specific reason
            eventPublisher.publishEvent(new AuthenticationEvent(
                    this, 
                    loginRequest.getUsername(), 
                    AuthenticationEvent.AuthEventType.LOGIN_FAILED,
                    "Account deactivated",
                    getClientIp(request)
            ));
            throw e;
        } catch (BadCredentialsException e) {
            // Publish failed login event
            eventPublisher.publishEvent(new AuthenticationEvent(
                    this, 
                    loginRequest.getUsername(), 
                    AuthenticationEvent.AuthEventType.LOGIN_FAILED,
                    "Invalid credentials",
                    getClientIp(request)
            ));
            throw e;
        }
    }
    
    @PostMapping("/register")
    @Operation(
        summary = "Register new user",
        description = "Register a new user with provided details",
        responses = {
            @ApiResponse(
                responseCode = "201",
                description = "User registered successfully",
                content = @Content(schema = @Schema(implementation = MessageResponse.class))
            ),
            @ApiResponse(
                responseCode = "400", 
                description = "Invalid data or username/email already in use"
            )
        }
    )
    public ResponseEntity<MessageResponse> register(
            @Valid @RequestBody RegisterRequest registerRequest,
            HttpServletRequest request) {
        MessageResponse response = authService.registerUser(registerRequest);
        
        if (response.isSuccess()) {
            eventPublisher.publishEvent(new AuthenticationEvent(
                    this, 
                    registerRequest.getUsername(), 
                    AuthenticationEvent.AuthEventType.REGISTER_SUCCESS,
                    "Registration successful",
                    getClientIp(request)
            ));
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    @PostMapping("/refresh")
    @Operation(
        summary = "Refresh access token",
        description = "Get a new access token using the refresh token",
        responses = {
            @ApiResponse(
                responseCode = "200",
                description = "Successfully refreshed token",
                content = @Content(schema = @Schema(implementation = JwtResponse.class))
            ),
            @ApiResponse(
                responseCode = "403", 
                description = "Invalid refresh token"
            )
        }
    )
    public ResponseEntity<JwtResponse> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request,
            HttpServletRequest httpRequest) {
        try {
            JwtResponse response = authService.refreshToken(request);
            
            eventPublisher.publishEvent(new AuthenticationEvent(
                    this, 
                    response.getUsername(), 
                    AuthenticationEvent.AuthEventType.REFRESH_TOKEN,
                    "Token refreshed",
                    getClientIp(httpRequest)
            ));
            
            return ResponseEntity.ok(response);
        } catch (TokenRefreshException e) {
            eventPublisher.publishEvent(new AuthenticationEvent(
                    this, 
                    "unknown", 
                    AuthenticationEvent.AuthEventType.INVALID_TOKEN,
                    e.getMessage(),
                    getClientIp(httpRequest)
            ));
            throw e;
        }
    }
    
    @PostMapping("/logout")
    @Operation(
        summary = "Log out user",
        description = "Invalidate refresh token for user",
        responses = {
            @ApiResponse(
                responseCode = "200",
                description = "Successfully logged out",
                content = @Content(schema = @Schema(implementation = MessageResponse.class))
            )
        }
    )
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<MessageResponse> logout(
            @RequestBody(required = false) LogoutRequest logoutRequest,
            HttpServletRequest request) {
        MessageResponse response = authService.logoutUser(logoutRequest);
        
        if (logoutRequest != null && logoutRequest.getUsername() != null) {
            eventPublisher.publishEvent(new AuthenticationEvent(
                    this, 
                    logoutRequest.getUsername(), 
                    AuthenticationEvent.AuthEventType.LOGOUT,
                    "User logged out",
                    getClientIp(request)
            ));
        }
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/revoke")
    @Operation(
        summary = "Revoke refresh token",
        description = "Explicitly invalidate a refresh token before its expiration",
        responses = {
            @ApiResponse(
                responseCode = "200",
                description = "Token successfully revoked",
                content = @Content(schema = @Schema(implementation = MessageResponse.class))
            ),
            @ApiResponse(
                responseCode = "400", 
                description = "Invalid token or token not found"
            )
        }
    )
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<MessageResponse> revokeToken(
            @Valid @RequestBody RevokeTokenRequest request,
            HttpServletRequest httpRequest) {
        log.info("Token revocation request received");
        
        MessageResponse response = authService.revokeToken(request.getToken(), request.getReason());
        
        if (response.isSuccess()) {
            eventPublisher.publishEvent(new AuthenticationEvent(
                    this,
                    "token-user", // We don't expose the username for security reasons
                    AuthenticationEvent.AuthEventType.INVALID_TOKEN,
                    "Token revoked: " + (request.getReason() != null ? request.getReason() : "No reason provided"),
                    getClientIp(httpRequest)
            ));
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    // Helper method to get client IP address
    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }
}
