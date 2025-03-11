package com.congdinh.vivuchat.controllers;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.HashMap;
import java.util.Map;

@RestController
@Tag(name = "API Documentation", description = "API documentation for ViVu Chat application")
public class ApiDocsController {

    @GetMapping("/api-docs")
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
        
        // Chat endpoints
        Map<String, Object> chatEndpoints = new HashMap<>();
        chatEndpoints.put("GET /api/chats", "List all chats for authenticated user");
        chatEndpoints.put("POST /api/chats", "Create a new chat");
        chatEndpoints.put("GET /api/chats/{id}", "Get a specific chat");
        chatEndpoints.put("DELETE /api/chats/{id}", "Delete a chat");
        chatEndpoints.put("POST /api/chats/{id}/messages", "Send a message to a chat");
        chatEndpoints.put("GET /api/chats/{id}/messages", "Get all messages in a chat");
        
        // Ollama model management endpoints
        Map<String, Object> ollamaModelEndpoints = new HashMap<>();
        ollamaModelEndpoints.put("GET /api/ollama/models", "List all locally available models");
        ollamaModelEndpoints.put("GET /api/ollama/models/running", "List all currently running models");
        ollamaModelEndpoints.put("GET /api/ollama/models/{model}", "Get details of a specific model");
        ollamaModelEndpoints.put("POST /api/ollama/models/copy", "Copy an existing model with a new name");
        ollamaModelEndpoints.put("DELETE /api/ollama/models/{model}", "Delete a model");
        ollamaModelEndpoints.put("POST /api/ollama/models/pull", "Pull a model from Ollama library");
        ollamaModelEndpoints.put("POST /api/ollama/models/push", "Push a model to Ollama library");
        
        apiInfo.put("authEndpoints", authEndpoints);
        apiInfo.put("adminEndpoints", adminEndpoints);
        apiInfo.put("chatEndpoints", chatEndpoints);
        apiInfo.put("ollamaModelEndpoints", ollamaModelEndpoints);
        apiInfo.put("contact", Map.of("name", "Cong Dinh", "email", "congdinh@example.com"));
        
        return apiInfo;
    }
}
