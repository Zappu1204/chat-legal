package com.congdinh.vivuchat.dtos.ollama;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OllamaCompletionRequest {
    private String model;
    private List<OllamaMessage> messages;
    private Map<String, Object> options;
    private boolean stream;
    
    @Data
    @Builder
    public static class OllamaMessage {
        private String role;
        private String content;
    }
}
