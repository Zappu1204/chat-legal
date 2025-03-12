package com.congdinh.vivuchat.dtos.ollama;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OllamaCompletionRequest {
    private String model;
    private List<OllamaMessage> messages;
    
    @JsonProperty("stream")
    private Boolean stream;
    
    private Map<String, Object> options;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OllamaMessage {
        private String role;
        private String content;
    }
}
