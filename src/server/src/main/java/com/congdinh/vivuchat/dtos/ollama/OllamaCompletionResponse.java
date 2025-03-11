package com.congdinh.vivuchat.dtos.ollama;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class OllamaCompletionResponse {
    private String model;
    private String created_at;
    private OllamaMessage message;
    private boolean done;
    private String done_reason;
    private List<Integer> context;
    private long total_duration; // Changed from Map to long
    private long load_duration;  // Changed from Map to long
    private int prompt_eval_count;
    private long prompt_eval_duration;
    private int eval_count;
    private long eval_duration;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OllamaMessage {
        private String role;
        private String content;
    }
}
