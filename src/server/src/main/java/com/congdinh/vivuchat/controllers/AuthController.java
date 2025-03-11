package com.congdinh.vivuchat.controllers;

import com.congdinh.vivuchat.dtos.requests.LoginRequest;
import com.congdinh.vivuchat.dtos.responses.JwtResponse;
import com.congdinh.vivuchat.services.interfaces.IAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Authentication API endpoints")
public class AuthController {

    private final IAuthService authService;

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
    public ResponseEntity<JwtResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        log.info("Authentication request for user: {}", loginRequest.getUsername());
        JwtResponse jwtResponse = authService.authenticateUser(loginRequest);
        return ResponseEntity.ok(jwtResponse);
    }
}
