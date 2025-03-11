package com.congdinh.vivuchat.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequest {
    @Builder.Default
    private String title = "New Chat";
    
    private String description;
    
    @NotBlank(message = "Model name is required")
    private String model; // Direct model name from Ollama
}
