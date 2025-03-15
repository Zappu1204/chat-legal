package com.congdinh.vivuchat.controllers;

import com.congdinh.vivuchat.entities.RefreshToken;
import com.congdinh.vivuchat.dtos.requests.RevokeTokenRequest;
import com.congdinh.vivuchat.dtos.responses.MessageResponse;
import com.congdinh.vivuchat.events.AuthenticationEvent;
import com.congdinh.vivuchat.repositories.IRefreshTokenRepository;
import com.congdinh.vivuchat.repositories.IUserRepository;
import com.congdinh.vivuchat.services.interfaces.IAuthService;
import com.congdinh.vivuchat.services.interfaces.IRefreshTokenService;
import com.congdinh.vivuchat.dtos.admin.UserAdminResponse;
import com.congdinh.vivuchat.dtos.admin.UserStatusUpdateRequest;
import com.congdinh.vivuchat.services.interfaces.IAdminUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin", description = "Admin management endpoints")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    private final IAuthService authService;
    private final IRefreshTokenService refreshTokenService;
    private final IUserRepository userRepository;
    private final IRefreshTokenRepository refreshTokenRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final IAdminUserService adminUserService;

    @PostMapping("/tokens/revoke")
    @Operation(
        summary = "Revoke refresh token (Admin)",
        description = "Admin endpoint to invalidate any refresh token",
        responses = {
            @ApiResponse(
                responseCode = "200",
                description = "Token successfully revoked",
                content = @Content(schema = @Schema(implementation = MessageResponse.class))
            ),
            @ApiResponse(
                responseCode = "400", 
                description = "Invalid token or token not found"
            ),
            @ApiResponse(
                responseCode = "403", 
                description = "Access denied"
            )
        }
    )
    public ResponseEntity<MessageResponse> revokeToken(
            @Valid @RequestBody RevokeTokenRequest request,
            HttpServletRequest httpRequest) {
        
        String adminReason = "Admin revocation: " + (request.getReason() != null ? request.getReason() : "No reason provided");
        MessageResponse response = authService.revokeToken(request.getToken(), adminReason);
        
        if (response.isSuccess()) {
            eventPublisher.publishEvent(new AuthenticationEvent(
                    this,
                    "admin-action",
                    AuthenticationEvent.AuthEventType.INVALID_TOKEN,
                    "Admin revoked token: " + adminReason,
                    getClientIp(httpRequest)
            ));
        }
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/tokens")
    @Operation(
        summary = "List all tokens",
        description = "List all refresh tokens in the system (admin only)",
        responses = {
            @ApiResponse(
                responseCode = "200",
                description = "List of tokens"
            ),
            @ApiResponse(
                responseCode = "403", 
                description = "Access denied"
            )
        }
    )
    public ResponseEntity<Map<String, Object>> listAllTokens() {
        List<RefreshToken> tokens = refreshTokenRepository.findAll();
        
        List<Map<String, Object>> tokenList = tokens.stream()
                .map(token -> {
                    Map<String, Object> tokenInfo = new HashMap<>();
                    tokenInfo.put("id", token.getId().toString());
                    tokenInfo.put("username", token.getUser().getUsername());
                    tokenInfo.put("active", token.isActive());
                    tokenInfo.put("used", token.isUsed());
                    tokenInfo.put("revoked", token.isRevoked());
                    tokenInfo.put("expiryDate", token.getExpiryDate());
                    tokenInfo.put("createdAt", token.getCreatedAt());
                    tokenInfo.put("reasonRevoked", token.getReasonRevoked());
                    return tokenInfo;
                })
                .toList();
        
        Map<String, Object> response = new HashMap<>();
        response.put("count", tokens.size());
        response.put("tokens", tokenList);
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/tokens/purge")
    @Operation(
        summary = "Purge expired tokens",
        description = "Remove all expired tokens from the database",
        responses = {
            @ApiResponse(
                responseCode = "200",
                description = "Tokens purged"
            ),
            @ApiResponse(
                responseCode = "403", 
                description = "Access denied"
            )
        }
    )
    public ResponseEntity<MessageResponse> purgeExpiredTokens() {
        refreshTokenService.purgeExpiredTokens();
        
        return ResponseEntity.ok(MessageResponse.builder()
                .message("Expired tokens purged")
                .success(true)
                .build());
    }
    
    @PostMapping("/users/{username}/revoke-tokens")
    @Operation(
        summary = "Revoke all tokens for user",
        description = "Revoke all refresh tokens for a specific user",
        responses = {
            @ApiResponse(
                responseCode = "200",
                description = "Tokens revoked"
            ),
            @ApiResponse(
                responseCode = "404", 
                description = "User not found"
            ),
            @ApiResponse(
                responseCode = "403", 
                description = "Access denied"
            )
        }
    )
    public ResponseEntity<MessageResponse> revokeAllUserTokens(
            @PathVariable String username,
            @RequestParam(required = false) String reason,
            HttpServletRequest httpRequest) {
        
        return userRepository.findByUsername(username)
                .map(user -> {
                    String finalReason = "Admin action: " + (reason != null ? reason : "Security policy");
                    refreshTokenService.deleteByUser(user);
                    
                    eventPublisher.publishEvent(new AuthenticationEvent(
                            this,
                            username,
                            AuthenticationEvent.AuthEventType.INVALID_TOKEN,
                            "Admin revoked all tokens: " + finalReason,
                            getClientIp(httpRequest)
                    ));
                    
                    return ResponseEntity.ok(MessageResponse.builder()
                            .message("All tokens revoked for user: " + username)
                            .success(true)
                            .build());
                })
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/users")
    @Operation(summary = "List all users with pagination and filtering")
    public ResponseEntity<Page<UserAdminResponse>> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean isActive,
            @Parameter(hidden = true) @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        
        try {
            Page<UserAdminResponse> users = adminUserService.findAllUsers(search, isActive, pageable);
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            log.error("Error retrieving users list", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/users/{userId}")
    @Operation(summary = "Get user details by ID")
    public ResponseEntity<UserAdminResponse> getUserDetails(@PathVariable UUID userId) {
        try {
            UserAdminResponse user = adminUserService.getUserDetails(userId);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            log.error("Error retrieving user details for ID: {}", userId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PatchMapping("/users/{userId}/status")
    @Operation(summary = "Update user active status")
    public ResponseEntity<MessageResponse> updateUserStatus(
            @PathVariable UUID userId,
            @Valid @RequestBody UserStatusUpdateRequest request) {
        
        try {
            MessageResponse response = adminUserService.updateUserStatus(userId, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error updating status for user ID: {}", userId, e);
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new MessageResponse(e.getMessage(), false));
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
