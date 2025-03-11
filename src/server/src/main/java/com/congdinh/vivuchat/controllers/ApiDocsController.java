package com.congdinh.vivuchat.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.HashMap;
import java.util.Map;

@Controller
public class ApiDocsController {

    @GetMapping("/api-docs")
    @ResponseBody
    public Map<String, Object> getApiInfo() {
        // Simple API documentation as JSON
        Map<String, Object> apiInfo = new HashMap<>();
        
        apiInfo.put("title", "ViVu Chat API");
        apiInfo.put("version", "1.0.0");
        apiInfo.put("description", "REST API for ViVu Chat Application");
        
        // Auth endpoints
        Map<String, Object> authEndpoints = new HashMap<>();
        authEndpoints.put("POST /api/auth/login", "Login with username and password");
        authEndpoints.put("POST /api/auth/register", "Register a new user");
        authEndpoints.put("POST /api/auth/refresh", "Refresh access token");
        authEndpoints.put("POST /api/auth/logout", "Log out a user");
        authEndpoints.put("POST /api/auth/revoke", "Revoke a specific refresh token");
        
        // Admin endpoints
        Map<String, Object> adminEndpoints = new HashMap<>();
        adminEndpoints.put("GET /api/admin/tokens", "List all tokens (admin only)");
        adminEndpoints.put("POST /api/admin/tokens/revoke", "Revoke any token (admin only)");
        adminEndpoints.put("POST /api/admin/tokens/purge", "Remove expired tokens (admin only)");
        adminEndpoints.put("POST /api/admin/users/{username}/revoke-tokens", "Revoke all tokens for a user (admin only)");
        
        apiInfo.put("authEndpoints", authEndpoints);
        apiInfo.put("adminEndpoints", adminEndpoints);
        apiInfo.put("contact", Map.of("name", "Cong Dinh", "email", "congdinh@example.com"));
        
        return apiInfo;
    }
}
