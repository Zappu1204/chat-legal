package com.congdinh.vivuchat.dtos.ollama;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OllamaCompletionResponse {
    private String model;
    private String created_at;
    private OllamaMessage message;
    private boolean done;
    private Map<String, Object> total_duration;
    private Map<String, Object> load_duration;
    private Map<String, Object> prompt_eval_duration;
    private Map<String, Object> eval_duration;
    private Integer prompt_eval_count;
    private Integer eval_count;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OllamaMessage {
        private String role;
        private String content;
    }
}
